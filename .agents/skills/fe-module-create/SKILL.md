---
name: fe-module-create
description: >-
  Создаёт, изменяет, рефакторит и проверяет framework-единицы на основе
  @sellgar/app: Module, Frame, Widget и Layout; их declarations, controllers,
  loader/action use cases, локальные services и stores, owned DTO/Input/Entity,
  mappers, serializers, bindings, providers, lifecycle и взаимодействие с view.
  Использовать при разработке или аудите pages, frames, widgets и layouts,
  выборе владельца бизнес-логики, исправлении прямых запросов из view,
  проектировании controller contracts и приведении package к framework-модели.
---

# Framework-Единица `@sellgar/app`

## Область и приоритет

- Считать этот `SKILL.md` главным стандартом framework-единиц. Противоречащие legacy-код и документацию считать объектом исправления.
- Использовать документацию `@sellgar/app` только для framework-деталей, не определённых здесь. Не читать весь комплект документации без необходимости.
- Применять общий предметный слой к `Module`, `Frame` и `Widget`. Считать `Layout` ограниченным shell-вариантом по разделу `UNIT`.
- Передавать внутреннюю структуру React-компонентов скилу `fe-react-component-structure`, а domain-service и его контракты — `fe-domain-structure`.
- Не проектировать guards и `@UseGuards` этим скилом.

## Режимы

- **Разработка:** определить use case, владельцев, contracts и целевое дерево; создать минимально необходимую framework-цепочку.
- **Аудит:** только проверить соответствие и вывести отчёт по `AUDIT`; код не изменять.
- **Рефакторинг:** обновить всю затронутую цепочку одним изменением без legacy-дублей: declaration, classes, tests, bindings и view-потребителей.

## Алгоритм

1. Определить вариант единицы: `Module`, `Frame`, `Widget` или `Layout`.
2. Найти declaration, view, controllers, owned roles, providers, bindings, public facade и потребителей.
3. Для каждого use case определить одну предметную сущность controller, вход, результат и побочные эффекты.
4. Отделить CRUD `loader`/`action`, дополнительные пользовательские команды, вспомогательные controllers и общие локальные services.
5. Проверить направление `view → controller → injected port` и отсутствие межмодульных внутренних импортов.
6. Составить минимальное целевое дерево до создания файлов.
7. При рефакторинге обновить непосредственных потребителей, удалить legacy-файлы и каждый опустевший каталог.
8. Выполнить проверки из раздела `Завершение`, затем повторить аудит изменённых файлов.

## UNIT — варианты framework-единиц

- **UNIT-1.** Объявлять `Module`, `Frame`, `Widget` и `Layout` отдельным пустым class declaration. Не размещать в declaration методы, состояние, JSX и бизнес-логику.
- **UNIT-2.** Держать в declaration только framework metadata: `view`, `fallback`, `exception`, `providers`, source/config, layouts, shell, generic params и `@UseBindings`.
- **UNIT-3.** Разрешать view-only единицу без `classes/` и bindings. При появлении загрузки или use case создавать controller и bindings; не обращаться из view напрямую к domain-service.
- **UNIT-4.** Объявлять Widget как reusable runtime-блок через `@Widget` и `WidgetDefinition<TProps>`. Получать его props через widget runtime. Не создавать provider-widget, `widget.provider.tsx` и `widget.context.ts`: lifecycle Widget реализовывать runtime providers.
- **UNIT-5.** Объявлять Frame с типизированными params в frame token. Размещать runtime-валидируемый params class в `src/classes/params/frame.params.ts`; получать frame props только в controller через `FrameController*Args['props']`.
- **UNIT-6.** Считать Layout composition shell: `children`, view-композиция, widgets и layout-owned providers. По умолчанию не создавать в Layout `classes/`, controllers, loader/action и предметное состояние.
- **UNIT-7.** Не углублять Layout в самостоятельный business/runtime owner. Если shell требует предметного use case, сначала перенести его в Module, Frame, Widget либо application-level runtime.

