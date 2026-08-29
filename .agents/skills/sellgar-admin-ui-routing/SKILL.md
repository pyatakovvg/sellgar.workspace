---
name: sellgar-admin-ui-routing
description: >-
  Маршрутизирует изменения web frontend Sellgar Admin между текущим
  @sellgar/app, целевым @sellgar/app-v2 во время явной миграции, application
  host, pages, frames, widgets, layouts, shared libraries и nested UI packages.
  Использовать перед разработкой, миграцией, рефакторингом или аудитом в
  frontend/sellgar.ui.admin, когда нужно определить режим работы, владельца
  файла, package boundary и проверки. Не применять к backend, mobile или
  внутренней декомпозиции отдельного React-компонента.
---

# Маршрутизация Sellgar Admin UI

## Сначала выбери режим

До framework cutover не объявляй `@sellgar/app-v2` активным runtime всего Admin
UI и не меняй обычную feature-задачу ради будущей миграции.

- **CURRENT** — режим по умолчанию для feature work, bugfix и аудита текущего
  приложения. Контракт задаёт `@sellgar/app` из `library/sellgar.app.ui`.
- **MIGRATION** — только когда пользователь явно просит перенести framework,
  конкретный package или механику на `@sellgar/app-v2`, стабилизировать новый
  runtime либо проверить parity. Текущий V1 используется как behavioral
  reference, а изменения выполняются в выбранном target slice.
- **CUTOVER** — не выводи из наличия незавершённых файлов, dependency или
  работающего playground. Используй только после явного решения о замене и
  прохождения acceptance всего приложения. Тогда этот skill нужно отдельно
  упростить до v2-only контракта.

Не смешивай режимы молча. В начале задачи назови выбранный режим и перечисли
packages, которые разрешено менять.

## Область и профильные skills

- Применяй этот skill только к `frontend/sellgar.ui.admin` и его nested frontend
  submodules.
- Он выбирает владельца и маршрут чтения. Детальные правила frontend domain
  packages передавай `fe-domain-structure`, React-компонентов —
  `fe-react-component-structure`, UI kit — `sellgar-ui-kit-component`.
- `fe-module-create` применяй только в режиме framework, которому соответствует
  его актуальная инструкция. Не переноси V1 API в v2 или v2 API в CURRENT из-за
  другого skill.
- Не применяй этот skill к backend, mobile, infrastructure или server-side
  packages.

## Источники истины

1. Если задача началась из workspace root, сначала выполни маршрут из
   `agent/docs/README.md` и зафиксируй dirty-state ownership submodule.
2. Прочитай `frontend/sellgar.ui.admin/AGENTS.md`,
   `frontend/sellgar.ui.admin/docs/agent/task-routing.md`, фактические
   `package.json`, public facades и ближайший `AGENTS.md` целевого package.
3. Учитывай незавершённую миграцию: сравни committed/current contract и dirty
   target changes. Не считай изменённую документацию доказательством cutover.
4. В CURRENT framework owner — `library/sellgar.app.ui`; читай его ближайший
   `AGENTS.md` и public API `@sellgar/app`.
5. В MIGRATION target owner — `library/tiyn-app-v2`; читай его `AGENTS.md`,
   `docs/package-structure.md`, public entrypoints и тесты конкретного owner.
   V1 implementation используется только для сверки поведения.
6. При расхождении документации с кодом зафиксируй противоречие. Не выдумывай
   отсутствующий path и не распространяй target contract на ещё не перенесённый
   slice.

## Общая карта владельцев

Framework migration не меняет эти package boundaries сама по себе:

- bootstrap, application composition, routes, auth policies и host bindings —
  `clients/admin/src/application`;
- route-level screen, page controller/loader и content — `pages/<feature>`;
- цельный drawer/modal workflow с controller, loader, form и mutations —
  `frames/<feature>`;
- reusable embedded runtime block — `widgets/<name>`;
- shell и общая layout composition — `layouts/<name>`;
- visual-only shared abstractions — `library/design`;
- frontend Entity, ports, repositories, gateways и HTTP adapters —
  `library/domain` по `fe-domain-structure`;
- reusable application providers — `library/provider`, renderer-neutral
  Socket.IO transport — `library/socket-io`;
- UI kit API — nested submodule `library/sellgar.kit.ui` по
  `sellgar-ui-kit-component`;
