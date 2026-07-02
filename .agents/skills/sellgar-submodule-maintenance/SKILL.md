---
name: sellgar-submodule-maintenance
description: Обслуживает Sellgar git submodules, sync до origin/master, detached HEAD, gitlink changes, nested submodule и workspace pointer commits.
id: sellgar-submodule-maintenance
title: Sellgar Submodule Maintenance
summary: Обслуживание git submodules и workspace gitlinks в Sellgar.
triggers:
  - submodule
  - submodules
  - gitlink
  - detached HEAD
  - origin/master
  - sync master
  - nested submodule
  - workspace pointer
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
---

# Обслуживание Sellgar Submodules

## Метаданные

```yaml
name: sellgar-submodule-maintenance
description: Обслуживает Sellgar git submodules, sync до origin/master, detached HEAD, gitlink changes, nested submodule и workspace pointer commits.
triggers:
  - submodule
  - submodules
  - gitlink
  - detached HEAD
  - origin/master
  - sync master
  - nested submodule
  - workspace pointer
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
```

Используй этот skill для состояния submodules, sync и gitlink-работы в `/home/sellgar/projects/my/sellgar.workspace`.

## Обязательное Чтение

Читай:

- `agent/docs/README.md`
- `agent/docs/submodules-workflow.md`
- `.gitmodules`
- `agent/scripts/lib/repos.sh`, когда важны repo paths или nested submodules

## Workflow

Начинай из workspace root:

```bash
./agent/scripts/status-all.sh
git status --short --branch
git submodule status
```

Используй repo scripts вместо восстановления submodule-логики вручную:

```bash
./agent/scripts/submodules-sync-master.sh
```

Sync script намеренно обновляет только clean submodules на `master`. Если submodule dirty, detached или на другой ветке, сначала классифицируй это состояние.

## Правила

- Не clean/reset/checkout/overwrite dirty submodule молча.
- Не смешивай feature-code commits с workspace gitlink commits.
- Каждый измененный submodule коммить в его собственном repository.
- Workspace gitlink changes коммить отдельно, когда workspace pointer должен сдвинуться.
- Не встраивай automatic submodule sync в application start scripts.
- Учитывай nested `sellgar.outbox.library`, когда product service outbox work затрагивает его.

## Evidence

В финальном ответе указывай:

- branch и dirty/ahead/behind состояние submodule;
- измененные submodule commits, если есть;
- измененные workspace gitlinks, если есть;
- выполненные команды и пропущенные команды.
