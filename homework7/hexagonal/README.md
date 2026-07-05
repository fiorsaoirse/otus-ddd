# Hexagonal Architecture: Orders service

```text
hexagonal/
├── domain/
│   ├── events/
│   │   ├── domain-event.ts
│   │   ├── event-id.ts
│   │   └── types.ts
│   ├── customer/
│   │   └── customer-id.ts
│   ├── product/
│   │   ├── product.ts
│   │   └── product-id.ts
│   ├── value-objects/
│   │   └── money.ts
│   └── order/
│       ├── order.ts
│       ├── order-id.ts
│       └── events/
│           └── order-confirmed.ts
├── application/
│   ├── ports/
│   │   ├── events/
│   │   │   └── domain-event-publisher.ts
│   │   ├── logger/
│   │   │   └── logger.ts
│   │   ├── order/
│   │   │   └── order-repository.ts
│   │   └── product/
│   │       └── product-repository.ts
│   └── use-cases/
│       └── place-order.ts
├── infrastructure/
│   ├── persistence/
│   │   └── postgres/
│   │       └── product-repository.ts
│   └── logger/
│       └── console-logger.ts
└── presentation/
```

`domain/order` содержит агрегат `Order` и его собственные события.

`domain/product` содержит модель продукта и связанные с ней value objects.

`domain/customer` содержит customer-related value objects.

`domain/value-objects` содержит общие value objects, которые не принадлежат одному конкретному агрегату.

`domain/events` содержит общие доменные primitives для событий. Они вынесены из `domain/order`, потому что `DomainEvent`, `EventID` и `IDispatchable` могут использоваться не только заказами, но и другими агрегатами.

## Domain

`domain/order` содержит модель агрегата `Order`:

- `Order` — aggregate root;
- `OrderLine` — внутренняя сущность внутри агрегата;
- `OrderID` — value object идентификатора заказа;
- `OrderConfirmedEvent` — событие, специфичное для агрегата `Order`.

`CustomerID` вынесен в `domain/customer`, потому что идентификатор клиента не принадлежит модели заказа.

`Product` и `ProductID` вынесены в `domain/product`, потому что продукт является отдельным доменным понятием, а не частью модели заказа.

`Money` вынесен в `domain/value-objects`, потому что деньги могут использоваться не только в заказах, но и в продуктах, платежах, скидках и других частях системы.

Общие доменные primitives для событий вынесены отдельно в `domain/events`:

- `DomainEvent`;
- `EventID`;
- `DomainEventPayload`;
- `IDispatchable`.

Они не принадлежат конкретно `Order`, потому что могут использоваться и другими агрегатами.

## Application

`application` содержит use cases и ports.

Пример:

```text
application/
├── ports/
│   ├── events/
│   │   └── domain-event-publisher.ts
│   ├── logger/
│   │   └── logger.ts
│   ├── order/
│   │   └── order-repository.ts
│   └── product/
│       └── product-repository.ts
└── use-cases/
    └── place-order.ts
```

`PlaceOrderUseCase` реализует входящий порт `IPlaceOrderUseCase`. Внутри он зависит только от доменной модели `Order` и исходящих портов:

- `IOrderRepository` — сохранить агрегат;
- `IDomainEventPublisher` — передать наружу доменные события, которые накопил агрегат.
- `ILogger` — записать техническую информацию об ошибках выполнения сценария.

Application layer отвечает за сценарий:

1. получить доменный объект `Order`;
2. сохранить агрегат через `IOrderRepository`;
3. забрать накопленные доменные события через `order.pullEvents()`;
4. передать события наружу через `IDomainEventPublisher`;
5. залогировать ошибку через `ILogger`, если сохранение или публикация упали.

## Infrastructure

`infrastructure` содержит adapters для внешних технологий:

- PostgreSQL repositories;
- SQL/ORM mapping;
- logger implementations.

Infrastructure реализует output ports из application layer.

`infrastructure/persistence/postgres` содержит реализацию persistence-адаптеров, которые завязаны на PostgreSQL и конкретный способ доступа к данным.

Например, `product-repository.ts` реализует application port `IProductRepository`, но внутри работает с ORM-клиентом. ORM здесь оставлен псевдокодом: в реальном сервисе это мог бы быть Prisma, TypeORM, Drizzle или другой инструмент. Важно, что ORM-модель не протекает в `domain` и `application`: адаптер сам маппит `ProductOrmRecord` в доменный `Product` и обратно.

## Presentation

`presentation` предназначен для входных adapters, например HTTP controllers.

Controller не содержит бизнес-логику. Он принимает request, собирает команду, вызывает application use case и возвращает response.

Сейчас в папке нет конкретных controllers, потому что в этой части задания показана структура слоев и реализации application/infrastructure ports.

## Направление зависимостей

```text
Presentation -> Application -> Domain
Infrastructure -> Application -> Domain
```

`Domain` находится в центре и не зависит от HTTP, базы данных, брокера сообщений или framework-ов.
