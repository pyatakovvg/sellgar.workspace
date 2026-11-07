---
name: service-contracts
description: >-
  Проектирует, изменяет и проверяет межсервисные контракты, source of truth, ownership,
  events, snapshots и consistency. Использовать при cross-service или producer/consumer
  изменениях; конкретные домены, базы и transports определяются проектом.
---

# Межсервисные контракты

## Владение и потребители

Установи пользовательский сценарий, authoritative owner каждого правила и данных, commands/queries/events и непосредственных producers/consumers. Используй действующие схемы, public contracts и локальные architecture docs. Gateway, frontend и snapshot не становятся source of truth только потому, что собирают удобную read model.

Текущий код показывает реализованный контракт; целевая архитектура может задавать другое состояние. Обозначь divergence и нужный миграционный шаг, не выдавая target за уже работающее. Изменяй только согласованные стороны; остальные учитывай как compatibility impact.

## Данные и consistency

Не полагайся на транзакционные гарантии за пределами реальной границы ресурса. Установи идентичность, reference semantics, ограничения и обработку отсутствующих/устаревших данных. Snapshot хранит необходимую производную проекцию и имеет явный путь обновления, а не незаметно копирует весь чужой aggregate.

Для точных величин установи precision, scale, rounding и wire representation. Не теряй точность денежного контракта при mapping или вычислении. Конкретный формат и storage type принадлежат владельцу, не универсальной таблице в скиле.

При асинхронных изменениях определи atomicity записи и публикации, idempotency, duplicate/old events, ordering/version gaps и reconciliation. Outbox/inbox используй, когда они обеспечивают требуемую гарантию, а не как обязательные каталоги любой системы. Повтор команды не должен случайно удваивать существенный эффект.

Gateway отвечает за transport/adaptation; предметные инварианты остаются у установленного владельца. DTO/read model не обязаны совпадать с внутренней persistence Entity.

## Реализация и проверка

Назови изменение входов, результатов, ошибок и temporal guarantees. Проверь совместимость и порядок rollout; не оставляй две неуправляемые системы знания под видом миграции.

Проверь owner, adapters и изменённых consumers. Для событий одного «published» недостаточно: подтверди delivery/application и итоговое состояние в требуемом сценарии. Для persistence/API/UI поведения используй [dev-runtime](../../runtime/dev-runtime/SKILL.md); compile evidence не заменяет outcome.

Frontend-часть оценивай frontend-стандартами, backend — стандартами его слоя. В аудите не меняй код; выводи точный owner/file, факт, последствие, минимальное исправление, verification и непроверенных consumers.
