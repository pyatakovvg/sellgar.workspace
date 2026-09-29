# Backlog Развития Commerce Admin

- Статус: planned
- Область: каталог, магазины, офферы, цены, остатки и операционная админка.
- Основание: аудит текущего Sellgar Admin и сравнение с практиками Shopify, Amazon Seller Central, commercetools, Adobe Commerce и Akeneo.

## Решение По Сервисам

Текущие владельцы сохраняются:

- `product_srv` — товары, варианты, свойства, категории, бренды, связи и качество каталога;
- `shop_srv` — магазины, каналы, настройки и жизненный цикл магазина;
- `store_srv` — ассортимент магазина, офферы, цены, остатки, резервы и складские операции;
- `media_srv` и `file_srv` — загрузка, обработка, хранение и выдача медиа;
- `identity_srv` — пользователи, роли и permissions.

Для максимального масштаба запланированы два новых инфраструктурных сервиса:

1. `sellgar.search.service` — поисковая read-model, фильтры, фасеты и операционные выборки.
2. `sellgar.catalog-operations.service` — импорты, экспорты и массовые операции. Сервис оркестрирует команды, но не становится владельцем товаров, цен или остатков.

Условные сервисы, создаваемые только при расширении scope:

- `sellgar.procurement.service` — поставщики, закупки, поставки и приёмка;
- `sellgar.order.service` — заказы, отмены, возвраты и fulfillment.

Отдельные PIM, Pricing, Inventory, Workflow, Audit и Dashboard services сейчас не создавать. Эти функции остаются у текущих domain owners или строятся как read-model.

## Этап 1 — Первый Рабочий Запуск

| ID | Задача | Владелец |
|---|---|---|
| ADM-001 | Исправить upload/CDN и добавить статусы обработки и ошибки изображений | Media, File, Product |
| CAT-001 | Ввести стабильные SKU/GTIN, SEO, размеры, вес и структурированные атрибуты | Product |
| CAT-002 | Разделить catalog lifecycle (`template`, `draft`, `published`, `archived`) и коммерческую активность Store; readiness вычислять, а не хранить статусом | Product, Store |
| CAT-003 | Добавить advisory completeness и причины проблем без автоматических lifecycle transitions | Product, Store |
| STORE-STATUS-001 | Утвердить Store lifecycle `disabled ↔ active`, переход в `archived` и восстановление `archived → disabled`; удалить `showing` | Store |
| CONTRACT-STATUS-001 | Мигрировать статусы, snapshots, events, gateway contracts и Admin UI на разделённые Product/Store lifecycle | Product, Store, Admin Gateway, Admin |
| UX-CAT-001 | Добавить frontend-сценарий «Создать по образцу»: заполнить стандартную create-форму данными выбранного draft без отдельной template-модели | Admin |
| PRICE-001 | Добавить обычную, старую и закупочную цену, валюту, период действия и историю | Store |
| INV-001 | Добавить `on-hand`, `available`, `reserved`, `committed` и `incoming` | Store |
| INV-002 | Добавить корректировки остатков с причиной, документом и историей | Store |
| SEARCH-001 | Сделать поиск, фильтры, сортировку, колонки и сохранённые представления | Search, Admin |
| ADM-002 | Сделать operational dashboard: нет цены, изображения, остатка или публикации | Search projections, Admin |

Результат этапа: товар можно создать, проверить, оценить, опубликовать и контролировать его доступность.

## Этап 2 — Эксплуатация Большого Каталога

| ID | Задача | Владелец |
|---|---|---|
| ARCH-CAT-001 | Спроектировать полноценную модель размерных рядов и sellable units с миграцией текущих `product/variant/property` и контрактом со Store | Product, Store, Admin |
| OPS-001 | Реализовать массовое изменение, публикацию, снятие и архивирование | Catalog Operations |
| OPS-002 | Реализовать CSV/XLSX импорт товаров, цен, остатков и изображений | Catalog Operations |
| OPS-003 | Добавить preview, валидацию, progress, retry и отчёт ошибок операции | Catalog Operations |
| SHOP-001 | Добавить магазину код, статус, валюту, локаль, склады и правила публикации | Shop |
| INV-003 | Добавить склады, перемещения, списания, инвентаризации и low-stock alerts | Store |
| GOV-001 | Добавить роли для контента, цен, склада и публикации | Identity, Admin Gateway |
| GOV-002 | Добавить историю изменений с автором и временем у каждого domain owner | Product, Shop, Store |

Результат этапа: каталогом безопасно и эффективно управляет команда.

## Этап 3 — Максимальный Commerce Контур

| ID | Задача | Владелец |
|---|---|---|
| MERCH-001 | Добавить коллекции, порядок товаров, related, upsell, cross-sell и bundles | Product |
| CAT-005 | Добавить локализованные и channel-scoped данные товара | Product, Shop |
| PRICE-002 | Добавить цены по рынку, каналу, сегменту и расписанию | Store |
| MEDIA-001 | Добавить DAM-функции: варианты файлов, alt-тексты, порядок, видео и документы | Media, File, Product |
| PROC-001 | Добавить поставщиков и purchase orders | Procurement |
| PROC-002 | Добавить ожидаемые поставки, приёмку и связь с `incoming` inventory | Procurement, Store |
| ORDER-001 | Добавить заказы, отмены, возвраты и fulfillment | Order, Store |

Результат этапа: полноценный контур PIM, складских и commerce operations.

## Порядок Запуска Работ

1. Закрыть `ADM-001`, чтобы медиа не блокировало товарный сценарий.
2. Выполнить `CAT-001..CAT-003`, затем `PRICE-001` и `INV-001..INV-002`.
3. После стабилизации domain contracts вводить Search и Catalog Operations.
4. Procurement и Order начинать только после отдельного task contract и подтверждения расширения scope.

## Открытое Архитектурное Решение

Текущая модель `product → variant → store_offer` и свободные связи
`product_property`/`variant_property` не поддерживают полноценный механизм размерных
рядов без изменения семантики основных агрегатов. Size-grid нельзя добавлять как боковую
надстройку.

Отдельная backend-подсистема шаблонов исключена. Сценарий «Создать по образцу» реализуется
в Admin UI поверх обычного draft: данные исходного товара преобразуются в существующий
create input без UUID, version и status, после чего используется стандартный create flow.
Backend не хранит template, template revision, reusable flag или связь с исходной копией.

До реализации `ARCH-CAT-001` необходимо определить:

- различие catalog product, конфигурации товара и продаваемой единицы;
- является ли размерная матрица доменной структурой или представлением sellable units;
- владельца идентичности, изображений и свойств каждого уровня;
- связь sellable unit со `store_offer`, inventory и reservation;
- lifecycle и миграцию существующих products, variants, offers и snapshots;
- механизм эволюции схемы без поломки опубликованных товаров.

Решение о новых таблицах размерных рядов и новом сервисе принимается только после этого дизайна.

Каждая задача реализуется отдельным task contract с проверкой затронутых service, gateway и frontend contracts.
