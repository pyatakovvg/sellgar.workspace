---
name: sellgar-auth-session
description: Диагностирует Sellgar auth/session, 401, unauthorized, cookie, refresh token и sign-in поведение.
id: sellgar-auth-session
title: Sellgar Auth Session
summary: Диагностика auth/session в Sellgar.
triggers:
  - 401
  - unauthorized
  - session
  - cookie
  - refresh token
  - sign-in
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
---

# Sellgar Auth Session

## Метаданные

```yaml
name: sellgar-auth-session
description: Диагностирует Sellgar auth/session, 401, unauthorized, cookie, refresh token и sign-in поведение.
triggers:
  - 401
  - unauthorized
  - session
  - cookie
  - refresh token
  - sign-in
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
```

Используй этот skill для Sellgar authentication и session work на границах service, gateway и frontend.

## Обязательное Чтение

Из workspace route читай релевантные local docs:

- `agent/docs/README.md`
- `backend/service/sellgar.identity.service/AGENTS.md`
- `backend/gateway/sellgar.admin.gateway/AGENTS.md`
- `backend/gateway/sellgar.admin.gateway/src/api/identity_srv/AGENTS.md`, когда затронуты gateway identity adapter или session-auth helpers
- `frontend/sellgar.ui.admin/AGENTS.md` и ближайший sign-in/runtime `AGENTS.md` для admin UI behavior

## Сначала Диагностика

Перед правками разделяй слои:

- identity service domain ownership: users, persons, auth, access/refresh tokens, sessions;
- admin gateway transport: cookies, CORS, guards, session auth helpers, exception mapping;
- admin UI runtime: sign-in screen, unauthorized recovery, user request handling, redirects.

Когда доступен browser path, сначала смотри runtime behavior, потом предлагай code changes.

## Правила

- Держи identity business logic в `sellgar.identity.service`; gateway адаптирует его и владеет HTTP/session transport.
- Не дублируй token/session domain rules в gateway или UI.
- Не меняй RMQ queues, cookie names, CORS или auth env contracts без проверки producers и consumers.
- Для 401/unauthorized behavior выясняй, где сбой: transport/server health, gateway mapping, frontend runtime recovery или user credentials.
- Не добавляй auth data вроде device IDs или tokens в public query strings.

## Проверка

Build доказывает только compilation. Для auth/session changes предпочитай browser или API smoke:

- sign in с valid credentials;
- попытка invalid credentials;
- refresh или renew session, если релевантно;
- unauthorized recovery или expiration path, если релевантно;
- подтверждение cookie/session behavior на gateway boundary.

Указывай exact URLs, requests, status codes, redirects и remaining risks.
