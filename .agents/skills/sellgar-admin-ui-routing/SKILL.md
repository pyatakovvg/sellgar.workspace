---
name: sellgar-admin-ui-routing
description: Маршрутизирует Sellgar admin frontend изменения в pages, frames, widgets, layouts, library/design, library/domain, tiyn-app runtime, routes и hash frames.
---

# Маршрутизация Sellgar Admin UI

Используй этот skill перед правками в `frontend/sellgar.ui.admin`.

## Обязательное Чтение

Читай:

- workspace `agent/docs/README.md`, если стартуешь из `sellgar.workspace`;
- `frontend/sellgar.ui.admin/AGENTS.md`;
- `frontend/sellgar.ui.admin/docs/agent/task-routing.md`;
- ближайший package `AGENTS.md` для целевого page/frame/widget/library package.

## Правила Размещения

- Application bootstrap, route tree, auth gates и host bindings: `clients/admin/src/application`.
- Route screens, list pages, route loaders и route-level content: `pages/<feature>`.
- Drawer или modal workflows со своими bindings/controller/view: `frames/<feature>`.
- Reusable embedded blocks: `widgets/<name>`.
- Visual-only shared wrappers: `library/design`.
- Entities, repositories, API clients и HTTP helpers: `library/domain`.
- Runtime framework changes: `library/tiyn-app`.
- Pure helpers: `utils/*`.

Не переносить drawer/modal feature workflows в `widgets`.

После переноса файлов или каталога между слоями удали каждый ставший пустым каталог в исходном и целевом дереве, включая опустевшую цепочку родителей. Не оставляй каталог только потому, что Git его не отслеживает; перед завершением явно проверь обе затронутые границы на пустые каталоги.

## UI Правила

- Используй `@sellgar/app` module/frame/controller patterns, уже принятые в repo.
- Используй `@sellgar/kit` components и `@sellgar/kit/icons`; не заменяй их ad hoc widgets, когда kit API подходит.
- При правках repo docs держи документацию и agent prose на русском.
- Для route/frame behavior проверяй реальный browser path, когда он доступен.

## Проверка

Используй repo commands из local docs. Для UI behavior предпочитай browser/manual smoke и указывай:

- exact URL;
- user steps;
- observed result;
- был ли добавлен automated coverage или почему manual-only достаточно.
