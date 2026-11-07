# Группы скилов и контекст Sellgar

Общие правила находятся в `.agents/skills`. Этот документ связывает их с проектом: repository ownership, branches, URLs, scripts и framework versions принадлежат локальной документации. Он не дублирует инженерные стандарты.

## Выбор сценария

Вход для неизвестного или составного запроса — [task-route](../../../.agents/skills/workflows/task-route/SKILL.md).

| Запрос | Группа | Подключаемая основа |
|---|---|---|
| «Закоммить и запушь» | [git-workflow](../../../.agents/skills/git/git-workflow/SKILL.md) | commit-changes; submodule-maintenance при наличии Git-связей |
| «Обнови submodules» | git-workflow → submodule-maintenance | диагностика, конкретный режим и разрешённые refs; commit/push только по запросу |
| «Приступай к разработке», исправление, рефакторинг | [development-workflow](../../../.agents/skills/workflows/development-workflow/SKILL.md) | clean-code, engineering-principles, code-formatting; профиль изменяемого слоя |
| «Проведи аудит» | [audit-workflow](../../../.agents/skills/workflows/audit-workflow/SKILL.md) | те же правила в read-only режиме, карта охвата и evidence |
| «Запусти приложение/админку/сервисы», runtime smoke | [dev-runtime](../../../.agents/skills/runtime/dev-runtime/SKILL.md) | проектный профиль запуска, readiness и только необходимый smoke |

При составном запросе сначала выполни разработку и acceptance, затем Git-фазу. Commit не включает новый refactoring, запуск не включает sync master. Папки группируют правила; совместное применение задают ссылки и условия в сценарных `SKILL.md`.

## Проектные источники

| Область | Источник конкретных путей, команд и контрактов |
|---|---|
| Workspace ownership и task contract | [README](../README.md), [task-contract](task-contract.md), [closeout](closeout-gates.md) |
| Branch и nested gitlink policy | [submodules-workflow](../submodules-workflow.md), `.gitmodules`, фактический Git graph и ближайший `AGENTS.md` |
| Запуск полного Admin stack и отдельных компонентов | [dev-modes](../dev-modes.md), [dev-command-matrix](../dev-command-matrix.md); scripts соответствующих repos |
| Frontend Admin: host, routes, активный framework и migration state | [AGENTS.md](../../../frontend/sellgar.ui.admin/AGENTS.md), [task-routing](../../../frontend/sellgar.ui.admin/docs/agent/task-routing.md), manifests и реальные entrypoints |
| Desktop frontend и его nested framework/kit | [AGENTS.md](../../../frontend/sellgar.ui.desktop/AGENTS.md), nearest package instructions и `.gitmodules` |
| UI kit API, stories и generation | [AGENTS.md](../../../frontend/sellgar.ui.admin/library/sellgar.kit.ui/AGENTS.md) и ближайшие инструкции выбранного checkout |
| Product/Store/Shop ownership, денежные и event-контракты | [архитектура](../product-store-shop-architecture.md) и AGENTS.md фактического owning service/gateway |
| Auth/session | AGENTS.md identity service, соответствующего gateway и клиента; их фактические public contracts |
| Mobile и backend | README и ближайший AGENTS.md соответствующего submodule; web frontend skills к ним не применять |

Здесь default branch задаёт корневой `AGENTS.md`; generic Git skills не содержат `master` или другого универсального значения. При нескольких checkouts framework/kit сначала сравни реальные commits. Политику согласованных версий между приложениями читай в submodule workflow, а порядок child → parent применяй по фактическому графу, включая desktop.

Не восстанавливай runtime version по старому имени скила. Для migration/cutover различай опубликованное состояние, dirty source и целевой контракт; спорное расхождение документации с кодом фиксируй с evidence.

## Структура общих правил

```text
.agents/skills/
  workflows/     task-route, development-workflow, audit-workflow
  git/           git-workflow, commit-changes, submodule-maintenance
  runtime/       dev-runtime
  engineering/   clean-code, code-formatting
  principles/    engineering-principles и 11 отдельных принципов
  frontend/      application, domain, framework unit, React component, UI kit
  contracts/     service-contracts, auth-session
```

Backend/mobile профиль берётся из локального контракта, пока отдельный переносимый стандарт такого слоя не установлен. Не объявляй web стандарт общим для другого слоя по совпадению слов Controller/Service/Module.

## Как поддерживать группы

- Общий скил описывает переносимое правило и связывает только нужные зависимости. Новый бренд, repo path, port или команда проекта добавляются в соответствующий проектный документ.
- Одна обязанность имеет одного владельца. Сценарий выбирает и координирует правила, профиль описывает структуру слоя, принципы помогают оценить инженерное решение.
- Для полной проверки принципов используй engineering-principles: вывод по каждому или конкретное ограничение. Не заявляй применение по одному перечислению имён.
- При изменении структуры проверь frontmatter, unique names, локальные ссылки и реальные сценарии выбора. Не меняй policy implicit invocation без запроса пользователя.

Подробные результаты перестройки: [skills-structure-audit.md](skills-structure-audit.md).
