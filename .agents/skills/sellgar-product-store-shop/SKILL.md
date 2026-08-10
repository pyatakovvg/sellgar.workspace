---
name: sellgar-product-store-shop
description: >-
  Маршрутизирует и проверяет cross-repo commerce-domain изменения Sellgar для
  catalog product, variants, images, brands/categories/properties/units, shops,
  store products, offers, currencies, prices, inventory, reservations,
  outbox/inbox, snapshots и admin read models. Использовать при проектировании,
  реализации, рефакторинге или аудите contract flow между product/store/shop
  services, gateways и clients. Не смешивает service ownership и не считает
  snapshot или gateway source of truth.
---

# Product, Store и Shop в Sellgar

## Область и приоритет

- Применяй этот скилл к commerce-domain задачам, пересекающим `product_srv`, `store_srv`, `shop_srv`, gateways и clients.
- Начинай с `agent/docs/README.md`, `agent/docs/product-store-shop-architecture.md` и ближайшего `AGENTS.md` каждого реально затрагиваемого service/gateway/client package.
- Считай фактические public contracts, migrations/entities и current consumers evidence текущего состояния. Считай `product-store-shop-architecture.md` целевой моделью; при противоречии зафиксируй divergence и не придумывай миграционный шаг.
- Если задача попадает в `Open Decisions` архитектурного документа или требует сменить service ownership, остановись и запроси решение до реализации.
- Применяй frontend skills только к frontend-части, backend правила — только к service/gateway owners.

## Режимы

- **Проектирование:** определи owners, commands, events, consistency boundary и migration path до кода.
- **Реализация:** обнови owner и каждого непосредственного producer/consumer изменённого контракта.
- **Диагностика:** проследи flow и остановись на evidence/verdict, если исправление не запрошено.
- **Аудит:** не изменяй код; перечисли ownership, contract, consistency и verification нарушения.

## Алгоритм

1. Назови изменяемый aggregate/use case и пользовательский результат.
2. Определи source-of-truth service, database tables, public command/query и frontend/gateway consumers.
3. Найди связанные DTO/entities, migrations, RMQ routes, event envelope, outbox/inbox handlers и snapshots.
4. Зафиксируй transactional boundary, idempotency key, aggregate version и failure/reconciliation path.
5. Составь target repos и contract changes; запроси подтверждение, если scope расширяется.
6. Реализуй owner сначала, затем adapters/consumers, не создавая параллельный legacy contract.
7. Проверь build/tests каждой стороны и сквозной runtime flow для behavior/event changes.

## OWN — владельцы домена

- **OWN-1.** `product_srv` владеет catalog product, variant, brand, category, property, unit и variant image projection.
- **OWN-2.** `shop_srv` владеет shop/channel, shop settings и shop lifecycle.
- **OWN-3.** `store_srv` владеет store product, offer, price history, inventory, reservation и sellable product state.
- **OWN-4.** Gateway адаптирует transport и собирает admin-facing read models; он не становится владельцем product/store/shop business rules.
- **OWN-5.** Client потребляет gateway contract и не изобретает service ownership, consistency или pricing rules.
- **OWN-6.** Не помещай price, stock, reservation, shop, cart или order ownership в `product_srv`.
- **OWN-7.** Cart и order не принадлежат `store_srv`; store предоставляет sellable state, prices, inventory и reservation boundary.

## REF — ссылки и snapshots

- **REF-1.** Используй external UUID references между databases; не добавляй cross-database SQL foreign keys.
- **REF-2.** Внутри своей database усиливай целостность локальными constraints и foreign keys к owned snapshot/ref tables.
- **REF-3.** Считай `shop_snapshot`, `product_snapshot` и `variant_snapshot` минимальными consistency/read-model aids, а не source of truth.
- **REF-4.** Не расширяй snapshot до полной копии внешнего aggregate ради удобства read model.
- **REF-5.** Не возвращай internal snapshot entity как public frontend model. Собирай явный gateway/service result contract.
- **REF-6.** Проверяй согласованность `variant_snapshot.product_uuid` и `store_product.product_uuid` до изменения offers.

## IMAGE — изображения

- **IMAGE-1.** В текущем catalog/admin contract изображение принадлежит variant: используй `variant.images`, а не product-level `product.images`.
- **IMAGE-2.** Изменение image contract проверяй в product service, admin gateway, file/media flow и client consumer.
- **IMAGE-3.** Не делай защищённый file metadata/download endpoint публичным ради image preview; public media delivery принадлежит media/CDN contract.

## MONEY — цены и валюты

- **MONEY-1.** Храни monetary value в PostgreSQL как `numeric(12,2)` и передавай через TypeScript DTO/entity как decimal string.
- **MONEY-2.** Не используй floating-point number для денежного значения.
- **MONEY-3.** Храни price history как owned store data и сохраняй currency reference/contract по текущей модели.
- **MONEY-4.** Не вычисляй authoritative price во frontend или gateway.

## EVENT — события и согласованность

- **EVENT-1.** Записывай integration event в transactional outbox той же транзакции, что изменяет aggregate.
- **EVENT-2.** Обрабатывай внешнее событие idempotently через inbox с unique `event_uuid`.
- **EVENT-3.** Передавай и проверяй aggregate version; duplicate/old event не должен откатывать snapshot.
- **EVENT-4.** При version gap создавай sync issue/reconciliation path, а не применяй событие вслепую.
- **EVENT-5.** Не считай published outbox доказательством applied consumer state. Для smoke подтверждай publisher outbox, consumer inbox и целевой snapshot/read model.
- **EVENT-6.** Для command retry используй стабильный command id и idempotent owner contract.

## VERIFY — acceptance

- **VERIFY-1.** Для contract change проверяй owning producer, gateway adapter и каждого изменённого client consumer.
- **VERIFY-2.** Для event flow проверяй write transaction, outbox publication, RMQ delivery, inbox processing, snapshot/version и reconciliation errors.
- **VERIFY-3.** Для offers/prices/inventory/reservation одного build недостаточно; выполни owner API/RMQ или UI-to-service runtime scenario.
- **VERIFY-4.** Для variant/images выполни save/read/media scenario через актуальный admin contract.
- **VERIFY-5.** Не меняй production contract ради упрощённого fixture. Создавай fixture, соответствующий реальным Entity/DTO constraints.

Предпочтительный сквозной путь:

```text
admin UI → admin gateway → owning service → outbox/RMQ → consumer inbox/snapshot
```

## Аудит

Проверь ownership, public contracts, database boundaries, monetary types, image ownership, idempotency, versions, outbox/inbox, snapshot minimality, producer/consumer coverage и runtime evidence. Каждое нарушение связывай с точным owner/file и исправлением; не объединяй разные contract boundaries в одно замечание.

## Завершение

- Перечисли изменённые owners, contracts, events и consumers.
- Укажи migrations/data impact и backward-compatibility decision.
- Перечисли build/tests и exact runtime scenario.
- Назови непроверенные consumers, event paths и residual consistency risk.
- Укажи submodule/nested library gitlink impact.