## SRC — структура `src`

- **SRC-1.** Использовать общее допустимое дерево `src`. Создавать только фактически нужные optional-каталоги и файлы:

```text
src/
  index.ts
  <name>.<unit>.tsx
  classes/
    classes.bindings.ts
    <role>/
      <owner>/
        __test__/
        domain/
        dto/
        input/
        mapper/
        serializer/
        <owner>-<role>.interface.ts
        <owner>.<role>.ts
  providers/
    <owner>/
      index.ts
      <owner>.provider.ts
  view/
    <unit>.view.tsx
    default.module.scss
    <block>/
      index.ts
      <block>.tsx
      default.module.scss
  components/
    fallback/
      index.ts
      fallback.tsx
    exception/
      index.ts
      exception.tsx
  hooks/
    <name>.hook.ts
  constants/
    <unit>.constants.ts
```

- **SRC-2.** Называть declaration `{name}.module.tsx`, `{name}.frame.tsx`, `{name}.widget.tsx` или `{name}.layout.tsx`. Называть главный view строго `module.view.tsx`, `frame.view.tsx`, `widget.view.tsx` или `layout.view.tsx`.
- **SRC-3.** Считать `src/index.ts` единственным package facade. Не создавать агрегирующие `index.ts` непосредственно в `classes/`, `providers/`, `view/`, `components/`, `hooks/` и `constants/`. Не создавать фасады ни на одном уровне внутри `classes/`, включая `controller/<owner>`, `service/<owner>`, `store/<owner>` и их `domain`, `dto`, `input`, `mapper`, `serializer`: импортировать конкретные файлы напрямую. Создавать локальный `index.ts` только у presentation и runtime owners, которым нужен локальный компонентный контракт: `providers/preload`, `components/fallback`, `view/header` и аналогичных owner-каталогов.
- **SRC-4.** Не создавать `src/requests/`. Выполнять HTTP и domain operations из controller или local service через внедрённый port.
- **SRC-5.** Для Frame расширять общее дерево только необходимыми framework-ролями:

```text
src/
  classes/
    params/
      frame.params.ts
  shell/
    index.ts
    frame.shell.tsx
  layout/
    <name>/
      index.ts
      <name>.layout.tsx
      providers/
        <owner>/
          index.ts
          <owner>.provider.ts
      view/
        layout.view.tsx
```

- **SRC-6.** Считать frame-local Layout полноценным вложенным Layout-owner, но ограничивать его declaration, `view` и при необходимости `providers`. Не создавать в нём `components`, `hooks`, `constants` и предметные `classes`.
- **SRC-7.** Не добавлять `classes/` в Layout package. Разрешать Layout только declaration, `view`, package-level presentation `components`, React `hooks`, `constants` и layout-owned runtime `providers`.
- **SRC-8.** Разрешать package-level `components/fallback` и `components/exception` только Module, Frame и runtime Widget. Для Module считать оба слота частью целевого framework-контракта; отсутствие `fallback` в текущей версии `ModuleMetadata` считать дефектом framework, а не причиной переносить fallback во `view`. Layout и обычные React Provider-компоненты этими runtime-слотами не владеют.
- **SRC-9.** Использовать `src/components/` для package-level runtime slots и presentation components, общих нескольким view-веткам. Оставлять обычных локальных детей внутри их owner-ветки `src/view/`. Проектировать и проверять внутреннюю реализацию `fallback`, `exception` и остальных React-компонентов по `fe-react-component-structure`.
- **SRC-10.** Не создавать пустые каталоги, каталоги «на будущее» и параллельную legacy-структуру. После переноса удалять всю опустевшую цепочку каталогов.

## STR — структура и владельцы

- **STR-1.** Размещать локальную бизнес-логику в `src/classes/` по роли, затем по конкретному владельцу. Применять одинаковую внутреннюю структуру владельца к controller, service, store и любой другой предметной абстракции:

