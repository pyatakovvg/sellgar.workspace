---
name: sellgar-workspace-route
description: Маршрутизирует задачи Sellgar workspace, cross-repo реализацию, backend/frontend/mobile изменения, task contract, closeout и workspace orchestration.
id: sellgar-workspace-route
title: Sellgar Workspace Route
summary: Маршрутизация задач и closeout в Sellgar workspace.
triggers:
  - sellgar.workspace
  - workspace
  - cross-repo
  - task contract
  - closeout
  - backend/frontend/mobile
  - workspace orchestration
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
---

# Маршрут Sellgar Workspace

## Метаданные

```yaml
name: sellgar-workspace-route
description: Маршрутизирует задачи Sellgar workspace, cross-repo реализацию, backend/frontend/mobile изменения, task contract, closeout и workspace orchestration.
triggers:
  - sellgar.workspace
  - workspace
  - cross-repo
  - task contract
  - closeout
  - backend/frontend/mobile
  - workspace orchestration
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
```

Используй этот skill как первый слой маршрутизации для работы в Sellgar submodule workspace.

## Маршрут

Начинай с `/home/sellgar/projects/my/sellgar.workspace/agent/docs/README.md`.

Перед широким исследованием читай только минимальный маршрут под тип задачи:

- Реализация, cross-repo работа или незафиксированный scope: читай `agent/docs/agent/task-contract.md`.
- Submodules, detached state или sync: читай `agent/docs/submodules-workflow.md`.
- Локальный runtime, dev services или health checks: читай `agent/docs/dev-modes.md` и `agent/docs/dev-command-matrix.md`.
- Домен product/store/shop: читай `agent/docs/product-store-shop-architecture.md`.
- Финальные проверки: читай `agent/docs/agent/closeout-gates.md`.

После workspace route читай ближайший `AGENTS.md` в каждом затронутом submodule или package.

## Правила Workspace

- Считай workspace root владельцем submodule pointers и `agent/` docs/scripts.
- Держи feature-code внутри соответствующего submodule, не обычными файлами в workspace root.
- Используй `master` как default branch, если пользователь не сказал другое.
- Проверяй dirty state до правок и отделяй unrelated локальные изменения от task scope.
- Для диагностических задач останавливайся на evidence, verdict и next action, пока пользователь явно не попросит реализацию.
- Если меняется контракт frontend/gateway/service, проверяй producer и consumer; один build не является acceptance.

## Closeout

Для workspace или cross-repo задач запускай либо явно пропускай с причиной:

```bash
./agent/scripts/status-all.sh
git status --short --branch
git submodule status
```

Для runtime-задач дополнительно рассматривай:

```bash
./agent/scripts/health-check.sh full
```
