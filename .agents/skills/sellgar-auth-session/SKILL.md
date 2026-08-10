---
name: sellgar-auth-session
description: >-
  Диагностирует и маршрутизирует Sellgar authentication/session проблемы: 401,
  unauthorized, sign-in, cookie, access/refresh token, renew, session expiry,
  CORS, gateway guards и frontend recovery. Использовать для сквозных auth
  инцидентов и contract changes между identity service, gateway и frontend.
  Сначала определяет слой сбоя; не переносит identity business rules в gateway
  или UI и не выводит секреты в logs, URLs или отчёт.
---

# Sellgar Auth и Session

## Область и приоритет

- Применяй этот скилл к auth/session flow между `sellgar.identity.service`, соответствующим gateway и клиентом.
- Для admin flow читай `backend/service/sellgar.identity.service/AGENTS.md`, `backend/gateway/sellgar.admin.gateway/AGENTS.md`, `backend/gateway/sellgar.admin.gateway/src/api/identity_srv/AGENTS.md`, `frontend/sellgar.ui.admin/AGENTS.md` и ближайший sign-in/runtime `AGENTS.md`.
- Считай identity service владельцем пользователей, auth policy, access/refresh tokens, session validity и TTL. Gateway владеет HTTP transport, cookies, CORS, guards и mapping. Frontend владеет sign-in UI и recovery presentation.
- Не применяй web frontend skills к backend auth-коду и не применяй backend соглашения к frontend-компонентам.

## Режимы

- **Диагностика:** собери runtime evidence и остановись на verdict/next action, если пользователь не просил исправление.
- **Исправление:** измени только установленного владельца и непосредственные стороны изменённого контракта.
- **Аудит:** проверь ownership, transport safety, secret handling и acceptance; код не изменяй.

## Алгоритм

1. Зафиксируй exact URL/request, ожидаемое auth state и наблюдаемый status/redirect/error.
2. Проверь health и readiness gateway/identity dependencies; не интерпретируй transport outage как invalid credentials.
3. Определи, где возникает сбой: credentials/domain, RMQ contract, gateway HTTP mapping, cookie/CORS/guard или frontend recovery.
4. Проследи request и session lifecycle через фактические producers/consumers и текущие config names.
5. Получи red evidence без публикации cookie/token values.
6. При разрешённом исправлении измени владельца причины, а не downstream symptom.
7. Проверь producer и consumer contract, затем выполни API/browser smoke релевантных веток.

## OWN — владение

- **OWN-1.** Держи credential validation, token issue/verification, refresh policy, session state, TTL и revoke rules в identity service.
- **OWN-2.** Держи cookie read/write, fingerprint construction, CORS, guards, HTTP status mapping и session-auth helpers в gateway.
- **OWN-3.** Держи sign-in form, redirect presentation и unauthorized recovery UI во frontend; не вычисляй там validity token/session.
- **OWN-4.** Не дублируй одно правило expiry/renew/revoke в нескольких слоях.
- **OWN-5.** При изменении общего auth contract проверяй admin, client и mobile gateway consumers, но не изменяй их без включения в task scope.

## SAFE — безопасность

- **SAFE-1.** Не помещай access token, refresh token, session credential, device identifier или cookie value в public query string.
- **SAFE-2.** Не выводи секреты в commentary, final response, saved artifacts, screenshots или command output. Маскируй значения, сохраняя только тип cookie/header и факт наличия.
- **SAFE-3.** Не ослабляй `HttpOnly`, `Secure`, `SameSite`, CORS или guard policy ради локального smoke без подтверждённого контракта и риска.
- **SAFE-4.** Не меняй cookie names, RMQ queues, exchange, token claims и auth env keys без поиска всех producers/consumers.
- **SAFE-5.** Не используй production credentials для локальной проверки.

## DIAG — классификация 401

- **DIAG-1.** Различай invalid credentials, missing credential, expired session, revoked session, failed refresh, gateway mapping и недоступный upstream.
- **DIAG-2.** Проверяй status code и response body на той boundary, где они создаются, а не только финальное сообщение UI.
- **DIAG-3.** Для cookie flow проверяй request origin, `Set-Cookie` attributes, последующую отправку cookie и CORS credentials policy.
- **DIAG-4.** Для renew проверяй одиночный и параллельный request paths, чтобы исключить duplicate refresh и race.
- **DIAG-5.** Не заменяй реальную причину generic redirect или silent retry, если это скрывает broken session contract.

## VERIFY — acceptance

Для изменённого сценария проверь применимые ветки:

1. valid sign-in;
2. invalid credentials;
3. authenticated request с установленной session cookie;
4. refresh/renew и повтор исходного request;
5. expired/revoked session и unauthorized recovery;
6. sign-out/cleanup, если затронут;
7. параллельные requests, если менялась renew coordination.

Build является только compile evidence. В отчёте указывай exact URLs/methods, status codes, redirects и cookie attributes без значений.

## Завершение

- Назови установленный слой причины и evidence.
- Перечисли изменённые owners и проверенных consumers.
- Укажи выполненные tests/API/browser scenarios и пропуски.
- Подтверди отсутствие секретов в diff и отчёте.
- Перечисли residual risk, особенно непроверенные clients или expiration paths.
