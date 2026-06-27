# Product, Shop, Store Architecture

- Статус: draft
- Назначение: целевая модель разделения `sellgar.product.service`, `sellgar.shop.service` и
  `sellgar.store.service`.
- Область: каталог, магазины, коммерческие предложения, цены, остатки, синхронизация между БД.

## Решение

`product_srv`, `shop_srv` и `store_srv` имеют отдельные базы данных и отдельные подключения.
Между базами нет SQL foreign keys. Межсервисные ссылки хранятся как UUID внешнего агрегата и
проверяются через сервисный контракт, события, snapshots и reconciliation.

Сервисы-владельцы:

| Сервис | Владеет | Не владеет |
|---|---|---|
| `product_srv` | catalog product, variant, brand, category, property, unit, image projection | price, stock, reservation, shop, cart, order |
| `shop_srv` | shop/channel, shop settings, shop lifecycle | product catalog, offers, prices, stock, cart, order |
| `store_srv` | store product, offer, price history, inventory, reservation | catalog authoring, shop settings, cart, order |

## Основание

Используем распространенный микросервисный набор паттернов:

- Database per service: сервис владеет своими таблицами, другие сервисы не читают их напрямую.
- Service of record: у каждого агрегата один источник истины.
- CQRS/materialized view: сервис может держать локальную read-model внешних данных.
- Transactional outbox: событие пишется в той же транзакции, что и изменение агрегата.
- Idempotent consumer/inbox: повторная доставка сообщения не должна менять результат.
- Saga: checkout/order/payment/inventory не являются одной распределенной SQL-транзакцией.

Базовые ссылки:

- Microsoft, microservices data considerations:
  https://learn.microsoft.com/en-us/azure/architecture/microservices/design/data-considerations
- Microsoft, CQRS pattern:
  https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
- AWS, transactional outbox:
  https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
- AWS, saga:
  https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga.html
- RabbitMQ, acknowledgements and confirms:
  https://www.rabbitmq.com/docs/confirms
- Stripe, idempotent requests:
  https://docs.stripe.com/api/idempotent_requests

## Product Service

`product_srv` - источник истины для каталога. Товар и варианты здесь описывают структуру и
конфигурацию товара, но не факт продажи.

Целевые таблицы:

```text
product
  uuid pk
  version
  name
  description
  brand_uuid
  category_uuid
  status
  created_at
  updated_at

variant
  uuid pk
  version
  product_uuid fk -> product.uuid
  name
  description
  status
  created_at
  updated_at

variant_property
  uuid pk
  variant_uuid fk -> variant.uuid
  property_uuid fk -> property.uuid
  value
  order

variant_image
  uuid pk
  variant_uuid fk -> variant.uuid
  image_uuid fk -> image.uuid
  sort_order
  is_primary
  alt

brand
category
property_group
property
unit
image
currency
```

`currency` можно временно оставить в `product_srv`, потому что она уже используется текущим кодом.
Перед развитием pricing стоит решить, будет ли currency общей справочной областью или частью
`store_srv`.

События:

```text
product.created
product.updated
product.disabled
product.deleted
variant.created
variant.updated
variant.disabled
variant.deleted
brand.updated
category.updated
property.updated
image.updated
```

События должны включать:

```text
event_uuid
event_type
aggregate_type
aggregate_uuid
aggregate_version
occurred_at
payload
```

## Shop Service

`shop_srv` - источник истины для магазинов/витрин/каналов продаж.

Минимальная целевая таблица:

```text
shop
  uuid pk
  version
  name
  status
  created_at
  updated_at
```

Расширения позже:

```text
shop_settings
  shop_uuid fk -> shop.uuid
  default_currency_code
  timezone
  publication_policy

sales_channel
  uuid pk
  shop_uuid fk -> shop.uuid
  code
  name
  status
```

Пока не нужно смешивать `shop` и склад. Складская модель может появиться отдельно, если остатки
станут многоскладскими.

События:

```text
shop.created
shop.updated
shop.disabled
shop.deleted
```