```text
classes/
  controller/
    product/
      __test__/
      domain/       # при наличии owned Entity
      dto/          # при наличии owned DTO
      input/        # при наличии owned Input
      mapper/       # при наличии owned Mapper
      serializer/   # при наличии owned Serializer
      product-controller.interface.ts
      product.controller.ts
  service/
    availability/
      __test__/
      domain/       # при наличии owned Entity
      dto/          # при наличии owned DTO
      input/        # при наличии owned Input
      mapper/       # при наличии owned Mapper
      serializer/   # при наличии owned Serializer
      availability-service.interface.ts
      availability.service.ts
  store/
    form/
      __test__/
      domain/       # при наличии owned Entity
      dto/          # при наличии owned DTO
      input/        # при наличии owned Input
      mapper/       # при наличии owned Mapper
      serializer/   # при наличии owned Serializer
      form-store.interface.ts
      form.store.ts
```

- **STR-2.** Создавать для каждой предметной абстракции отдельный каталог владельца, даже если пока существуют только interface, implementation и `__test__`. Запрещать плоские файлы controller, service, store и других абстракций непосредственно в каталоге их роли.
- **STR-3.** Считать каталог любой абстракции одинаковой owner-границей: её Entity размещать в `domain/`, DTO — в `dto/`, Input — в `input/`, Mapper — в `mapper/`, Serializer — в `serializer/`, tests — в `__test__/`. Правило одинаково для controller, service, store и любой новой роли внутри `classes/`.
- **STR-4.** Не переносить owned-роли одной абстракции в каталог другой. Service-owned mapper принадлежит `service/<owner>/mapper/`, store-owned serializer — `store/<owner>/serializer/`, controller-owned Entity — `controller/<owner>/domain/`.
- **STR-5.** Называть каталоги ролей в единственном числе: `controller`, `service`, `store`, `domain`, `dto`, `input`, `mapper`, `serializer`.
- **STR-6.** Не создавать optional-каталоги owned-ролей заранее. Запрещать пустые каталоги, неиспользуемые роли и параллельную legacy-структуру.
- **STR-7.** После переноса или удаления файлов удалять каждый ставший пустым каталог, включая опустевшую цепочку родителей.
- **STR-8.** Считать `classes/` полностью приватной реализацией framework-единицы. Запрещать deep imports и использование её абстракций другими packages.
- **STR-9.** Не создавать `index.ts` внутри `classes/` на уровне роли, владельца или owned-роли. Эти каталоги описывают внутреннюю структуру, а не фасады; все внутренние потребители должны импортировать interface, implementation, Input, DTO, Entity, Mapper и Serializer из конкретного файла.

## CTRL — controller

- **CTRL-1.** Создавать для каждого controller абстрактный `*ControllerInterface`, concrete class с `@Controller()` и DI-binding `Interface → Controller`.
- **CTRL-2.** Реализовывать соответствующий framework contract:
  - Module: `ControllerInterface`;
  - Frame: `FrameControllerInterface<TParams>`;
  - Widget: `WidgetControllerInterface<TProps>`.
