# Submodule Workflow

Этот workspace содержит рабочие репозитории Sellgar как git submodules.

Submodule - это не "всегда latest master", а ссылка на конкретный commit. `.gitmodules` указывает `branch = master`, но workspace фиксирует gitlink. Это намеренно: агент и разработчик получают воспроизводимый набор commit'ов.

## Первичный Старт

```bash
git submodule update --init --recursive
./agent/scripts/status-all.sh
```

## Ежедневный Sync С Master

```bash
./agent/scripts/submodules-sync-master.sh
```

Скрипт:

- синхронизирует `.gitmodules`;
- инициализирует отсутствующие submodules;
- обновляет только clean submodules на ветке `master`;
- не трогает feature branches;
- не трогает dirty submodules;
- показывает состояние всех рабочих деревьев.

Если после sync изменились gitlinks, коммить их отдельно:

```bash
git add backend/gateway/sellgar.admin.gateway backend/gateway/sellgar.client.gateway backend/service/sellgar.identity.service backend/service/sellgar.product.service backend/service/sellgar.store.service backend/service/sellgar.shop.service backend/service/sellgar.file.service backend/service/sellgar.media.service frontend/sellgar.ui.admin frontend/sellgar.ui.kit frontend/sellgar.ui.desktop mobile/sellgar.mobile
git commit -m "chore: update sellgar submodules"
```

Не встраивай auto-update submodules в scripts запуска приложений. Запуск приложения не должен незаметно менять код.

## Разработка Задачи

Перед началом любой cross-repo задачи:

```bash
./agent/scripts/status-all.sh
```

Работать дальше можно только после того, как понятно:

- какие submodules clean и обновлены;
- какие submodules dirty;
- какие submodules ahead/behind относительно upstream;
- какие локальные изменения уже были до начала задачи.

Если `submodules-sync-master.sh` отказывается обновлять submodule из-за dirty state или не-`master` ветки, не исправляй это молча. Сначала определи, относится ли этот state к текущей задаче; если нет, не смешивай его со своей работой.

## Commit Дисциплина

- Каждый измененный submodule получает свой commit в своем repo.
- Workspace получает отдельный commit, если менялись `agent/docs`, `agent/scripts` или нужно зафиксировать обновленные gitlinks.
- Не коммить feature-code в workspace.
- В финальном ответе перечисляй submodule commits и workspace gitlink changes, если они есть.
