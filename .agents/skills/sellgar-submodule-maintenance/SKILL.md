---
name: sellgar-submodule-maintenance
description: >-
  Диагностирует и обслуживает Git submodules Sellgar: init/sync до
  origin/master, detached HEAD, dirty/ahead/behind state, nested submodules,
  gitlink updates и workspace pointer commits. Использовать для submodule,
  gitlink, sync master и detached-state запросов. Не изменяет feature-code, не
  очищает dirty worktrees и не двигает pointers молча.
---

# Обслуживание Sellgar Submodules

## Область и приоритет

- Применяй этот скилл к submodule state и gitlinks в Sellgar workspace.
- Перед действиями читай `agent/docs/README.md`, `agent/docs/submodules-workflow.md`, `.gitmodules` и при необходимости `agent/scripts/lib/repos.sh`.
- Считай submodule ссылкой на конкретный commit, а не автоматически последним `master`.
- Используй `master` как default target branch только когда пользователь не указал другое и repo contract это допускает.
- Для commit/push подключай `sellgar-commit-changes`; этот скилл отвечает за состояние и порядок, а не за feature commit content.

## Режимы

- **Диагностика:** только классифицируй branch, HEAD, dirty, ahead/behind и gitlink relation.
- **Sync:** обновляй разрешённые clean submodules до `origin/master` через workspace script.
- **Repair:** восстанавливай detached/wrong-branch состояние только после проверки local commits и явного target.
- **Gitlink:** фиксируй pointer только после осознанного child commit.

## Алгоритм

1. Из workspace root выполни `./agent/scripts/status-all.sh`, `git status --short --branch` и `git submodule status`.
2. Для каждого целевого submodule определи current branch/HEAD, dirty state, upstream и ahead/behind.
3. Сравни checked-out SHA с gitlink parent repository.
4. Классифицируй состояние: clean master, clean outdated, detached at expected gitlink, detached elsewhere, dirty, local commits или nested gitlink change.
5. Выбери минимальное действие, сохраняющее local work.
6. Выполни sync/repair только в разрешённой границе.
7. Повтори status child, parent и workspace root; перечисли изменившиеся pointers.

## STATE — классификация

- **STATE-1.** Не считай detached HEAD ошибкой автоматически: checkout на gitlink commit является штатным состоянием после `git submodule update`.
- **STATE-2.** Перед switch/merge/rebase найди local commits, upstream и незакоммиченные изменения.
- **STATE-3.** Не clean/reset/restore/checkout поверх dirty submodule без отдельного явного разрешения на точные файлы и последствия.
- **STATE-4.** Не путай dirty child worktree с изменённым gitlink parent: проверяй оба repository отдельно.
- **STATE-5.** Учитывай nested `sellgar.outbox.library` в product service и nested `sellgar.kit.ui`, `sellgar.orm.ui`, `sellgar.app.ui` в admin UI.

## SYNC — обновление

- **SYNC-1.** Для обычного workspace sync используй:

```bash
./agent/scripts/submodules-sync-master.sh
```

- **SYNC-2.** Скрипт должен обновлять только clean submodules на `master`; dirty, detached или feature-branch state сначала разбирай отдельно.
- **SYNC-3.** Не встраивай auto-sync в application start scripts: запуск приложения не должен менять source checkout.
- **SYNC-4.** Не выполняй recursive update с remote поверх всего workspace, если scope ограничен одним submodule.
- **SYNC-5.** Если remote fetch недоступен, не имитируй sync локальным pointer move; сообщи blocker.

## LINK — gitlinks и commits

- **LINK-1.** Каждый изменённый submodule получает commit в собственном repository.
- **LINK-2.** Parent repository фиксирует только новый child SHA, когда этот pointer должен стать воспроизводимой частью parent state.
- **LINK-3.** Для nested chain соблюдай порядок child → parent → workspace.
- **LINK-4.** При push публикуй child до parent pointer.
- **LINK-5.** Не stage все workspace gitlinks по шаблону, если реально изменена только часть.

## VERIFY — проверка

После действия проверь:

```bash
./agent/scripts/status-all.sh
git status --short --branch
git submodule status
```

В каждом затронутом child/parent дополнительно проверь `git status --short --branch` и `git rev-parse HEAD`.

## Завершение

Укажи:

- branch, HEAD и dirty/ahead/behind до и после;
- выполненное действие для каждого submodule;
- local commits, которые были сохранены;
- изменённые nested/parent/workspace gitlinks;
- commit/push status, если пользователь это просил;
- skipped commands и точную причину.
