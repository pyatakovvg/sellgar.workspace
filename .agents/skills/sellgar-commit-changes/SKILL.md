---
name: sellgar-commit-changes
description: >-
  Подготавливает и выполняет commit или commit-and-push в Sellgar workspace по
  запросам «закоммить», «закоммить все», «сделай commit», «commit and push» или
  «запушь»: инвентаризирует dirty/staged state, отделяет scope, проверяет
  submodule boundaries и evidence, выбирает message и соблюдает порядок nested
  submodule → parent → workspace gitlink. Не изменяет feature-code ради commit и
  не выполняет push без явного запроса.
---

# Commit изменений Sellgar

## Область и приоритет

- Применяй этот скилл только после явного запроса на commit или push.
- Commit-разрешение не является разрешением исправлять, форматировать, удалять или переписывать production-code. Для новых правок требуется текущий implementation scope.
- Перед commit читай `agent/docs/README.md`, `agent/docs/submodules-workflow.md`, `agent/docs/agent/closeout-gates.md` и ближайший `AGENTS.md` каждого dirty repo/package.
- Если task contract потерян, восстанови goal, target repos, in/out of scope, acceptance и проверки по `agent/docs/agent/task-contract.md`.
- Push выполняй только когда пользователь явно попросил push.

## Алгоритм

1. Из workspace root выполни `./agent/scripts/status-all.sh`, `git status --short --branch` и `git submodule status`.
2. В каждом dirty repository проверь branch, staged/unstaged/untracked state, `git diff --stat`, `git diff --check`, unstaged diff и staged diff.
3. Классифицируй каждый файл: related, unrelated pre-existing, generated/local/env, nested gitlink или workspace gitlink.
4. Сопоставь изменения с task acceptance и уже выполненными verification gates.
5. При неоднозначном scope остановись и задай один короткий вопрос до staging.
6. Stage только exact paths подтверждённого scope.
7. Commit от самых вложенных repositories к родителям.
8. Если requested, push каждый submodule commit до commit/push parent gitlink.
9. Повтори status во всех затронутых repositories и подготовь финальный отчёт.

## SCOPE — границы commit

- **SCOPE-1.** Не добавляй unrelated changes молча. Сохраняй существовавшие пользовательские изменения, даже если они находятся рядом с task files.
- **SCOPE-2.** Запрос «закоммить все» включает все осознанные source/docs changes во всех dirty worktrees, но не включает secrets, local env, caches, build output и случайные generated artifacts.
- **SCOPE-3.** Если «все» объединяет явно независимые или подозрительно чужие задачи, сначала покажи группы и риск; не угадывай ownership.
- **SCOPE-4.** Не используй broad staging workspace root, если exact paths известны. Проверяй staged diff после `git add`.
- **SCOPE-5.** Не удаляй и не восстанавливай файл только для очистки commit scope без явного понимания владельца изменения.
- **SCOPE-6.** Не меняй production-code ради зелёного теста, lint или typecheck. Если gate падает, зафиксируй evidence и запроси отдельное исправление либо явное согласие на commit с риском.

## SUB — submodules и gitlinks

- **SUB-1.** Коммить feature-code внутри repository соответствующего submodule.
- **SUB-2.** Для nested `sellgar.kit.ui`, `sellgar.orm.ui` или `sellgar.app.ui` сначала commit/push nested repo, затем gitlink в `sellgar.ui.admin`, затем workspace pointer.
- **SUB-3.** Не stage workspace gitlink, если submodule commit не создан осознанно или parent не должен фиксировать этот SHA.
- **SUB-4.** Не смешивай feature commit submodule и workspace gitlink update в одном repository: это разные commits разных repos.
- **SUB-5.** При push сначала публикуй child commit, затем parent, чтобы каждый gitlink указывал на доступный SHA.

## CHECK — verification gate

- **CHECK-1.** Используй evidence текущей задачи; не перезапускай дорогие проверки без причины.
- **CHECK-2.** Для docs/skills-only минимум выполни validation конкретного формата и `git diff --check`.
- **CHECK-3.** Для frontend/backend используй documented package checks; для runtime или contract behavior одного build недостаточно.
- **CHECK-4.** Если проверка падает только во внешнем файле или из-за tooling/config, пометь её заблокированной и не приписывай ошибку target scope.
- **CHECK-5.** Если пользователь явно разрешает commit с failed/skipped check, зафиксируй точный риск в финальном отчёте.

## MSG — commit message

- **MSG-1.** Описывай полученный результат, а не процесс работы.
- **MSG-2.** Используй короткий формат `<type>: <результат>`, если история repo не задаёт иной устойчивый стиль.
- **MSG-3.** Выбирай `feat`, `fix`, `refactor`, `docs` или `chore` по фактическому diff.
- **MSG-4.** Не используй `fix`, `changes`, `update` или `wip` без содержательного результата; checkpoint допустим только по явному запросу.

Примеры:

```text
fix: восстановить renew после параллельных запросов
refactor: привести admin frames к framework-модели
docs: уточнить границы workspace skills
chore: update sellgar submodules
```

## Когда остановиться

Остановись до commit, если:

- scope содержит несколько независимых задач без разрешения «все»;
- staged changes подготовлены не тобой и не совпадают с task scope;
- untracked file невозможно классифицировать;
- обнаружен secret или local env;
- required check упал, а согласия на риск нет;
- нельзя сформулировать честный message результата.

## Завершение

После commit/push сообщи:

- repository, SHA и message каждого commit;
- push status каждого repository;
- workspace/nested gitlink commits;
- проверки и результаты;
- skipped/failed gates и риск;
- оставшийся dirty/untracked state и его ownership.