- **CTRL-3.** Управлять одним предметным объектом и его CRUD одним controller. Не создавать общий controller всей единицы.
- **CTRL-4.** Создавать отдельные controllers для фильтров, справочных данных формы, select options и других независимых загрузок или команд.
- **CTRL-5.** Выражать CRUD по умолчанию через `loader` и `action`. Добавлять публичный метод только для инициированной пользователем команды той же сущности, не являющейся обычным CRUD.
- **CTRL-6.** Получать `loader` data через `useLoaderData`, запускать `action` через `useSubmit`, а дополнительный метод — через controller из `useController`.
- **CTRL-7.** Добавлять `ControllerLoaderArgs`, `ControllerActionArgs`, `FrameController*Args` или `WidgetController*Args` только когда метод действительно читает их данные.
- **CTRL-8.** В implementation выводить тип используемого аргумента из собственного interface: `Parameters<OwnerControllerInterface['loader']>[0]` или `Parameters<...['action']>[0]`.
- **CTRL-9.** Получать все domain и framework зависимости через constructor и `@Inject(AbstractPort)`. Не использовать React/framework hooks внутри controller.
- **CTRL-10.** Описывать в controller use case целиком: выбор create/update, вызовы services, mapping, navigation, frame close, revalidate, notifications и events.
- **CTRL-11.** Принимать в `submit()` payload формы. Не переносить в view выбор операции и успешные последствия use case.
- **CTRL-12.** Выполнять navigation внутри `action` через внедрённый navigation port. Закрывать Frame через `FrameServiceInterface.close()` внутри controller.
- **CTRL-13.** Вызывать `RevalidateServiceInterface` только когда обновление loader data требуется use case.
- **CTRL-14.** Показывать сценарные уведомления через внедрённый `NotificationServiceInterface` внутри controller.
- **CTRL-15.** Публиковать application events после успешной операции через `ApplicationEventBusInterface`, если это часть межмодульного контракта.
- **CTRL-16.** По умолчанию передавать ошибки framework error handling. Использовать `catch` только для восстановления, преобразования ошибки или требуемого изменения состояния.
- **CTRL-17.** Освобождать subscriptions, event scopes, timers и другие захваченные ресурсы в optional lifecycle-методе `dispose()` из `ControllerInterface`.
- **CTRL-18.** Предпочитать store состоянию, которое сохраняется между вызовами или реактивно читается потребителями. Оставлять временные значения одной операции локальными; для пограничного случая устанавливать владельца по use case.

## DATA — Input, DTO, Entity и преобразования

- **DATA-1.** Разрешать action payload как domain Input либо собственный Input controller.
- **DATA-2.** Если module Input и Input предметного service являются разными типами, всегда использовать явный mapper, даже при простом совпадении полей.
- **DATA-3.** Реализовывать mapper чистым статическим class без DI, состояния и binding. Размещать его в `mapper/` владельца.
- **DATA-4.** Размещать query DTO фильтра, поиска и сортировки в `dto/` соответствующего controller.
- **DATA-5.** Читать query state в `loader` через `LocationServiceInterface`, преобразовывать и валидировать owned DTO, затем передавать подготовленный аргумент предметному service.
- **DATA-6.** Возвращать domain Entity напрямую, когда она полностью описывает loader result.
- **DATA-7.** Для агрегата нескольких сущностей или дополнительных значений создавать controller-owned `ResultEntity` в `domain/` владельца.
- **DATA-8.** Делать локальную Entity полноценной runtime-моделью с `class-transformer` и `class-validator`.
- **DATA-9.** Перед возвратом локальной Entity выполнять `plainToInstance(ResultEntity, value)` и `validateOrReject(result)`.
- **DATA-10.** Размещать serializer в `serializer/` конкретного владельца и не использовать его как место бизнес-логики.

## SERVICE — локальные services

- **SERVICE-1.** Создавать local service, когда предметная операция используется несколькими controllers либо является самостоятельной локальной предметной абстракцией.
- **SERVICE-2.** Не выносить одноразовую orchestration из controller в service без отдельной ответственности.
- **SERVICE-3.** Оформлять DI-service абстрактным `*ServiceInterface`, concrete implementation и binding.
- **SERVICE-4.** Не импортировать local service другой framework-единицы.

## STORE — локальные stores

- **STORE-1.** Использовать store редко и только для хранения состояния: MobX observable store либо синхронный getter/setter holder.
- **STORE-2.** Не выполнять в store загрузки, сохранение, navigation, notifications и orchestration.
- **STORE-3.** Управлять моментом изменения store из controller или local service.
- **STORE-4.** Оформлять внедряемый store абстрактным `*StoreInterface`, implementation и binding.

