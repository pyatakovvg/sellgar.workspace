---
name: sellgar-ui-kit-component
description: Помогает работать с Sellgar UI kit components, @sellgar/kit, controls, overlays, icons, Storybook, public API и generated icons.
id: sellgar-ui-kit-component
title: Sellgar UI Kit Component
summary: Работа с компонентами и Storybook в Sellgar UI kit.
triggers:
  - UI kit
  - frontend/sellgar.ui.kit
  - "@sellgar/kit"
  - component
  - controls
  - overlays
  - icons
  - Storybook
  - public API
  - generated icons
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
---

# Sellgar UI Kit Component

## Метаданные

```yaml
name: sellgar-ui-kit-component
description: Помогает работать с Sellgar UI kit components, @sellgar/kit, controls, overlays, icons, Storybook, public API и generated icons.
triggers:
  - UI kit
  - frontend/sellgar.ui.kit
  - "@sellgar/kit"
  - component
  - controls
  - overlays
  - icons
  - Storybook
  - public API
  - generated icons
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
```

Используй этот skill перед правками в `frontend/sellgar.ui.kit`.

## Обязательное Чтение

Читай:

- workspace `agent/docs/README.md`, если стартуешь из `sellgar.workspace`;
- `frontend/sellgar.ui.kit/AGENTS.md`;
- ближайший component/package `AGENTS.md` внутри `library/kit/src`;
- `DOMAIN.md`, если он есть для complex components вроде formatted input или table.

## Правила

- Работай внутри `library/kit/src` для published kit source.
- Сохраняй public exports через `library/kit/src/index.ts`, когда меняется component API.
- Проверяй ближайший local `AGENTS.md` перед изменением component internals package.
- Не редактируй generated output вроде `dist/`, `types/` или generated icons, если задача явно не про generation output.
- Используй существующие kit systems для controls, floating overlays, layout, content, status, action, media и navigation перед добавлением new primitives.
- Считай Storybook практическим visual playground, когда меняется component behavior или visual state.

## Проверка

Используй команды из `frontend/sellgar.ui.kit/AGENTS.md` и package scripts:

```bash
yarn kit:build
yarn storybook:build
```

Для visual changes указывай Storybook/browser evidence или почему проверка не запускалась.
