---
name: fe-module-create
description: >-
  Создаёт, изменяет и проверяет frontend framework-единицы с declaration, controllers,
  loader/action, локальными services/stores, bindings и view. Использовать для
  архитектуры таких единиц; конкретные API брать из выбранного framework. Не применять к
  backend или mobile.
---

# Framework-единица frontend

## Граница и runtime

Применяй этот стандарт к web frontend, использующему framework-единицы с отдельным declaration и предметными ролями. Сначала установи поддерживаемую модель по public API и инструкциям приложения. Не навязывай decorator, hook, controller interface или тип unit, отсутствующий в выбранном runtime.

Для application composition и Context/Provider используй [fe-application-structure](../fe-application-structure/SKILL.md), для domain — [fe-domain-structure](../fe-domain-structure/SKILL.md), для React-тела и локальных детей — [fe-react-component-structure](../fe-react-component-structure/SKILL.md). Оформление проверяй через [code-formatting](../../engineering/code-formatting/SKILL.md).

## UNIT — declaration и scope

- **UNIT-1.** Declaration содержит runtime metadata и подключение view/bindings/providers; бизнес-методы, сценарное состояние и HTTP принадлежат отдельным владельцам.
- **UNIT-2.** View-only единице не нужны искусственные controllers или bindings. При появлении предметного use case создай соответствующего владельца.
- **UNIT-3.** Экран, embedded block, вложенный workflow и layout имеют разные lifetime/params. Выбери поддерживаемую runtime-роль, а не имя из другого приложения.
- **UNIT-4.** Layout остаётся shell-композицией. Самостоятельный предметный сценарий вынеси к соответствующей единице или application runtime.

## STR — структура и приватные роли

Используй согласованную структуру владельцев:

```text
src/
  index.ts
  <name>.<unit>.ts(x)
  classes/
    classes.bindings.ts
    controller/
      <owner>/
        __test__/
        domain/
        dto/
        input/
        mapper/
        serializer/
        <owner>-controller.interface.ts
        <owner>.controller.ts
    service/
      <owner>/
    store/
      <owner>/
  providers/
    <owner>/
  view/
    <unit>.view.tsx
```

- **STR-1.** Создавай только нужные роли и каталоги. Service/store имеют такую же owner-структуру, как controller; их модели и преобразования находятся у них, а не в чужом controller.
- **STR-2.** `classes/` — private implementation единицы. Не добавляй агрегирующие фасады внутри него и не импортируй эти файлы из другого package.
- **STR-3.** Package facade экспортирует runtime declaration/token и только необходимый внешний контракт. Owned controllers, bindings, DTO, services и stores наружу не раскрывай.
- **STR-4.** Presentation-дети принадлежат view-ветке. Runtime Provider и React Context Provider — разные роли; их placement/lifecycle выбирает application owner.
- **STR-5.** Не создавай optional-каталоги заранее; после переноса удали опустевшие цепочки и переведи непосредственных consumers без параллельной legacy-системы.

## CTRL — сценарий и управление

- **CTRL-1.** У controller есть отдельный потребительский контракт и concrete implementation, подключённая механизмом выбранного framework.
- **CTRL-2.** Сгруппируй CRUD одного предметного объекта; независимые фильтры, справочные загрузки и другие роли не сваливай в общий controller всей страницы.
- **CTRL-3.** Loader/action и дополнительные команды имеют явные входы, результаты и эффекты. Используй фактические runtime argument types; тип implementation выводи из собственного контракта, когда это сохраняет точность.
- **CTRL-4.** Получай зависимости через принятые абстрактные ports и composition boundary. React hooks не вызывай в controller.
- **CTRL-5.** Controller владеет use case целиком: выбор операции, domain calls и предусмотренные успешные последствия. View не дублирует navigation, revalidation или закрытие workflow после submit.
- **CTRL-6.** Преобразуй ошибку только для предусмотренного восстановления, представления или изменения состояния. Учитывай отмену и сохраняй наблюдаемое HTTP/runtime поведение.
- **CTRL-7.** Состояние между вызовами и реактивно читаемые данные имеют установленного владельца/lifetime. Локальные значения одной операции не превращай в store.
- **CTRL-8.** Освобождай subscriptions, scopes, timers и ресурсы через lifecycle выбранного runtime.

## DATA — контракты и преобразования

- **DATA-1.** Возвращай domain Entity напрямую, если она полностью описывает результат. Для агрегата или локального сценарного состояния создай полноценную owned result-модель.
- **DATA-2.** Валидируй преобразуемые внешние/query данные на границе владельца. Owned Input/DTO/Entity находятся у того use case, которому принадлежат.
- **DATA-3.** Явный mapper нужен при различающихся моделях/смысле входа; он чистый, без I/O, времени, случайности и скрытых зависимостей. Не внедряй чистое преобразование через DI без необходимости.
- **DATA-4.** Serializer отвечает за transport format, а не бизнес-логику. SSR serialization выполняй по установленному runtime-контракту, не предполагая универсальную необходимость или её отсутствие.

## SERVICE / STORE / DI

- Локальный service выделяй для самостоятельной предметной операции или реального повторного use case, а не для одноразовой обёртки controller.
- Store хранит состояние; загрузка, сохранение и оркестрация принадлежат controller/service. Проверь scope и изоляцию экземпляров.
- Injectable роли имеют абстрактные contracts; регистрацию помещай в composition/bindings единицы. Не регистрируй уже предоставленную application-scoped зависимость повторно.
- Межмодульное взаимодействие использует разрешённый публичный механизм, а не внедрение private controller/service другой единицы.

## VIEW — связь с presentation

View читает результат и запускает команды через фактический framework API. Не помещай туда прямые HTTP/domain calls или регистрацию DI. Компонентные правила не проектируют недостающие controller/Context: владельца устанавливает application/unit слой.

Fallback/exception slots, params и providers подключай по поддерживаемому runtime-контракту. Required framework exports и entrypoints не оценивай как произвольные component facade.

## Проверка и аудит

Проверь declaration → bindings → controller/port → result → view и непосредственных consumers. Существующие или необходимые предметные tests проверяют вызовы, входы, результаты, ветвления, effects и lifecycle. Не создавай отдельные tests фасада или binding ради количества.

Запусти форматирование/check, lint, типы и релевантные tests; build и runtime scenario — по затронутому обещанию. При read-only аудите не записывай файлы. Каждое замечание содержит priority, rule/file:line, факт, последствие и точное исправление; укажи проверенные границы и ограничения.