## DI — bindings

- **DI-1.** Представлять каждый injectable token абстрактным class, чтобы допускать варианты реализаций. Не внедрять concrete classes напрямую.
- **DI-2.** Регистрировать controllers, local services, stores и другие injectable abstractions в единственном `src/classes/classes.bindings.ts`, реализующем `BindingModuleInterface`.
- **DI-3.** Подключать binding module к declaration через `@UseBindings`.
- **DI-4.** Не создавать binding module и не добавлять `@UseBindings`, если регистраций нет.
- **DI-5.** Не создавать binding и не внедрять mapper или serializer, если роль определена как чистый статический class.

## VIEW — framework-взаимодействие

- **VIEW-1.** Ограничивать view сбором пользовательского ввода, presentation и вызовом framework hooks.
- **VIEW-2.** Запрещать во view domain-service calls, HTTP, DI registration, business orchestration, navigation или frame close после успешного submit.
- **VIEW-3.** Читать loader result через `useLoaderData(ControllerInterface)`.
- **VIEW-4.** Передавать payload формы в `useSubmit(ControllerInterface)` без выполнения оставшейся части use case во view.
- **VIEW-5.** Получать controller через `useController` только для дополнительных публичных методов по `CTRL-5`.
- **VIEW-6.** Получать Widget props через widget runtime; не дублировать их отдельным публичным type export.
- **VIEW-7.** Не читать Frame params из route/location во view. Использовать loader result или frame runtime hooks только для presentation contract.
- **VIEW-8.** Проверять React-композицию, props, CSS Modules, локальные компоненты, `fallback` и `exception` скилом `fe-react-component-structure`.

## PROVIDER — providers и межмодульное взаимодействие

- **PROVIDER-1.** Использовать local Provider только для runtime lifecycle: preload, subscription, подключение внешнего runtime или shell-level process. Помечать его `@Provider()` и наследовать от `RuntimeProviderInterface<TProps>`.
- **PROVIDER-2.** Не размещать предметный use case в Provider; переносить его в controller или service.
- **PROVIDER-3.** Подключать provider в `providers: [...]` framework declaration владельца execution point.
- **PROVIDER-4.** Запрещать импорт и injection controller, local service или store другой framework-единицы.
- **PROVIDER-5.** Выполнять межмодульное взаимодействие через providers либо application events.
- **PROVIDER-6.** Размещать каждый local Provider только в собственной owner-папке `src/providers/<owner>/` с локальным `index.ts`. Запрещать плоские provider-файлы непосредственно в `providers/` и общий `providers/index.ts`.
- **PROVIDER-7.** Не размещать локальный `@SingletonProvider()` в Module, Frame, Widget или Layout. Выносить singleton runtime owner на application/library level.
- **PROVIDER-8.** Не помещать React Context Provider в `src/providers/`: этот каталог принадлежит только runtime providers `@sellgar/app`.
- **PROVIDER-9.** Реализовывать только необходимые lifecycle phases `setup`, `beforeLoad`, `beforeRender`, `afterRender` или `onDemand`. Читать runtime props из `RuntimeProviderContextInterface<TProps>` только когда они нужны конкретной фазе.
- **PROVIDER-10.** Возвращать из lifecycle phase cleanup-функцию для каждой созданной subscription, listener, timer или другого захваченного ресурса. Не создавать отдельный controller-style lifecycle для provider.

## API — публичная граница

