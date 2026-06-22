## Доменное событие

В доменной модели есть событие `OrderConfirmedEvent`, возникающее, когда заказ подтвержден.

Доменное событие хранит доменные объекты:

- `orderId: OrderID`;
- `customerId: CustomerID`;
- `orderPrice: Money`.

Такое событие удобно внутри приложения, но его не стоит публиковать во внешний брокер напрямую. Внешним потребителям не нужны доменные классы `OrderID`, `CustomerID`, `Money` и детали внутренней доменной модели - это может привести к путанице или к сильной связности.

Поэтому для брокера сообщений проектируется отдельное интеграционное событие.

## Интеграционное событие

Пример JSON находится в [`integration-events/order-confirmed.v1.json`](integration-events/order-confirmed.v1.json).

```json
{
  "eventId": "evt_01J2Z7K7Y9T4QKQ5NR6RK2QG8A",
  "eventType": "orders.order_confirmed",
  "schemaVersion": 1,
  "occurredAt": "2026-06-20T12:42:00.000Z",
  "producer": "orders-service",
  "data": {
    "orderId": "order-1",
    "customerId": "customer-1"
  }
}
```

## Почему это не просто OrderConfirmedEvent

Доменное событие описывает факт внутри модели.

Интеграционное событие является публичным контрактом между сервисами. Его нужно проектировать осторожнее:

- использовать простые JSON-типы;
- не раскрывать внутреннюю структуру агрегата;
- не отправлять лишние данные;
- версионировать схему;
- иметь стабильный `eventType`;
- иметь уникальный `eventId` для идемпотентности у потребителей.

## Поля

### eventId

Уникальный идентификатор события.

Нужен внешним потребителям для идемпотентной обработки. Например, consumer может сохранить `eventId` в таблицу обработанных событий и не отправить уведомление дважды при повторной доставке.

### eventType

Стабильное имя интеграционного события:

```text
orders.order_confirmed
```

Я не использую имя класса `OrderConfirmedEvent`, потому что имя класса - внутренняя деталь TypeScript-кода.

### schemaVersion

Версия схемы события.

Если формат события изменится, можно будет выпустить `schemaVersion: 2` и поддерживать обратную совместимость.

### occurredAt

Время, когда событие произошло.

Это полезно для аудита, сортировки, диагностики задержек и восстановления порядка событий.

### producer

Имя сервиса-источника.

Полезно для отладки и трассировки, особенно если в брокере много разных producers.

## Поля data

### orderId

Включено обязательно.

Это ключевое поле события. Внешние сервисы смогут использовать `orderId`, чтобы запросить актуальную информацию по конкретному заказу, например статус или список товаров.

Я не включаю в событие все данные заказа, потому что это увеличивает размер публичного контракта и сильнее связывает внешних потребителей с внутренней моделью `Orders` - более того, часто потребителю и не нужны все детали заказа, нужны только минимальные данные.

### customerId

Включено обязательно.

Оно нужно внешним сервисам, которые взаимодействуют с пользователем. Например, отдельный почтовый сервис может использовать `customerId`, чтобы получить email, язык пользователя или настройки уведомлений.

Я не включаю email напрямую, потому что:

- email может измениться;
- это персональные данные;
- не каждому consumer-у он нужен;
- лучше, чтобы профильные данные пользователя оставались в контексте Customers/User Profile.

## Что не включено

### orderPrice

Может быть включено как полезный снапшот, но это поле можно считать кандидатом на удаление из минимальной версии события. По этой причине я не стала включать это поле в интеграционное событие.

Несмотря на то, что `orderPrice` может быть удобно иметь в событии, часто этих данных будет недостаточно: например, почтовому сервису часто все равно нужны `items`, чтобы показать список товаров пользователю. Тогда он все равно пойдет за деталями заказа, и `orderPrice` в событии становится необязательным. 

Пример, как поле может быть включено:
```json
  "orderPrice": {
      "amountCents": 10000,
      "currency": "USD"
    }
```

Так безопаснее, чем строка вроде `"100 USD"`: считаю, что сумма всегда должна храниться в минимальных денежных единицах во избежание таких проблем, как округление. Валюта также должна храниться отдельно.

### items

Список товаров не включен.

Это детальная информация заказа. Если consumer-у нужен список товаров, он может запросить заказ по `orderId`.

Так событие остается компактным и не превращается в копию агрегата `Order`.

### status

Статус не включен.

Сам `eventType = orders.order_confirmed` уже означает, что заказ подтвержден. Если consumer-у нужен текущий статус, он может запросить его по `orderId`.

### internal domain event id

Внешнее событие получает свой `eventId`.

Не обязательно раскрывать внутренний `DomainEvent.id`, потому что интеграционное событие — отдельный публичный контракт.

### domain metadata

Внутренняя metadata доменного события не включена.

В брокер отправляются только те поля, которые нужны внешним потребителям.

## Transactional Outbox

Для безопасной публикации интеграционного события используется паттерн Transactional Outbox.

Основной принцип: изменение агрегата `Order` и запись события для брокера выполняются в одной транзакции БД.

Если транзакция закоммитилась, то в базе одновременно есть:

