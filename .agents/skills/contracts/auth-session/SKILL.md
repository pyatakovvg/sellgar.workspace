---
name: auth-session
description: >-
  Диагностирует, изменяет и проверяет authentication/session flow: sign-in, cookies,
  tokens, refresh/renew, expiration, CORS и recovery. Использовать для auth-инцидентов и
  изменений соответствующих контрактов между владельцами.
---

# Authentication и session

## Установи контракт

Найди владельца identity/session правил, transport layer и клиентскую presentation/recovery. Конкретные protocols, credential types, storage, routes и names получай из действующих contracts. Не предполагая один способ auth, проследи фактические входы, выдачу credentials, их передачу, проверку, renewal и cleanup.

Авторитетная проверка credentials, session validity и revoke принадлежит установленному identity/security owner. Transport layer отвечает за предусмотренные headers/cookies/CORS/guards и mapping. UI не вычисляет доверенную validity самостоятельно и не маскирует outage как неверные credentials.

## Диагностика

Зафиксируй endpoint/действие, ожидаемое состояние и первый слой расхождения. Различай invalid/missing/expired/revoked credential, отказ renew, transport outage и неверный downstream mapping.

Для cookie flow проверь origin, attributes выдачи, последующую отправку cookie и credentials policy, не записывая значения. Для renew проверь исходный request и retry; при изменении координации — параллельные requests, duplicate refresh и races.

Используй [dev-runtime](../../runtime/dev-runtime/SKILL.md) в необходимом объёме. Read-only диагностика не разрешает исправлять source. При запрошенном исправлении следуй [development-workflow](../../workflows/development-workflow/SKILL.md) и меняй владельца причины с непосредственными сторонами контракта.

## Credentials и совместимость

Не выводи secret values в URLs, logs, tool output, screenshots и отчёты. Для evidence достаточно типа, атрибутов и факта наличия. Не ослабляй предусмотренную security policy ради удобного локального сценария.

При изменении credential names, claims, TTL, renewal и session transports найди всех consumers. Проверяй доступные affected clients, не расширяя разрешённые записи автоматически.

## Acceptance

Проверь применимые ветки: успешный и ошибочный вход; запрос с действующей session; renewal с повтором; expired/revoked recovery; logout/cleanup и параллельные requests, если затронуты. Учитывай порядок эффектов, redirects и конечный session state.

Сообщи установленный слой причины, безопасное evidence, проверенных consumers и ограничения. Один build не подтверждает cookie/renew behavior; один успешный вход не подтверждает expiration или конкурентность.
