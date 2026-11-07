---
name: commit-changes
description: >-
  Подготавливает и выполняет запрошенные commit и push: отделяет content scope,
  проверяет staged diff, выбирает message и фиксирует результат. Использовать для
  commit/push; порядок submodules координирует git-workflow.
---

# Commit и push

## Граница

Commit выполняй по запросу пользователя; push — когда он также разрешён. Учитывай уже данную авторизацию, не запрашивай её повторно. Запрос на commit не разрешает менять feature-code, formatter configuration или dependency tree.

Перед записью прочитай локальные Git/commit-инструкции. Установи цель, repositories и exact paths. Если есть submodules, используй порядок из [git-workflow](../git-workflow/SKILL.md), не предполагая их глубину или имена.

## Подготовка

Проверь `git status --short --branch`, unstaged/staged diff, `git diff --check`, untracked files и актуальные verification results. Классифицируй изменения: текущая задача, пользовательские прежние правки, local/generated output и gitlinks.

«Закоммить всё» включает осознанные изменения в разрешённых repositories, но не secrets, local env и случайные build artifacts. Если исходный запрос и контекст уже определяют scope, не устраивай новое согласование. При реальной неоднозначности независимых задач получи недостающую границу до staging.

Stage exact paths и прочитай staged diff после добавления. Существующий index пользователя не сбрасывай. Feature-code коммить в repository владельца; parent хранит gitlink, а не копию файлов child.

## Проверки и message

Используй актуальные проверки выполненной задачи. Для docs/skills проверь формат, ссылки и `git diff --check`; для кода — нужные package checks. Не перезапускай дорогие сценарии без причины и не исправляй чужой код ради зелёного gate. Failed required check обозначь с точным evidence и разрешённым следующим действием.

Message описывает полученный результат. Соблюдай действующий repository style; при его отсутствии подойдёт краткое `<type>: <результат>`. Один repository commit может объединять связанную реализацию, но не скрывать независимые задачи под «update».

## Публикация

Проверь целевой remote/ref и состояние ahead/behind. При отказе push установи причину. Не применяй force, reset или rebase как автоматический обход; отдельно учти разрешённую стратегию и чужие commits.

После commit/push сообщи SHA, message, публикацию и оставшиеся правки. Не объявляй цепочку опубликованной по успеху только верхнего repository.
