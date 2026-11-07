---
name: submodule-maintenance
description: >-
  Диагностирует и обслуживает Git submodules: init, записанные gitlinks, branch/HEAD,
  dirty state, sync, detached HEAD и вложенные связи. Использовать для submodule-задач;
  не считает checkout автоматически последней версией ветки.
---

# Submodules и gitlinks

## Инвентаризация

Прочитай действующие Git-инструкции, `.gitmodules` и фактические entries mode 160000. Проверь каждую разрешённую связь отдельно: parent commit/index gitlink, child HEAD/branch, dirty state, upstream и ahead/behind. При необходимости используй локальный inventory script, если его scope понятен.

Submodule фиксирует конкретный commit. Detached HEAD на ожидаемом gitlink — штатный checkout, а не ошибка. `.gitmodules` может задавать branch для remote update, но не заменяет записанный SHA. Ветку и remote не задавай универсальной константой.

## Выбор действия

- **Диагностика:** состояние без записи и перемещения pointers.
- **Init/checkout:** получить commits, уже записанные разрешёнными parent gitlinks; remote update сюда не входит.
- **Sync configuration:** синхронизировать настройки URLs/paths по `.gitmodules`; отличать от обновления commits.
- **Update to ref:** обновить разрешённый clean checkout до конкретной ветки/ref после получения актуального remote state.
- **Repair:** восстановить branch/detached relation с сохранением local commits и установленной целью.
- **Gitlink update:** записать выбранный child SHA в разрешённом parent.

Назови режим до изменения. Не запускай recursive remote update всего дерева при задаче об одном child. Перед switch/merge/rebase установи судьбу незакоммиченной работы и local commits; не clean/reset/restore поверх неё ради удобства.

## Вложенность и несколько родителей

Построй граф реальных repositories, включая nested submodules. Не выводи связи из названий папок. Для нескольких checkouts одного remote сравни HEAD и local work отдельно. Обновляй только родителей scope; требование согласованных версий между приложениями должно быть установлено из проектного контракта.

Порядок фиксации/публикации задаёт [git-workflow](../git-workflow/SKILL.md): child → parent, снизу вверх. Здесь не создавай content commit без запроса. Dirty child и изменённый parent gitlink — разные состояния, проверяй оба.

После действия сравни HEAD, parent index/commit и branch status. Сообщи изменившиеся pointers, сохранённые local commits и ограничения. При недоступном fetch не выдавай локальное перемещение за актуальный remote sync.
