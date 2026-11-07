---
name: ui-kit-component
description: >-
  Разрабатывает, рефакторит и проверяет общий web UI kit: components, runtime systems,
  icons, themes, public exports и visual contracts. Использовать для kit API и stories;
  не переносит сценарные бизнес-правила feature UI в общую библиотеку.
---

# UI kit

## Контекст и граница

Найди фактического владельца kit, public entrypoints, build/generation contract, ближайшие инструкции и consumers. Путь checkout, список exports и команды получай из библиотеки, а не из скила. Несколько приложений могут потреблять разные pinned версии одной библиотеки.

Для React-компонента используй [fe-react-component-structure](../fe-react-component-structure/SKILL.md), для оформления — [code-formatting](../../engineering/code-formatting/SKILL.md). Для feature-specific UI используй application/unit/component стандарты; kit не должен знать его controller, domain model и labels.

## Размещение и API

Выбирай owner по ответственности: visual component, общий runtime system, icons/assets, opt-in feature или theme. Имена каталогов определяет architecture библиотеки; не создавай все роли заранее.

Сохраняй публичный native/React contract: attributes, ref, events, semantics, controlled state и accessibility. Изменение API выполняй вместе с разрешёнными exports/consumers; установи breaking impact до кода и используй уже согласованный scope.

Внутренние children, hooks, styles и runtime implementation не раскрывай случайно. Для нового entrypoint проверь package exports, build и реального потребителя. Не добавляй тяжёлую opt-in возможность в основной entrypoint без требований.

## Визуальная и generated граница

Используй существующие design tokens и systems. Проверь, покрывает ли действующий component/system нужное поведение, прежде чем создавать альтернативу. Theme migration отделяй от локальной component-задачи по её scope.

Generation source меняй у владельца pipeline; generated outputs вручную не исправляй. Versioning generated artifacts определяется контрактом библиотеки. Stories меняй по запросу или как согласованную часть visual contract, соблюдая режим component skill.

## Проверка

Выполни локальные type/lint/format checks и применимый build. Изменение public API проверь в непосредственных consumers. Для визуального поведения собери browser/story evidence по реальным states: interaction, focus, disabled/loading, edge cases и необходимые viewports.

Если библиотека — отдельный repository/submodule, Git-фиксацию выполняй через [git-workflow](../../git/git-workflow/SKILL.md). Аудит остаётся read-only. Сообщи owner, API/consumer impact, проверки и непроверенные состояния.
