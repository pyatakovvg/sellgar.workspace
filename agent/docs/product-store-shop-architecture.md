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
```

`currency` для pricing живет в `store_srv` как предзаполненный локальный справочник. Таблица валют
не является частью каталога: catalog product/variant не должен владеть ценой или валютой продажи.

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

Lifecycle-правило:

- `product` и `variant` имеют одинаковую статусную модель: `active`, `archived`, `disabled`.
  В PostgreSQL это enum `catalog_status_enum`, а в TypeScript - `CatalogStatus`.
- Обычные read/list выборки исключают только `archived`. Статус `disabled` должен возвращаться
  наружу как обычное состояние сущности, чтобы UI и gateway могли явно видеть причину
  недоступности, а не терять запись.
- Пользовательское удаление товара или варианта не делает физический `DELETE`. Оно переводит
  сущность в статус `archived`, увеличивает `version` и публикует событие с новым `status`.
- Физическое удаление допустимо только как отдельный purge/cleanup-процесс вне пользовательского
  lifecycle.
- Consumer должен применять статус из `payload.status` как источник истины. Имя события может
  использоваться только как fallback для старых сообщений без `status`.

Версионность update-команд:

- Все самостоятельные изменяемые catalog-сущности имеют `version`.
- Entity ответа обязана отдавать `version`.
- Update DTO обязана принимать текущую `version` как expected version.
- Repository update обязан проверять `version` в транзакции и возвращать `409 Conflict`, если
  запись была изменена другим запросом.
- Gateway и frontend обязаны прокидывать `version` из загруженной entity в update-команду.

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

Базовая терминология:

- `product` - каталожное описание товара. Источник истины: `product_srv`.
- `variant` - конкретная конфигурация товара внутри `product`. Источник истины: `product_srv`.
- `shop` - магазин/витрина/канал продажи. Источник истины: `shop_srv`.
- `store_product` - факт, что конкретный `shop` продает конкретный `product`.
- `store_offer` - продажное предложение конкретного `variant` внутри конкретного
  `store_product`.
- `price_history` - история цены `store_offer`.
- `inventory` - остаток и резерв `store_offer`.

Ключевая формула модели:

```text
Product -> Variant
Shop + Product -> StoreProduct
StoreProduct + Variant -> Offer
Offer -> PriceHistory
Offer -> Inventory
```

`Offer` не является nullable-добавкой к `variant`. Если вариант еще не продается в магазине, для
него просто нет `offer`. Если `offer` существует, он обязан ссылаться на конкретный `variant`.

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

store_offer
  uuid pk
  version
  store_product_uuid
  product_uuid
  variant_uuid
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
  offer_uuid fk -> store_offer.uuid
  value numeric(12,2)
  currency_code
  starts_at
  ends_at nullable
  reason nullable
  created_at

inventory
  uuid pk
  offer_uuid fk -> store_offer.uuid
  quantity
  reserved
  version
  updated_at

reservation
  uuid pk
  offer_uuid fk -> store_offer.uuid
  quantity
  status
  source_type
  source_uuid
  expires_at
  created_at
  updated_at
```

Деньги в `store_srv`:

- в PostgreSQL цена хранится как `numeric(12,2)`;
- в TypeScript DTO/entity цена представлена строкой, например `"1299.90"`;
- `double precision`, `float` и TypeORM transformer в `number` для денег не используются;
- сервис нормализует входящее значение цены до двух знаков перед записью в `price_history`.

Межсервисные ссылки в `store_srv`:

```text
store_product.shop_uuid
store_product.product_uuid
store_offer.product_uuid
store_offer.variant_uuid
```

Между разными базами SQL FK нет: `store_product.shop_uuid` не может ссылаться напрямую на
`shop_srv.shop.uuid`, а `store_product.product_uuid` не может ссылаться напрямую на
`product_srv.product.uuid`.

Внутри своей базы `store_srv` обязан усиливать целостность через локальные ref/snapshot таблицы:

```text
store_product(uuid, product_uuid) unique
variant_snapshot(product_uuid, variant_uuid) unique
store_offer(store_product_uuid, product_uuid) fk -> store_product(uuid, product_uuid)
store_offer(variant_uuid, product_uuid) fk -> variant_snapshot(variant_uuid, product_uuid)
unique(store_offer.store_product_uuid, store_offer.variant_uuid)
```

Эти constraints означают:

- offer не может существовать без известного `variant`;
- offer не может ссылаться на `variant` другого `product`;
- один и тот же `variant` не может быть дважды выставлен в продажу внутри одного
  `store_product`;
- `variant_snapshot` не становится источником истины для варианта, но является локальным
  предохранителем целостности в `store_srv`.

Сервис дополнительно проверяет этот invariant в транзакции до записи, чтобы вернуть
понятную доменную ошибку, но финальная защита должна оставаться в SQL constraints:

```text
variant_snapshot.product_uuid == store_product.product_uuid
```

Так база гарантирует существование локальной ссылки, а сервис гарантирует, что offer относится к
варианту именно того product, который продает данный `store_product`.

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

Snapshot всегда должен оставаться минимальным. Нельзя превращать snapshot в дубликат полного
агрегата владельца. Если frontend или внешний API требует полноценную модель товара, варианта,
магазина, бренда, категории, свойств или изображений, сборка такой модели выполняется в gateway/BFF
через запросы к сервисам-владельцам и `store_srv`.

DDD naming rule: если сущность описывает одну и ту же бизнес-модель, она сохраняет свое имя в
ubiquitous language. `currency` остается `currency` в любом сервисе, а не `shopCurrency`,
`variantCurrency` или `storeCurrency`. То же правило относится к `product`, `variant`, `shop`,
`brand`, `category` и другим общим понятиям. Snapshot/read-model может иметь технический суффикс
`_snapshot`, но не должен менять бизнес-смысл сущности.

## Event Envelope

Все внешние integration events между сервисами используют общий envelope:

```text
event_uuid
event_type              -- product.created, variant.updated, shop.archived
schema_version
producer                -- product_srv, shop_srv, store_srv
aggregate_type          -- product, variant, shop, store_product, offer, inventory
aggregate_uuid
aggregate_version
occurred_at
payload jsonb
```

Правила:

- `event_uuid` глобально уникален и используется для idempotency в `inbox_event`.
- `aggregate_version` монотонно растет внутри сервиса-владельца агрегата.
- Consumer применяет событие только если версия не нарушает локальный порядок.
- Внешнее событие не должно требовать чтения чужой БД для базовой обработки.
- Внешние события являются integration contract. Их нельзя менять без `schema_version`.

Внутреннее доменное событие и внешнее integration event не одно и то же:

```text
domain event внутри сервиса
  -> outbox integration event
  -> RabbitMQ
  -> consumer inbox
  -> local snapshot/read-model update
```

## Outbox/Inbox

Каждый сервис, который публикует доменные события, должен иметь outbox:

```text
outbox_event
  uuid pk
  producer
  aggregate_type
  aggregate_uuid
  aggregate_version
  event_type
  schema_version
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
  schema_version
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

`ack` в RabbitMQ выполняется только после commit локальной транзакции. Если обработчик упал до
commit, сообщение должно быть доставлено повторно, а `inbox_event` защищает от дублей.

### Текущее внедрение в Sellgar

На текущем этапе механизм transactional outbox вынесен в отдельную библиотеку
`sellgar.outbox.library` и подключен в `sellgar.product.service` как nested
submodule внутри service-local monorepo:

```text
sellgar.product.service/
  service/                         -- приложение product_srv
  library/
    sellgar.outbox.library/        -- @sellgar/outbox
```

`@sellgar/outbox` владеет только инфраструктурой:

- `OutboxEventModel`;
- `OutboxWriter`;
- claim publishable events через `FOR UPDATE SKIP LOCKED`;
- retry/backoff через `next_attempt_at`;
- recovery зависших `processing` записей;
- publish timeout;
- metrics по pending/failed/processing.

Доменные сервисы по-прежнему владеют именами событий, payload, версиями агрегатов
и тем, в какой транзакции событие должно быть записано. Product service должен
передавать текущий TypeORM `EntityManager` в `OutboxWriter`, чтобы доменное
изменение и запись в `outbox_event` коммитились атомарно.

Важно: `OutboxModule` должен получать RabbitMQ `ClientProxy` через явный Nest DI
token. Если client не зарегистрирован, сервис должен падать на старте, а не
продолжать работу с `null` publisher.

Проверенный E2E-контур на 2026-06-28:

```text
admin UI
  -> admin gateway
  -> product_srv write
  -> product_srv.outbox_event
  -> RabbitMQ event.exchange
  -> store_srv inbox_event
  -> store_srv.variant_snapshot
```

Проверочный пример: добавление варианта товара в UI создало `variant.created`,
событие получило `published` в `product_srv.outbox_event`, было обработано как
`processed` в `store_srv.inbox_event`, после чего появился минимальный
`variant_snapshot`.

## Sync Issues And Reconciliation

Consumer не применяет событие вслепую, если видит разрыв версий или отсутствующего родителя:

```text
sync_issue
  uuid pk
  producer
  aggregate_type
  aggregate_uuid
  expected_version nullable
  received_version
  event_uuid
  reason                  -- version_gap, missing_parent, validation_failed
  payload jsonb
  status                  -- open, resolved, ignored
  created_at
  resolved_at nullable