- новое состояние заказа;
- запись в `outbox_messages`, которую позже заберет relay/publisher.

Если транзакция откатилась, то нет ни изменения заказа, ни события. Это защищает от ситуации, когда заказ изменился, а событие потерялось.

### Таблица Outbox

DDL таблицы находится в [`db/schema.sql`](db/schema.sql).

Ключевая таблица:

```sql
CREATE TABLE outbox_messages (
    id TEXT PRIMARY KEY,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    payload JSONB NOT NULL,
    status outbox_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ
);
```

`payload` хранит уже готовое интеграционное событие в JSON-формате.

### Сохранение Order и запись события

SQL-псевдокод находится в [`db/save-order-confirmed-with-outbox.sql`](db/save-order-confirmed-with-outbox.sql).

Суть:

```sql
BEGIN;

WITH updated_order AS (
    UPDATE orders
    SET
        status = 'confirmed',
        customer_id = $3,
        max_count = $4,
        version = version + 1,
        updated_at = now()
    WHERE id = $1
      AND version = $2
    RETURNING id, customer_id
)
INSERT INTO outbox_messages (
    id,
    aggregate_type,
    aggregate_id,
    event_type,
    schema_version,
    payload
)
SELECT
    $9,
    'Order',
    updated_order.id,
    'orders.order_confirmed',
    1,
    jsonb_build_object(
        'eventId', $9,
        'eventType', 'orders.order_confirmed',
        'schemaVersion', 1,
        'occurredAt', $10,
        'producer', 'orders-service',
        'data', jsonb_build_object(
            'orderId', updated_order.id,
            'customerId', updated_order.customer_id
        )
    )
FROM updated_order;

COMMIT;
```

`UPDATE orders` использует optimistic locking:

```sql
WHERE id = $1
  AND version = $2
```

Если `UPDATE` не нашел строку с такой версией, `updated_order` будет пустым и `INSERT INTO outbox_messages ... SELECT ... FROM updated_order` тоже вставит `0` строк.

Приложение должно проверить количество вставленных outbox-строк. Если вставлено `0`, нужно сделать `ROLLBACK` и выбросить optimistic lock conflict. В этом случае запись в outbox не создается.

### Message Relay / Publisher

SQL-псевдокод relay находится в [`db/outbox-relay-publisher.pseudo.sql`](db/outbox-relay-publisher.pseudo.sql).

Relay — отдельный фоновый процесс. Например, cron-задача раз в минуту.

Алгоритм:

1. Relay читает пачку сообщений со статусом `pending`.
2. Строки берутся через `FOR UPDATE SKIP LOCKED`, чтобы несколько relay worker-ов не взяли одно и то же сообщение.
3. Relay публикует `payload` в Kafka/RabbitMQ.
4. Если публикация успешна, запись помечается как `published`.
5. Если публикация упала, запись остается `pending`, увеличивается `attempts`, сохраняется `last_error`.
6. На следующем запуске relay попробует отправить событие еще раз.

Пример выборки пачки:

```sql
WITH batch AS (
    SELECT id
    FROM outbox_messages
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
)
UPDATE outbox_messages AS outbox
SET
    locked_at = now(),
    attempts = attempts + 1
FROM batch
WHERE outbox.id = batch.id
RETURNING
    outbox.id,
    outbox.event_type,
    outbox.payload;
```

После успешной отправки:

```sql
UPDATE outbox_messages
SET
    status = 'published',
    published_at = now(),
    last_error = NULL
WHERE id = $1;
```

### Почему доставка at-least-once

Возможна следущая ситуация:

1. Relay отправил сообщение в Kafka/RabbitMQ.
2. После отправки процесс упал.
3. Запись в `outbox_messages` не успела стать `published`.

После рестарта relay снова увидит эту запись как `pending` и отправит сообщение повторно.

Поэтому такая схема дает at-least-once delivery: событие не теряется, но может быть доставлено больше одного раза.

Из-за этого consumers должны быть идемпотентными и использовать `eventId` из интеграционного события.

## Anti-Corruption Layer для Legacy Warehouse

Legacy-система `Склад` возвращает плоский DTO с неудобными для нас названиями и техническими кодами вместо ENUM, а также с лишней для нас информацией:

```ts
export interface WarenhouseProduct {
  id: string;
  name: string;
  comment: string;
  priceAmount: number;
  priceCurrency: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  weight: number;
}
```
Anti-Corruption Layer:

[`application/acl/warehouse-product-adapter.ts`](application/acl/warehouse-product-adapter.ts)

Адаптер принимает `WarenhouseProduct` и создает чистый доменный объект `Product`.

Маппинг:

- `id` -> `ProductID`;
- `name` -> `Product.name`;
- `comment` -> `Product.description`;
- `priceAmount` -> `Money.cents`;
- `priceCurrency` -> `Currencies`;
- `sizeX`, `sizeY`, `sizeZ`, `weight` не маппятся, потому что в текущей доменной модели `Product` эти значения не используются.

Коды валют legacy-системы:

- `643` -> `RUB`;
- `978` -> `EUR`;
- `840` -> `USD`.