- **API-1.** Экспортировать из `src/index.ts` framework token/declaration единицы и только реально необходимый внешний runtime contract.
- **API-2.** Никогда не экспортировать controllers, local services, stores, owned DTO/Input/Entity, mappers, serializers и bindings.
- **API-3.** Не экспортировать Widget props отдельно: выводить их из `WidgetDefinition<TProps>` в `WidgetHost`.
- **API-4.** Не экспортировать Frame params отдельно: выводить их из frame token при `useFrame(...).open(...)`.
- **API-5.** Экспортировать Layout package только через layout token; не раскрывать его view и локальные блоки.
- **API-6.** Запрещать legacy exports и внешние deep imports во внутренние каталоги package.
- **API-7.** Разрешать local Provider как исключение из приватности внутренних реализаций: экспортировать его через `src/index.ts` только когда другая framework-единица фактически подключает provider в своём `providers: [...]`. Не экспортировать provider заранее.

## TEST — предметные тесты

- **TEST-1.** До требования или создания теста подтвердить, что предметная абстракция обоснована целевым use case и остаётся после разработки или рефакторинга. Если controller, service, store или другой владелец избыточен, дублирует framework-механику либо должен быть удалён или объединён, сначала исправить модель и не создавать тест для legacy-абстракции.
- **TEST-2.** Создавать unit-тест для каждой подтверждённой предметной абстракции, остающейся в `classes/`: controller, local service, store и другого владельца логики.
- **TEST-3.** Размещать тест в `__test__/` внутри каталога тестируемой абстракции.
- **TEST-4.** Тестировать даже простой pass-through controller: его вызов зависимости, вход, результат и framework contract.
- **TEST-5.** Проверять ветвления, mapping, порядок координации и побочные эффекты: navigation, close, revalidate, notification и events.
- **TEST-6.** Не создавать tests для providers, bindings и фасадов. Обязательное покрытие этого раздела относится только к подтверждённым предметным абстракциям внутри `classes/`.

## AUDIT — аудит соответствия

Проверить:

1. Вариант единицы, declaration и отсутствие логики в framework class.
2. Полное дерево `src/`, unit-specific роли, локальные владельцы, фасады и отсутствие пустых каталогов.
3. Controller interfaces, framework contracts, loader/action и дополнительные методы.
4. Полноту use case, DI dependencies, lifecycle и error handling.
5. Input/DTO/Entity, mapping, query parsing и runtime validation.
6. Bindings, owner-структуру providers, public facade и отсутствие межмодульных внутренних импортов.
7. View hooks, runtime slots `fallback`/`exception`, делегирование React-проверки и отсутствие business/domain work во view.
8. Обоснованность каждой остающейся предметной абстракции и наличие её unit-теста; отсутствие tests для удаляемого legacy не считать нарушением.
9. Результаты Prettier, lint, TypeScript, tests и применимого build.

Назначать приоритет:

- `critical` — повреждение данных, нарушение runtime/lifecycle или повторное выполнение опасного use case;
- `high` — бизнес-логика во view/declaration, обход controller, неверная DI-граница, межмодульный внутренний импорт, отсутствие runtime validation или обязательного теста;
- `medium` — неверный владелец, роль, структура, binding, public export или неполная orchestration;
- `low` — naming, facade extension, formatting и локальное формальное несоответствие без влияния на границу.

Перед списком вывести сводку по приоритетам и rule IDs. Каждое нарушение выводить отдельно:

```text
<PRIORITY> | <RULE-ID> | <file:line> | <фактическое нарушение> | <точное исправление>
```

При аудите не изменять код. Если проверка заблокирована внешней ошибкой или конфигурацией, отметить её заблокированной и не приписывать ошибку целевой единице.

## Завершение

1. Проверить diff и оставить только framework-единицу, непосредственных потребителей и необходимые внешние contracts.
2. Удалить опустевшие каталоги в каждой затронутой границе.
3. Запустить Prettier для затронутых файлов.
4. Запустить lint и TypeScript-проверку package.
5. Запустить unit-тесты подтверждённых предметных абстракций в `classes/`.
6. Запустить build, если он определён package или нужен для проверки runtime-контракта.
7. Повторить `AUDIT` для изменённых файлов.
8. Перечислить изменённые файлы, команды, результаты и заблокированные проверки с точной причиной.
