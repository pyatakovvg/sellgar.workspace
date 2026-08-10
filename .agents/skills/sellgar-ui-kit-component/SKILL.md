---
name: sellgar-ui-kit-component
description: >-
  Маршрутизирует разработку, рефакторинг и аудит web frontend UI kit
  @sellgar/kit в nested submodule frontend/sellgar.ui.admin/library/sellgar.kit.ui:
  core components/systems, overlays, controls, icons, feature entrypoints,
  themes, public exports, generated assets и visual evidence. Использовать при
  изменении kit component/API или Storybook scenario. Не применять к feature UI,
  backend, mobile и не редактировать generated output вручную.
---

# Sellgar UI Kit

## Область и приоритет

- Применяй этот скилл только к nested submodule `frontend/sellgar.ui.admin/library/sellgar.kit.ui` и published API `@sellgar/kit`.
- Перед изменениями читай workspace route, root `AGENTS.md` UI kit, перечисленные в нём architecture docs, ближайший local `AGENTS.md` и фактические source/stories.
- Читай только фактически существующие дополнительные документы, на которые ссылается UI kit `AGENTS.md`. Отсутствующую ссылку фиксируй как дефект документации и не придумывай файл или правила вместо неё.
- Проектируй внутреннюю структуру React-компонента по `fe-react-component-structure`, но считай более строгие UI-kit `AGENTS.md` и public API rules обязательными дополнениями.
- Не применяй этот скилл к feature-specific components admin UI; маршрутизируй их через `sellgar-admin-ui-routing`.

## Режимы

- **Разработка:** установи component role, family/system owner, public contract и visual states до кода.
- **Рефакторинг:** сохрани или явно измени public API вместе со всеми consumers/exports.
- **Аудит:** не изменяй код; проверяй ownership, component contract, accessibility, exports, generated boundaries и verification.
- **Storybook:** изменяй story/wiring только по явной задаче или когда это часть принятого public visual contract.

## Алгоритм

1. Отдели требуемое пользовательское поведение от предложенного способа реализации.
2. Найди существующий component/system/icon, public export и consumers по всему доступному frontend.
3. Определи owner slice: `core/components`, `core/systems`, `icons`, `features`, `shared` или `theme`.
4. Прочитай ближайший local `AGENTS.md`, architecture placement/public API docs и связанные stories.
5. Зафиксируй native/React contract, controlled state, accessibility, variants и breaking impact.
6. Реализуй минимальную абстракцию без feature-domain knowledge.
7. Обнови только необходимые public exports и consumers.
8. Выполни typecheck, применимый build и visual/browser evidence.

## PLACE — размещение

- **PLACE-1.** Размещай public visual components по пользовательскому смыслу в `src/core/components/<family>`.
- **PLACE-2.** Размещай общие runtime-механизмы нескольких components в `src/core/systems/<system>`.
- **PLACE-3.** Держи icon source/public API в `src/icons`; `icons` не импортирует `core`.
- **PLACE-4.** Размещай opt-in runtime features в `src/features/<feature>` с точечным entrypoint; не добавляй их в основной `@sellgar/kit`.
- **PLACE-5.** Держи общие внутренние styles/assets/utilities в `src/shared`; `shared` не импортирует `core`, `icons` или `features`.
- **PLACE-6.** Рассматривай `src/theme` отдельно от component/system refactoring и не смешивай theme migration с обычной component-задачей.
- **PLACE-7.** Не создавай новый primitive, пока существующий component/system не проверен на расширение без поломки контракта.

## API — публичная граница

- **API-1.** Основной API импортируется из `@sellgar/kit`; icons — из `@sellgar/kit/icons`; feature API — из `@sellgar/kit/features/<feature>`.
- **API-2.** Не вводи общий `@sellgar/kit/features` entrypoint.
- **API-3.** Не добавляй runtime features или generated icons в основной `src/index.ts`.
- **API-4.** Не создавай public entrypoint без проверки package exports, build contract и реального consumer.
- **API-5.** Не раскрывай internal child, hook, mapper, styles или system implementation через public API.
- **API-6.** При breaking contract покажи affected consumers и запроси подтверждение до изменения.

## GEN — generated и assets

- **GEN-1.** Не редактируй `dist`, `types`, generated icons и другие generated outputs вручную.
- **GEN-2.** Если задача меняет generation source или pipeline, используй documented generator и проверяй reproducible diff.
- **GEN-3.** Не добавляй generated output в commit, если package contract не требует его versioning.

## QUALITY — component quality

- **QUALITY-1.** Сохраняй native HTML semantics, refs, events и accessibility contract.
- **QUALITY-2.** Делай переиспользуемый state controlled, если локальный `AGENTS.md` не задаёт обоснованное исключение.
- **QUALITY-3.** Не добавляй feature-specific controller, domain model, labels или data source в kit abstraction.
- **QUALITY-4.** Используй design tokens и существующие kit systems; не маскируй недостаток API consumer-side `className/style` override.
- **QUALITY-5.** Не принимай предложенную реализацию без проверки фактического контракта, alternatives и risks.

## Проверка

Для source TypeScript/React changes из UI kit root выполни:

```bash
../../node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false
```

Для public API или integration с admin consumer дополнительно выполни из `frontend/sellgar.ui.admin`:

```bash
yarn build:admin_ui
```

В текущем UI kit `package.json` нет package-local `build` script. Не указывай `yarn build` как выполненную или доступную проверку, пока script фактически не появится; отмечай отсутствие package-local build отдельно. Storybook wiring не изменяй и Storybook build не требуй автоматически: используй его только по отдельной задаче или текущему package contract. Для visual behavior предоставь Storybook/browser evidence либо точную причину отсутствия.

## Завершение

- Перечисли component/system owner и public exports.
- Назови updated consumers и breaking/non-breaking verdict.
- Укажи typecheck/build/visual evidence и blocked checks.
- Подтверди отсутствие ручных generated-output изменений.
- Укажи nested submodule commit и parent gitlink impact.