## Store Service

`store_srv` - источник истины для продажи каталожных товаров в конкретном магазине.

Целевые таблицы владельца:

```text
store_product
  uuid pk
  version
  shop_uuid external id -> shop_srv.shop.uuid
  product_uuid external id -> product_srv.product.uuid
  article
  title_override nullable
  description_override nullable
  status
  showing
  created_at
  updated_at

store_variant_offer
  uuid pk
  version
  store_product_uuid fk -> store_product.uuid
  variant_uuid external id -> product_srv.variant.uuid
  sku
  article
  title_override nullable
  description_override nullable
  status
  showing
  created_at
  updated_at

price_history
  uuid pk
  offer_uuid fk -> store_variant_offer.uuid
  value
  currency_code
  starts_at
  ends_at nullable
  reason nullable
  created_at

inventory
  uuid pk
  offer_uuid fk -> store_variant_offer.uuid
  quantity
  reserved
  version
  updated_at

reservation
  uuid pk
  offer_uuid fk -> store_variant_offer.uuid
  quantity
  status
  source_type
  source_uuid
  expires_at
  created_at
  updated_at
```

Внешние ссылки в `store_srv`:

```text
store_product.shop_uuid
store_product.product_uuid
store_variant_offer.variant_uuid
```

Это не SQL FK. Для них нужны indexes, validation и snapshots.

Локальные read-model/snapshot таблицы:

```text
shop_snapshot
  shop_uuid pk
  source_version
  name
  status
  synced_at

product_snapshot
  product_uuid pk
  source_version
  name
  status
  brand_uuid
  category_uuid
  synced_at

variant_snapshot
  variant_uuid pk
  product_uuid
  source_version
  name
  status
  synced_at
```

Snapshot не является источником истины. Он нужен для быстрой проверки и чтения без постоянных
синхронных запросов в `product_srv` и `shop_srv`.

## Outbox/Inbox

Каждый сервис, который публикует доменные события, должен иметь outbox:

```text
outbox_event
  uuid pk
  aggregate_type
  aggregate_uuid
  aggregate_version
  event_type
  payload jsonb
  occurred_at
  published_at nullable
  status
  attempts
  last_error nullable
```

Каждый сервис, который применяет события другого сервиса, должен иметь inbox:

```text
inbox_event
  event_uuid pk
  producer
  event_type
  aggregate_type
  aggregate_uuid
  aggregate_version
  received_at
  processed_at nullable
  status
  attempts
  last_error nullable
```

Обязательные уникальные ограничения:

```text
outbox_event.uuid unique
inbox_event.event_uuid unique
aggregate_type + aggregate_uuid + aggregate_version unique, если событие версионированное
```

Consumer rule:

```text
if event_uuid уже processed:
  ack and ignore

if incoming aggregate_version <= current snapshot source_version:
  mark processed, ack and ignore

if incoming aggregate_version == current snapshot source_version + 1:
  apply event in transaction
  mark processed
  ack

if incoming aggregate_version > current snapshot source_version + 1:
  write sync_issue
  do not apply blindly
  ack only after issue is persisted
```

## Command Idempotency

Write-команды, которые могут повториться из gateway/UI/retry, должны принимать `commandId`.

```text
command_request
  command_id pk
  command_type
  request_hash
  status
  result jsonb nullable
  created_at
  updated_at
```

Правило:

```text
same command_id + same request_hash -> return previous result
same command_id + different request_hash -> reject as conflict
```

Минимально это нужно для:

```text
storeProduct.create
storeProduct.update
offer.create
offer.update
price.create
inventory.reserve
reservation.confirm
reservation.cancel
```

## Write Flow: Create Store Product

```text
createStoreProduct(commandId, shopUuid, productUuid, variantUuids)

1. Check command_request by commandId.
2. Load shop_snapshot, product_snapshot, variant_snapshot.
3. If snapshot is missing/stale, request fresh data from owning service.
4. Validate:
   - shop exists and active
   - product exists and active
   - every variant exists, active and belongs to product
5. In one local transaction:
   - insert store_product
   - insert store_variant_offer rows
   - insert command_request result
   - insert outbox_event
6. Return created aggregate.
```

