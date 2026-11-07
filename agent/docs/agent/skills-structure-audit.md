# Структурный аудит и переработка скилов

Дата: 2026-11-04. Scope: локальные `.agents/skills` и проектные entrypoints. Запрос: объединить правила по потребности и исключить из общих скилов названия/операционные детали проекта.

## Что обнаружено

До изменения каталог содержал 24 скила: 11 принципов, 3 frontend-стандарта, clean-code и 9 project-specific workflows. Ниже приведены места предыдущей версии; проектные скилы после переработки удалены либо заменены переносимыми.

| Место до изменения | Факт и последствие | Исправление |
|---|---|---|
| `sellgar-workspace-route`, алгоритм и ROUTE | Выбирает владельца repo, но не устанавливает обязательную композицию принципов, читаемости и оформления для разработки | task-route выбирает сценарий; development/audit явно подключают общую основу и профиль |
| 11 `principles/*` | Инструкции переносимы, но нет общего входа с критериями выбора и требуемым evidence | engineering-principles связывает все 11, полные тексты принципов сохранены |
| 9 скилов с project prefix | Общие правила смешаны с repo names, scripts, ports, branch и предметными owners | Общие роли перенесены в git/runtime/frontend/contracts; проектный контекст читается по skill-routing |
| commit SUB-2 и submodule STATE-5 | Nested chain описана через конкретные библиотеки и Admin, хотя у библиотеки могут быть другие родители | Git graph строится по реальным repositories/gitlinks; порядок не зависит от имени приложения |
| commit/submodule взаимные ссылки | Не определён единый координатор фаз commit/publish/pointer; повторное подключение может размывать режим | git-workflow координирует оба набора правил, различает commit-only, push-only, sync и checkout |
| clean-code FORMAT и component FORMAT | Есть советы/Prettier, но нет обязательного общего входа для проверки групп импортов, методов и смысловых блоков | code-formatting обязателен для разработки и аудита кода; использует конфигурацию целевого пакета |
| `fe-module-create` | Общий архитектурный стандарт закрепляет API одной framework-библиотеки | Сохранены роли/ownership; конкретные declaration/hooks/interfaces выбираются по public runtime contract |
| React PROP/STATE и запрет проектировать Context/view | Компонент требует готовый механизм, но application owner не выделен переносимым профилем | fe-application-structure отвечает за application data flow, Context/Provider, lifetime и SSR; component skill потребляет готовый контракт |
| admin UI routing | CURRENT/MIGRATION и пути implementation зашиты в общий workflow, что даёт второй источник изменяемого состояния приложения | Режим проверяется по локальным docs, manifests и коду; универсальная структура не знает версии runtime |
| runtime/admin-start и workspace harness | Startup readiness, точечный smoke и обязательный full-health смешиваются на разных уровнях | Один dev-runtime с отдельными режимами; проектный README уточнён по необходимому health profile |

Это структурные проблемы инструкций, не новые дефекты приложения. Одинаковые строки и длина скила сами по себе не считались нарушением.

## Итоговая композиция

28 скилов в 7 группах. Сценарные входы: task-route, development-workflow, audit-workflow, git-workflow и dev-runtime. Engineering, frontend, contracts и principles содержат применимые правила; детали одного правила не копируются в каждый сценарий.

Перенос/замены:

| Предыдущий скил | Теперь |
|---|---|
| workspace route | workflows/task-route |
| commit changes | git/commit-changes + координатор git/git-workflow |
| submodule maintenance | git/submodule-maintenance |
| dev runtime + admin start | runtime/dev-runtime; профиль конкретного stack — проектная документация |
| admin UI routing | frontend/fe-application-structure; реальные framework/migration сведения — repo docs |
| UI kit component | frontend/ui-kit-component |
| product/store/shop | contracts/service-contracts; предметные owners — проектная architecture |
| auth session | contracts/auth-session; конкретные transport/env names — contracts репозитория |
| clean-code | engineering/clean-code с сохранёнными references |
| 3 frontend-стандарта | frontend/*; framework-specific и presentation-package assumptions удалены |
| 11 принципов | прежние paths и содержимое; новый общий вход principles/engineering-principles |

Новые developer/audit workflows используют общий набор standards в разных режимах. Read-only аудит не запускает autofix. Git-фаза не добавляет feature edits, а runtime не добавляет sync/upgrade. Принципы читаются по применимости; системный аудит явно отражает все 11 результатов/ограничений.

## Проверки структуры и сценариев

Перед применением подготовлено отдельное дерево. Проверены frontmatter всех 28 SKILL.md, unique names и совпадение имени с каталогом, 113 локальных ссылок и metadata. Проверка на project-specific имена, пути и ports в общем дереве не нашла совпадений. После переноса проверки повторены на рабочем дереве; `git diff --check` проходит. Существующий staged index сохранён побайтно; все 11 текстов принципов и их metadata сохранены без изменений. Исходники и commits submodules этой задачей не изменялись.

Сценарии выбора для итогового review:

| Запрос | Ожидаемая композиция и граница |
|---|---|
| «Закоммить и запушь библиотеку с двумя приложениями» | git-workflow + commit + submodules; child publish → выбранные parent gitlinks → parents; без нового refactoring |
| «Запушь уже готовые commits» | Тот же граф в push-only режиме; новые content commits не подразумеваются |
| «Обнови clean submodules до указанных веток» | submodule maintenance update-to-ref; ветки/remote из запроса и repo, остальные checkouts сохранены |
| «Исправь загрузку каталога» | development + clean-code + principles selector + formatting; application/unit/domain по затронутой цепочке; runtime для поведения |
| «Проведи структурный аудит frontend» | audit + применимые frontend rules + principles + formatting check-only; отдельная карта охвата и категории findings |
| «Запусти админку» | dev-runtime + локальный stack profile; readiness, без обязательного full-smoke и sync |
| «Измени backend controller» | development + общие правила + локальный backend contract; web frontend standards не применяются |
| «Исправь один CSS-класс» | Узкая разработка с component/format rules; без формальной загрузки всех принципов и архитектурной миграции |

Эти сценарии проверяют согласованность инструкций; это не доказательство выполнения реальных commit/push/runtime действий и не независимый прогон другого агента.

## Ограничение механизма выбора

Папки организуют файлы, а композиция задаётся инструкциями сценарных SKILL.md. Согласно [официальной документации Codex](https://developers.openai.com/codex/skills), выбор скила может быть явным или основанным на description; полное содержимое читается при выборе. Это не гарантированный транзакционный dependency loader. Поэтому входные descriptions краткие, а обязательные и условные правила перечислены явно. Автоматический выбор не отключался; системная/пользовательская установка за пределами репозитория не менялась.

Эта работа меняет инструкции и документацию, а не feature-code, dependencies приложений, Git index или submodule commits. Runtime acceptance приложений не относится к её проверке.
