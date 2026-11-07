---
name: git-workflow
description: >-
  Комплексно выполняет Git-задачи: commit, push, submodules, gitlinks и синхронизацию.
  Использовать по запросам управления Git; определяет граф repositories и подключает
  правила состояния и публикации без автоматического изменения feature-code.
---

# Git workflow

## Состав группы

Для commit/push открой [commit-changes](../commit-changes/SKILL.md). Если repository содержит submodules или сам является submodule, также открой [submodule-maintenance](../submodule-maintenance/SKILL.md) в режиме диагностики. Для sync/init/repair основным исполнителем является submodule-maintenance; commit-changes нужен только для запрошенных commits.

Это одна композиция правил, а не два взаимно вызывающих workflow. Повторное чтение уже применённого документа не требуется.

## Режим и scope

Различай «commit», «push готовых commits», «commit и push», «обновить submodules до веток» и «checkout записанных gitlinks». Ни один режим не подразумевает остальные. Источник ветки, remote, branch policy и проектных pointer-инвариантов — запрос пользователя и локальный repository contract.

Инвентаризируй целевые repositories: branch/HEAD/upstream, staged/unstaged/untracked, ahead/behind и relation с parent gitlink. Определи content scope и родительские pointers, которые должны его зафиксировать. Сохрани пользовательские изменения вне scope.

## Граф публикации

Построй фактические связи child → parent по `.gitmodules` и Git index, включая вложенные уровни. Одна библиотека может иметь несколько checkouts и несколько родителей; совпадение имени каталога не доказывает одинаковый HEAD.

При commit-and-push обрабатывай граф снизу вверх:

1. Проверь и закоммить разрешённое содержимое child; установи окончательный SHA.
2. Опубликуй child commit в разрешённый remote/ref и получи evidence успешной публикации.
3. Установи этот SHA в разрешённых parent checkouts и проверь, что их gitlinks фиксируют именно его.
4. Закоммить и опубликуй parent; повтори для следующего уровня до корня scope.

Не публикуй parent, пока его новые child commits недоступны из предусмотренного remote. При commit-only порядок тот же, но публикация не выполняется; явно укажи непубликованные зависимости. При push-only сначала проверь уже записанный граф commits, не создавай новые content commits автоматически.

Требование «последние hashes веток» означает отдельную проверку целевых remote refs. При разрешённом обновлении получи актуальные refs, сравни их с HEAD/gitlinks и выполни только согласованный безопасный sync. Не заменяй выбранный SHA «последним» молча и не используй универсальную ветку по памяти.

## Завершение

Проверь child HEAD, parent gitlink и commit/push status на каждом уровне. Сообщи repositories, SHA, remote/ref, оставшийся dirty state и непубликованные зависимости. Source checks переиспользуй из текущей задачи, если evidence актуально. Git-фаза не разрешает исправлять код ради прохождения gate.