```

Типовые случаи:

- `variant.created` пришел раньше `product.created` -> `missing_parent`.
- `product.updated` version 5 пришел после version 2 -> `version_gap`.
- payload не проходит локальную валидацию -> `validation_failed`.

Reconciliation job позже обязан уметь:

1. Читать open `sync_issue`.
2. Запрашивать актуальный aggregate у владельца через service API.
3. Перестраивать snapshot до актуальной версии.
4. Помечать issue как `resolved`.

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
   - insert store_offer rows
   - insert command_request result
   - insert outbox_event
6. Return created aggregate.
```

## Write Flow: Update Store Product

```text
updateStoreProduct(commandId, storeProductUuid, expectedVersion, patch)

1. Check command_request by commandId.
2. Load store_product by uuid.
3. Check expectedVersion == current version.
4. Validate changed shop/product/variant ids through snapshots.
5. In one local transaction:
   - update store_product version = version + 1
   - upsert/archive store_offer rows
   - if price changed, insert a new price_history row
   - if inventory changed, update inventory version = version + 1
   - insert command_request result
   - insert outbox_event store.product.updated
6. Return updated aggregate.
```

Если `expectedVersion` не совпал, команда возвращает conflict. Она не должна перетирать изменения
другого клиента.

## Write Flow: Archive Store Product

Hard delete для продаваемых товаров запрещен по умолчанию: cart/order/price history/reservation
могут ссылаться на offer. Удаление реализуется как archive:

```text
archiveStoreProduct(commandId, storeProductUuid, expectedVersion)

1. Check command_request by commandId.
2. Check expectedVersion.
3. In one local transaction:
   - update store_product status = archived, version = version + 1
   - update active offers status = archived, version = version + 1
   - keep price_history and inventory audit rows
   - insert command_request result
   - insert outbox_event store.product.archived
```

Физическое удаление допускается только для черновика, который не был опубликован и не имеет
истории/резервов/заказов. Это отдельная команда, не стандартный delete.

## Snapshot Event Handling

`store_srv` применяет события владельцев так:

```text
shop.created / shop.updated / shop.archived
  -> upsert shop_snapshot

product.created / product.updated / product.archived
  -> upsert product_snapshot

variant.created / variant.updated / variant.archived
  -> validate product_snapshot exists
  -> upsert variant_snapshot
```

Snapshots не являются source of truth. Они нужны для локальной проверки команд и быстрых read-model
ответов. Сервис не должен строить бизнес-решение только на голом UUID без snapshot-проверки.

## Read Flow: Store Product Details

`store_srv` can return a composed view using local tables and snapshots:

```text
store_product
  + store_offer[]
  + current price per offer
  + inventory per offer
  + product_snapshot
  + variant_snapshot[]
  + shop_snapshot
```

Если UI нужна полная карточка каталога с properties/images, варианты:

1. Gateway/BFF собирает данные из `product_srv` и `store_srv`.

`store_srv` не расширяет product/variant snapshot до properties/images. Иначе snapshot становится
дубликатом каталога и нарушает границу ownership.

## Cart And Order Boundary

`cart_srv` и `order_srv` не должны жить в `store_srv`.

Рекомендуемая будущая граница:

```text
cart_srv
  cart
  cart_item
  offer_uuid external id -> store_srv.store_offer.uuid
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
| `store` | `store_srv` | не переносить один-в-один; заменить на `store_product` + `store_offer` |
| `price` | `store_srv` | заменить на `price_history` с привязкой к offer |
| `cart` | future `cart_srv` | не развивать в `product_srv` и не переносить в `store_srv` |
| `order` | future `order_srv` | не развивать в `product_srv` и не переносить в `store_srv` |
| `user` | `identity_srv` projection or remove later | проверить текущих потребителей |
| `currency` | `store_srv` | предзаполненный справочник для pricing; имя сущности остается `currency` |

Порядок безопасного переноса:

1. Добавить TypeORM подключение в `shop_srv` и `store_srv`.
2. Создать минимальную модель `shop` в `shop_srv`.
3. Создать `shop_snapshot`, `product_snapshot`, `variant_snapshot` в `store_srv`.
4. Добавить `store_product`, `store_offer`, `price_history`, `inventory`.
5. Добавить outbox/inbox skeleton и idempotent command table.
6. Подключить события/sync для `shop` и `product/variant`.
7. Добавить новые command patterns для `store_srv`.
8. Переключить gateway на новые command patterns.
9. После runtime smoke удалить legacy `shop/store/price` из `product_srv`.
10. Отложить `cart/order` до отдельного проектирования.

## Open Decisions

- Нужен ли отдельный reference service для общих справочников позже. На текущем этапе `currency`
  для pricing живет в `store_srv`.
- Нужен ли `warehouse_srv`, если остатки станут многоскладскими.
- Какой минимальный reconciliation API должен быть у `product_srv` и `shop_srv`.
