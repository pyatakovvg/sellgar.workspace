# Sellgar Workspace Documentation Index

- Статус: current
- Назначение: единая точка входа в workspace-документацию для разработчиков и coding agents.

Этот индекс отвечает на три вопроса:

- где искать источник истины;
- какой минимальный набор документов читать под тип задачи;
- какие проверки запускать перед завершением работы.

## Перед Редактированием

- Определи тип задачи и целевые submodules.
- Если задача требует реализации, зафиксируй scope через [agent/task-contract.md](agent/task-contract.md) до правок.
- Проверь ближайший `AGENTS.md` каждого затронутого repo/package.
- Проверь dirty state до работы и отдели unrelated изменения от будущего commit scope.
- Команды из `agent/scripts/` запускай из корня `sellgar.workspace`.

## Быстрый Маршрут

| Если задача про | Читать сначала | Затем проверить |
|---|---|---|
| Agent task scope, реализация, closeout | [agent/task-contract.md](agent/task-contract.md) | [agent/closeout-gates.md](agent/closeout-gates.md) |
| Submodules, detached state, sync с `origin/master` | [submodules-workflow.md](submodules-workflow.md) | `./agent/scripts/status-all.sh` |
| Локальный запуск, health-check, dev services | [dev-modes.md](dev-modes.md) | [dev-command-matrix.md](dev-command-matrix.md) |
| Frontend-документация, правила разработки | [../frontend/README.md](../frontend/README.md) | тематический документ из `agent/frontend` |
| Product/Store/Shop архитектура, цены, остатки | [product-store-shop-architecture.md](product-store-shop-architecture.md) | affected service `AGENTS.md` |
| Admin gateway | `backend/gateway/sellgar.admin.gateway/AGENTS.md` | build/run/smoke из [dev-command-matrix.md](dev-command-matrix.md) |
| Client gateway | `backend/gateway/sellgar.client.gateway/AGENTS.md` | build/run/smoke из [dev-command-matrix.md](dev-command-matrix.md) |
| Socket gateway | `backend/gateway/sellgar.socket.gateway/AGENTS.md` | build/test + socket/RMQ smoke из [dev-command-matrix.md](dev-command-matrix.md) |
| Identity service | `backend/service/sellgar.identity.service/AGENTS.md` | build/run/smoke из [dev-command-matrix.md](dev-command-matrix.md) |
| Product service | `backend/service/sellgar.product.service/AGENTS.md` | product contract smoke, особенно images/variants |
| Store service | `backend/service/sellgar.store.service/AGENTS.md` | sellable product design/build |
| Shop service | `backend/service/sellgar.shop.service/AGENTS.md` | shop/channel design/build |
| File service | `backend/service/sellgar.file.service/AGENTS.md` | file metadata API smoke |
| Media service | `backend/service/sellgar.media.service/AGENTS.md` | media upload/CDN/MinIO smoke |
| Admin frontend | `frontend/sellgar.ui.admin/AGENTS.md` | browser/manual smoke + frontend build |
| UI kit | `frontend/sellgar.ui.admin/library/sellgar.kit.ui/AGENTS.md` | storybook/build checks |
| Desktop UI | nearest `AGENTS.md`, если появится | package-local build/run |
| Mobile app | nearest `AGENTS.md`, если появится | package-local build/run |

## Repo Entrypoints

Backend:

- `backend/gateway/sellgar.admin.gateway/AGENTS.md`
- `backend/gateway/sellgar.client.gateway/AGENTS.md`
- `backend/gateway/sellgar.socket.gateway/AGENTS.md`
- `backend/service/sellgar.identity.service/AGENTS.md`
- `backend/service/sellgar.product.service/AGENTS.md`
- `backend/service/sellgar.store.service/AGENTS.md`
- `backend/service/sellgar.shop.service/AGENTS.md`
- `backend/service/sellgar.file.service/AGENTS.md`
- `backend/service/sellgar.media.service/AGENTS.md`

Frontend:

- `frontend/sellgar.ui.admin/AGENTS.md`
- `frontend/sellgar.ui.admin/library/sellgar.kit.ui/AGENTS.md`
- `frontend/sellgar.ui.desktop/AGENTS.md`, если будет добавлен

Mobile:

- `mobile/sellgar.mobile/AGENTS.md`, если будет добавлен

## Agent Workflow Entrypoints

- [agent/task-contract.md](agent/task-contract.md) - фиксировать scope, evidence, acceptance и проверки.
- [agent/closeout-gates.md](agent/closeout-gates.md) - проверять dirty state, submodule pointers, tests и финальный отчет.
- [submodules-workflow.md](submodules-workflow.md) - работать с gitlinks и `master`.
- [dev-command-matrix.md](dev-command-matrix.md) - не восстанавливать команды заново в каждой сессии.
- [dev-modes.md](dev-modes.md) - выбирать режим локального запуска.
- [../frontend/README.md](../frontend/README.md) - индекс frontend-документации.

## Engineering Harness Checks

Минимальный harness перед завершением cross-repo или workspace-задачи:

```bash
./agent/scripts/status-all.sh
git status --short --branch
git submodule status
```

Для runtime-задач дополнительно:

```bash
./agent/scripts/health-check.sh full
```

## Правила Навигации

- Начинай с этого файла, если непонятно, где искать документ.
- При поиске исключай `.git/`, `.idea/`, `.agents/`, `.codex/`, `node_modules/`, generated output и архивы, если задача явно не про них.
- Если задача диагностическая, сначала зафиксируй evidence/verdict/next action; не превращай ее в код без явного перехода к реализации.
- Если меняется контракт между frontend/gateway/service, проверка сборкой недостаточна: нужен runtime или browser smoke по затронутому сценарию.
- Устойчивые решения по workspace orchestration фиксируй в `agent/docs/`.
- Специфические детали приложения фиксируй в ближайшем submodule `AGENTS.md`/`README.md`, а не в workspace.
