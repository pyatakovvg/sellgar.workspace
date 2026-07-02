---
name: sellgar-dev-runtime
description: Запускает и smoke-check локальный Sellgar runtime, backend services, admin UI, media infra, health checks и browser/manual smoke.
id: sellgar-dev-runtime
title: Sellgar Dev Runtime
summary: Запуск локального Sellgar runtime и smoke-check dev services.
triggers:
  - runtime
  - start:dev
  - health-check
  - smoke
  - local backend
  - admin UI
  - media infra
  - browser smoke
  - dev services
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
---

# Sellgar Dev Runtime

## Метаданные

```yaml
name: sellgar-dev-runtime
description: Запускает и smoke-check локальный Sellgar runtime, backend services, admin UI, media infra, health checks и browser/manual smoke.
triggers:
  - runtime
  - start:dev
  - health-check
  - smoke
  - local backend
  - admin UI
  - media infra
  - browser smoke
  - dev services
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
```

Используй этот skill, когда задача требует локальный service, UI, endpoint или manual/browser smoke в Sellgar workspace.

## Обязательное Чтение

Читай:

- `agent/docs/README.md`
- `agent/docs/dev-modes.md`
- `agent/docs/dev-command-matrix.md`
- ближайший `AGENTS.md` для каждого запускаемого service или UI

## Начинай С Состояния

Из `/home/sellgar/projects/my/sellgar.workspace` проверь текущее состояние:

```bash
./agent/scripts/status-all.sh
./agent/scripts/health-check.sh full
```

Если важна только одна зона, используй узкий health profile из `agent/scripts/health-check.sh --help`.

## Runtime Правила

- Выбирай минимальный runtime mode, который доказывает поведение.
- Переиспользуй уже запущенные services, если их состояние подтверждено.
- Считай build только compile evidence.
- Для поведения, связанного с auth/session, persistence, upload, images, events, permissions или browser UI, собирай runtime или browser/manual evidence.
- `identity`, `product`, `store` и `shop` services в этом workspace RMQ-oriented и могут не иметь HTTP health endpoints. Проверяй их через logs, consumers и gateway/admin UI scenarios.
- Для media upload/CDN behavior включай checks для MinIO и local CDN.

## Частые Entrypoints

- Admin gateway: `backend/gateway/sellgar.admin.gateway`, ожидаемый local port `4020`.
- Admin UI: `frontend/sellgar.ui.admin`, ожидаемый local URL `http://localhost:3000`.
- File service: `backend/service/sellgar.file.service`, ожидаемый local port `5040`.
- Media service: `backend/service/sellgar.media.service`, ожидаемый local port `5050`.

Всегда сверяй текущую команду в `agent/docs/dev-command-matrix.md` и ближайшем repo `AGENTS.md` перед запуском.

## Closeout

Указывай точные URLs/endpoints, scenario steps, observed result и residual risk. Если automated test не добавлен, объясняй, почему manual smoke достаточен.
