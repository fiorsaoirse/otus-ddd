## Обоснование микросервиса Orders

Контекст Orders стоит выделить в отдельный микросервис, поскольку он инкапсулирует собственные бизнес-правила и жизненный цикл заказа: создание, изменение статусов, оплату, доставку, отмену и возврат. Это отдельный Bounded Context со своей моделью, инвариантами и API. Он не должен зависеть от внутренней реализации других частей системы: взаимодействие с ними происходит через явные контракты, а не через прямой доступ к коду или базе данных.

Orders относится к ключевым контекстам домена. От его доступности и производительности напрямую зависит возможность пользователей оформлять покупки, поэтому для него могут понадобиться повышенные требования к масштабированию и отказоустойчивости. Отдельный сервис можно масштабировать независимо от менее нагруженных частей системы и изолировать его сбой: отказ Orders не должен автоматически останавливать остальные сервисы (хотя клиентские сценарии в этом случае должны корректно обрабатывать полученную ошибку). API становится единой точкой входа в контекст и скрывает его внутреннее устройство от любых потребителей.

Выделение сервиса также позволяет назначить отдельную команду, которая отвечает за модель заказов, эксплуатацию и развитие сервиса. Она может выпускать изменения независимо от релизных циклов других команд: не требуется останавливать или перезапускать всё приложение ради обновления Orders. Такая автономность оправдана для центрального и активно развивающегося контекста, однако требует явных интеграционных контрактов, мониторинга и ответственности команды за работу сервиса в production.

## Проектирование CI/CD Pipeline

Ниже приведен пример pipeline на GitHub Actions. После получения изменений он
собирает Docker-образ, запускает unit-тесты, затем поднимает образ вместе с
зависимостями в изолированной тестовой среде для интеграционных тестов. После
этого запускается анализ качества кода. Только после успешного выполнения всех
проверок образ публикуется в registry и развертывается по стратегии Blue-Green.

```yaml
name: Orders CI/CD

on:
  push:
    branches: [main]

env:
  IMAGE_NAME: ghcr.io/acme/orders
  IMAGE_TAG: ${{ github.sha }}

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      # 1. Получение изменений из репозитория.
      - name: Checkout source code
        uses: actions/checkout@v4

      # 2. Сборка Docker-образа.
      - name: Build Orders image
        run: docker build -t $IMAGE_NAME:$IMAGE_TAG .

      # 3. Unit-тесты. TEST_MODE или иные переменные могут отключать
      # внешние зависимости и подставлять test doubles.
      - name: Run unit tests
        run: docker run --rm -e TEST_MODE=unit $IMAGE_NAME:$IMAGE_TAG npm run test:unit

      # 4. Интеграционные тесты в отдельной легковесной среде.
      # docker-compose.test.yml запускает образ Orders и нужные зависимости,
      # например PostgreSQL и RabbitMQ.
      - name: Run integration tests
        run: |
          IMAGE_NAME=$IMAGE_NAME IMAGE_TAG=$IMAGE_TAG docker compose \
            -f docker-compose.test.yml up --abort-on-container-exit \
            --exit-code-from integration-tests

      - name: Stop integration environment
        if: always()
        run: docker compose -f docker-compose.test.yml down --volumes

      # 5. Статический анализ: дублирование, уязвимости, code smells,
      # покрытие и соблюдение quality gate. Скрипт запускает SonarQube Scanner.
      - name: Run code quality analysis
        env:
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        run: npm run analyze

      # Образ публикуется только после успешных тестов (этап с качеством кода не должен являться блокирующим).
      - name: Login to container registry
        run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io \
          --username "${{ github.actor }}" --password-stdin

      - name: Push image
        run: docker push $IMAGE_NAME:$IMAGE_TAG

  deploy-blue-green:
    needs: build-and-test
    runs-on: ubuntu-latest
    environment: production

    steps:
      # 6. Подготовка новой (green) версии рядом с работающей blue.
      - name: Deploy green version
        run: |
          kubectl set image deployment/orders-green \
            orders=$IMAGE_NAME:$IMAGE_TAG
          kubectl rollout status deployment/orders-green --timeout=120s

      # После readiness-проверок трафик переключается на green.
      - name: Switch traffic to green
        run: kubectl patch service orders -p \
          '{"spec":{"selector":{"app":"orders","version":"green"}}}'

      # Blue остается доступной на время наблюдения и может быть быстро
      # возвращена в Service при проблеме. Позже ее можно отключить.
      - name: Scale down old blue version
        run: kubectl scale deployment/orders-blue --replicas=0
```

В production секреты registry и доступ к кластеру должны храниться в secrets
CI-системы. Перед переключением трафика также обычно выполняют smoke-тест
green-версии.

## Безопасная миграция БД: переименование `status` в `order_state`

Простое переименование или удаление колонки `status` сломает экземпляры
приложения предыдущей версии. Поэтому миграция выполняется по паттерну
Expand-Contract: сначала схема расширяется и некоторое время поддерживает оба
формата, а удаление устаревшей части происходит только в конце.

### Релиз 1: Expand

В таблицу `orders` добавляется nullable-колонка `order_state`. Приложение
переходит на dual write: при каждом создании или изменении заказа оно записывает
одно и то же значение и в `status`, и в `order_state`. При чтении используется
только старая колонка `status`.

```sql
ALTER TABLE orders ADD COLUMN order_state VARCHAR(32);
```

Новая версия совместима как со старой схемой, так и с существующими данными:
старые экземпляры приложения продолжают работать с `status`, а новые не
полагаются на заполненность `order_state` для чтения.

### Релиз 2: Backfill

Исторические записи переносятся из `status` в `order_state` небольшими
идемпотентными батчами. Эту задачу может запускать CronJob. Она не должна
перезаписывать уже заполненный `order_state`, чтобы ее можно было безопасно
повторять после сбоя.

```sql
UPDATE orders
SET order_state = status
WHERE order_state IS NULL
  AND id IN (
    SELECT id
    FROM orders
    WHERE order_state IS NULL
    ORDER BY id
    LIMIT :batchSize
  );
```

После завершения backfill нужно проверить, что не осталось строк с
`order_state IS NULL`, и что значения двух колонок не расходятся.

### Релиз 3: переключение чтения

После успешного переноса всех данных приложение начинает читать `order_state`.
На этом этапе dual write сохраняется. Экземпляры предыдущего релиза всё ещё
читают `status`, хотя уже записывают значения в обе колонки. Поэтому удалять
`status` нельзя, пока rollout не завершен и старая версия не выведена из
эксплуатации.

### Релиз 4: Contract

После полного вывода старой версии из эксплуатации и периода наблюдения можно
отключить запись в `status`, удалить старую колонку и при необходимости добавить
ограничения для новой, например `NOT NULL`.

```sql
ALTER TABLE orders DROP COLUMN status;
ALTER TABLE orders ALTER COLUMN order_state SET NOT NULL;
```

Такое разделение защищает от ситуации, когда часть экземпляров приложения ещё
ожидает `status`, а схема базы уже его не содержит. Откат безопасен до этапа
Contract: достаточно вернуть приложение к чтению `status`, так как во время
перехода обе колонки поддерживаются в актуальном состоянии.
