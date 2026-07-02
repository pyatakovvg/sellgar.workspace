---
name: sellgar-product-store-shop
description: Маршрутизирует Sellgar commerce-domain задачи product/store/shop, variants, images, offers, prices, inventory, reservations, outbox/inbox и snapshots.
id: sellgar-product-store-shop
title: Sellgar Product Store Shop
summary: Маршрутизация commerce-domain задач product/store/shop в Sellgar.
triggers:
  - product
  - store
  - shop
  - variant
  - images
  - offer
  - price
  - currency
  - inventory
  - reservation
  - outbox
  - inbox
  - snapshot
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
---

# Sellgar Product Store Shop

## Метаданные

```yaml
name: sellgar-product-store-shop
description: Маршрутизирует Sellgar commerce-domain задачи product/store/shop, variants, images, offers, prices, inventory, reservations, outbox/inbox и snapshots.
triggers:
  - product
  - store
  - shop
  - variant
  - images
  - offer
  - price
  - currency
  - inventory
  - reservation
  - outbox
  - inbox
  - snapshot
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
```

Используй этот skill для commerce-domain работы, которая может пересекать `product_srv`, `store_srv`, `shop_srv`, admin gateway и admin UI.

## Обязательное Чтение

Начинай с:

- `agent/docs/README.md`
- `agent/docs/product-store-shop-architecture.md`
- affected service `AGENTS.md`
- affected gateway/frontend `AGENTS.md`, если меняется API или UI contract

Считай `product-store-shop-architecture.md` текущей целевой моделью, но проверяй live code перед правками. Live source и local `AGENTS.md` важнее, если draft и implementation расходятся.

## Ownership

- `product_srv` владеет catalog product, variant, brand, category, property, unit и image projection.
- `shop_srv` владеет shop/channel, shop settings и shop lifecycle.
- `store_srv` владеет store product, offer, price history, inventory, reservation и sellable product state.
- `sellgar.admin.gateway` собирает admin-facing read models из service owners.
- Admin UI потребляет gateway contract и не должен изобретать service ownership.

## Жесткие Правила

- Не помещай price, stock, reservation, shop, cart или order ownership в `product_srv`.
- Не протаскивай internal `store_srv` snapshots как public frontend model.
- Images в текущем catalog/admin contract принадлежат variants, а не product-level `product.images`.
- Store snapshots - минимальные consistency/read-model aids, а не дублирующий source of truth.
- Используй external UUID references между service databases; не добавляй cross-database SQL foreign keys.
- Храни деньги как PostgreSQL `numeric(12,2)` и TypeScript DTO/entity strings, не floating-point numbers.
- Применяй external events idempotently через inbox/outbox patterns и сохраняй aggregate versions.

## Проверка

Для contract changes проверяй producer и consumer. Build недостаточен для:

- product variant/image behavior;
- store offers/prices/inventory;
- gateway read-model composition;
- event propagation to snapshots/inbox.

Предпочитай smoke path, который проходит:

```text
admin UI -> admin gateway -> owning service -> outbox/RMQ -> consumer inbox/snapshot
```