- pure helpers без feature ownership — `utils/*`.

Не импортируй private implementation другого package. Используй public facade
или перенеси действительно общую абстракцию к подходящему владельцу.

## CURRENT: контракт `@sellgar/app`

- Route tree, string paths, auth gates и подключение `frames: [...]` принадлежат
  текущей application composition.
- Pages используют текущие `@Module` и `@UseBindings`.
- Frames используют текущие `@Frame`, `FrameDefinition`, `HashFrameSource`,
  локальный shell и frame params contract.
- Открытие frame выполняется через текущий `useFrame(FrameClass)`; loader params
  читаются по фактическому V1 frame contract.
- Framework defect исправляется в nested submodule
  `library/sellgar.app.ui`, а не локальным feature workaround. Учитывай отдельный
  commit и gitlink Admin repository.

Не добавляй `@sellgar/app-v2`, route tokens или новый router в CURRENT-задачу
только потому, что такой cutover запланирован.

## MIGRATION: целевой контракт `@sellgar/app-v2`

Переноси законченными вертикальными срезами и сохраняй V1 semantics, если RFC
не фиксирует semantic delta: lifecycle, ownership, error handling, revalidate и
cleanup.

- Renderer-neutral API импортируется из `@sellgar/app-v2`, React declarations,
  hosts и hooks — из `@sellgar/app-v2/react`.
- `library/tiyn-app-v2` владеет core/runtime и renderer adapters. `core` не
  импортирует React; React-specific declarations и presentation остаются в
  `react` entrypoint.
- Стабильная route identity и тип params принадлежат отдельному target package
  `library/route-tokens`. Token не владеет URL, loader, layout, policy, shell или
  route declaration.
- Address, policies, lazy load, layouts и nested `Router` принадлежат target
  route graph в application host.
- Pages остаются `pages/*` и объявляются через v2 `@Module`; nested workflows
  остаются `frames/*` и объявляются через v2 `@Frame`; embedded blocks остаются
  `widgets/*` и объявляются через v2 `@Widget`.
- Навигация target slice выполняется через route token и v2 navigate service,
  не через string URL, `react-router-dom`, `useFrame` или hash constants.
- Route params выводятся из token и приходят через `args.params`, а не через V1
  frame open props.
- Target nested frames используют единый application-level Drawer shell.
  Отдельный Modal shell не создавай; kit `Modal` допустим для confirmation или
  явного user-request overlay.
- Не исправляй defect v2 runtime в feature package, пока не проверен owner в
  `library/tiyn-app-v2`.

Наличие target реализации не разрешает удалять V1 или переключать остальные
slices. Для каждого среза отдельно назови source behavior, target owner,
consumer и acceptance.

## Условия framework cutover

Не переключай skill и repo docs на v2-only, пока одновременно не подтверждены:

1. application host и все runtime consumers больше не зависят от
   `@sellgar/app`;
2. route, frame, widget, provider, auth/session и revalidate mechanics перенесены
   и покрыты parity checks;
3. target route tokens и route graph являются единственным navigation contract;
4. framework tests/typechecks, Admin UI build и browser acceptance проходят;
5. cleanup V1 dependency и nested gitlink входит в явно согласованный cutover.

## Проверка

- Для CURRENT feature change запусти package-local tests/typecheck, Admin UI
  build и browser scenario в объёме изменения.
- Для MIGRATION сначала проверь target framework owner, затем migrated consumer,
  Admin UI build и реальный browser path. Для routing проверяй direct URL,
  open/close, Back/Forward, auth restore и revalidation по acceptance среза.
- Для `library/tiyn-app-v2` выполняй core/full typecheck и относящиеся framework
  tests; render без lifecycle/cleanup проверки недостаточен.
- Для nested `library/sellgar.app.ui`, `library/sellgar.kit.ui` и
  `library/sellgar.orm.ui` отдельно проверь repository state и gitlink impact.
  `library/tiyn-app-v2` и `library/route-tokens` не считай nested submodules без
  фактического подтверждения.
- Всегда выполни formatter затронутых файлов и `git diff --check`.

## Завершение

Сообщи режим, выбранных владельцев, изменённые packages, команды и browser
evidence. Отдельно перечисли незавершённые migration slices, documentation debt,
невыполненные проверки и residual risk. Не объявляй cutover завершённым по
успешной проверке одного экрана или механики.