## Read Flow: Store Product Details

`store_srv` can return a composed view using local tables and snapshots:

```text
store_product
  + store_variant_offer[]
  + current price per offer
  + inventory per offer
  + product_snapshot
  + variant_snapshot[]
  + shop_snapshot
```

Если UI нужна полная карточка каталога с properties/images, варианты:

1. Gateway/BFF собирает данные из `product_srv` и `store_srv`.
2. `store_srv` хранит расширенный product/variant snapshot с properties/images.

На старте лучше выбрать вариант 1, чтобы не раздувать snapshot до полного каталога.

## Cart And Order Boundary

`cart_srv` и `order_srv` не должны жить в `store_srv`.

Рекомендуемая будущая граница:

```text
cart_srv
  cart
  cart_item
  offer_uuid external id -> store_srv.store_variant_offer.uuid
  quantity
  observed_price_value
  observed_price_uuid
  observed_at

order_srv
  order
  order_item
  offer_uuid external id
  product_uuid external id
  variant_uuid external id
  price_history_uuid external id
  product_name_snapshot
  variant_name_snapshot
  unit_price_value
  currency_code
  quantity
```

Заказ фиксирует snapshot цены и названий на момент оформления. Старый заказ не должен меняться при
изменении каталога или цены.

Checkout later должен идти через Saga:

```text
cart -> order draft -> inventory reserve -> payment -> order confirm -> reservation confirm
```

## Migration From Current Product Service

Текущий `sellgar.product.service` содержит legacy области, которые надо разнести:

| Текущий модуль | Целевой владелец | Комментарий |
|---|---|---|
| `product` | `product_srv` | оставить |
| `variant` | `product_srv` | оставить |
| `brand` | `product_srv` | оставить |
| `category` | `product_srv` | оставить |
| `property` | `product_srv` | оставить |
| `property-group` | `product_srv` | оставить |
| `unit` | `product_srv` | оставить |
| `image` | `product_srv` | оставить как projection из `file_srv` |
| `shop` | `shop_srv` | перенести и расширять отдельно |
| `store` | `store_srv` | не переносить один-в-один; заменить на `store_product` + `store_variant_offer` |
| `price` | `store_srv` | заменить на `price_history` с привязкой к offer |
| `cart` | future `cart_srv` | не развивать в `product_srv` и не переносить в `store_srv` |
| `order` | future `order_srv` | не развивать в `product_srv` и не переносить в `store_srv` |
| `user` | `identity_srv` projection or remove later | проверить текущих потребителей |
| `currency` | unresolved | временно оставить, потом решить common reference vs store pricing |

Порядок безопасного переноса:

1. Добавить TypeORM подключение в `shop_srv` и `store_srv`.
2. Создать минимальную модель `shop` в `shop_srv`.
3. Создать `shop_snapshot`, `product_snapshot`, `variant_snapshot` в `store_srv`.
4. Добавить `store_product`, `store_variant_offer`, `price_history`, `inventory`.
5. Добавить outbox/inbox skeleton и idempotent command table.
6. Подключить события/sync для `shop` и `product/variant`.
7. Добавить новые command patterns для `store_srv`.
8. Переключить gateway на новые command patterns.
9. После runtime smoke удалить legacy `shop/store/price` из `product_srv`.
10. Отложить `cart/order` до отдельного проектирования.

## Open Decisions

- Где будет жить `currency`: общий справочник, `store_srv` или отдельный reference service.
- Нужен ли `warehouse_srv`, если остатки станут многоскладскими.
- Должен ли `store_srv` хранить расширенный snapshot variant properties/images или это будет
  ответственность gateway/BFF composition.
- Какой формат event envelope стандартизировать для всех сервисов.
- Какие команды требуют строгий `commandId` уже в первой итерации.
