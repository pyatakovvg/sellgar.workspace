---
name: sellgar-admin-ui-routing
description: >-
  Маршрутизирует изменения web frontend Sellgar Admin между application host,
  pages, frames, widgets, layouts, shared design/domain libraries, @sellgar/app
  runtime и nested UI packages. Использовать перед разработкой, рефакторингом
  или аудитом в frontend/sellgar.ui.admin, когда нужно определить владельца
  файла, package boundary, обязательные документы и проверки. Не применять к
  backend, mobile или внутренним правилам React-компонента и framework-единицы.
---

# Маршрутизация Sellgar Admin UI

## Область и приоритет

- Применяй этот скилл только к `frontend/sellgar.ui.admin` и его nested frontend submodules.
- Используй его для выбора package-владельца и маршрута чтения. Детальные правила framework-единиц передавай `fe-module-create`, React-компонентов — `fe-react-component-structure`, frontend domain packages — `fe-domain-structure`, UI kit — `sellgar-ui-kit-component`.
- Считай `frontend/sellgar.ui.admin/AGENTS.md`, `frontend/sellgar.ui.admin/docs/agent/task-routing.md` и ближайший package `AGENTS.md` источниками текущих repo-specific контрактов. При расхождении с фактическим деревом сначала зафиксируй противоречие, не выдумывай отсутствующий путь.
- Не применяй этот скилл к backend, mobile, infrastructure или server-side packages.

## Алгоритм

1. Определи пользовательский сценарий и вид изменения: route screen, drawer/modal, embedded block, shared UI, domain/data access, framework runtime или application composition.
2. Прочитай workspace `agent/docs/README.md`, если задача началась из workspace root.
3. Прочитай `frontend/sellgar.ui.admin/AGENTS.md`, `frontend/sellgar.ui.admin/docs/agent/task-routing.md` и ближайший `AGENTS.md` целевого package.
4. Найди существующих владельца, публичный facade и непосредственных потребителей до выбора нового пути.
5. Зафиксируй target package и профильные frontend skills до изменения файлов.
6. После реализации проверь package-local commands и реальный browser path, если менялось UI behavior.

## PLACE — владельцы изменений

- **PLACE-1.** Размещай application bootstrap, route tree, auth gates, host bindings и composition root в `clients/admin/src/application`.
- **PLACE-2.** Размещай route screen, list/details page, route loader и route-level content в `pages/<feature>`.
- **PLACE-3.** Размещай drawer или modal workflow с собственными params, bindings, controller и view в `frames/<feature>`. Не переноси такой workflow в `widgets`.
- **PLACE-4.** Размещай переиспользуемый embedded runtime block в `widgets/<name>`.
- **PLACE-5.** Размещай layout composition в `layouts/<name>` и не превращай layout в владельца feature business logic.
- **PLACE-6.** Размещай visual-only shared abstractions в `library/design`; не добавляй туда domain, controller или feature-specific data access.
- **PLACE-7.** Размещай frontend Entity, Service ports, gateways, repositories и HTTP adapters в `library/domain` по правилам `fe-domain-structure`.
- **PLACE-8.** Изменяй framework runtime `@sellgar/app` только в nested submodule `library/sellgar.app.ui` и читай его ближайший `AGENTS.md`.
- **PLACE-9.** Изменяй UI kit `@sellgar/kit` только в nested submodule `library/sellgar.kit.ui` по `sellgar-ui-kit-component`.
- **PLACE-10.** Размещай pure helpers без feature ownership в `utils/*`; не используй `utils` как обход package boundary.

## BOUNDARY — границы

- **BOUNDARY-1.** Не импортируй private implementation другого page/frame/widget/library package. Используй его public facade или перенеси действительно общую абстракцию к подходящему владельцу.
- **BOUNDARY-2.** Не исправляй framework defect локальным feature workaround, пока не проверен владелец в `library/sellgar.app.ui`.
- **BOUNDARY-3.** Не дублируй kit primitive локальным ad hoc компонентом, если `@sellgar/kit` уже предоставляет нужный контракт.
- **BOUNDARY-4.** После переноса удали опустевшие каталоги во всём затронутом исходном и целевом дереве.
- **BOUNDARY-5.** Сохраняй документацию и agent prose на русском; paths, package names, commands и API identifiers оставляй как code literals.

## Проверка

1. Проверь, что каждый изменённый файл находится у установленного владельца и не создаёт forbidden deep import.
2. Запусти documented formatting, lint, typecheck, tests или build целевого package в объёме изменения.
3. Для route/frame behavior укажи exact URL, шаги, наблюдаемый результат и причину manual-only проверки, если автоматического покрытия нет.
4. Проверь nested submodule и gitlink impact, если менялись `library/sellgar.kit.ui`, `library/sellgar.orm.ui` или `library/sellgar.app.ui`.

## Завершение

- Перечисли выбранного владельца, применённые frontend skills, изменённые packages и команды проверки.
- Отдельно укажи заблокированные проверки, внешние ошибки и residual risk.
- Не объявляй задачу полностью проверенной, если browser/runtime acceptance требовался, но не выполнялся.
