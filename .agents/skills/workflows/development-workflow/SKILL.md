---
name: development-workflow
description: >-
  Комплексно применяет правила при разработке, исправлении, рефакторинге и миграции
  кода: качество, принципы, оформление и структуру изменяемого слоя. Не использовать для
  commit-only, read-only аудита или одного запуска приложения.
---

# Разработка

## Обязательная основа

До изменения кода открой:

- [clean-code](../../engineering/clean-code/SKILL.md) и справочник по затронутому риску;
- [engineering-principles](../../principles/engineering-principles/SKILL.md): выбери применимые принципы;
- [code-formatting](../../engineering/code-formatting/SKILL.md): установи правила оформления и исполняемые проверки.

Эти части дополняют друг друга: правильное размещение файла не заменяет читаемость, а formatter не доказывает корректность архитектуры.

## Профиль слоя

| Изменение | Подключить |
|---|---|
| Границы web frontend, host, маршруты, view и владение состоянием | [fe-application-structure](../../frontend/fe-application-structure/SKILL.md) |
| Frontend domain, ports, Entity, adapters, mapping | [fe-domain-structure](../../frontend/fe-domain-structure/SKILL.md) |
| Framework-единица frontend, controller, loader/action, bindings | [fe-module-create](../../frontend/fe-module-create/SKILL.md) |
| React-компонент web frontend и локальные дети | [fe-react-component-structure](../../frontend/fe-react-component-structure/SKILL.md) |
| Общий UI kit, его API или stories | [ui-kit-component](../../frontend/ui-kit-component/SKILL.md) плюс React-правила для React-кода |
| Межсервисный контракт, события, consistency | [service-contracts](../../contracts/service-contracts/SKILL.md) |
| Auth/session, cookies, renew и recovery | [auth-session](../../contracts/auth-session/SKILL.md) |
| Backend или mobile | Стандарт соответствующего слоя из локальной документации; web frontend-правила к нему не применять |

Открывай все профили действительно изменяемых границ, а не все строки таблицы. Конкретные framework API, пути packages и команды получай из действующего контракта репозитория.

## Работа и приёмка

Установи ожидаемое поведение и минимальную границу изменения, сохрани исходные пользовательские правки. При баге получи red evidence, если это соразмерно и воспроизводимо. При миграции назови source/target и наблюдаемые гарантии, которые нужно сохранить.

Реализуй законченную цепочку владельца и непосредственных потребителей. Не добавляй новые механизмы ради формального применения принципа. Автоматизируемое оформление проверь до завершения, смысловые границы просмотри вручную.

Проверяй изменённое обещание: типы, существующие релевантные тесты и локальные checks. Build нужен по контракту пакета или для затронутого production/generated поведения. Для изменения runtime/API/UI-сценария используй [dev-runtime](../../runtime/dev-runtime/SKILL.md) в необходимом объёме. Не создавай тест, зеркалящий реализацию, ради простой переформатировки.

Перечисли выполненные проверки и ограничения. При запросе commit/push после принятого результата переходи к [git-workflow](../../git/git-workflow/SKILL.md); без такого запроса не коммить автоматически.
