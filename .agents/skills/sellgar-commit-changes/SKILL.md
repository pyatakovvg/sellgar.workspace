---
name: sellgar-commit-changes
description: 'Коммитит изменения в Sellgar workspace по просьбам вроде "закоммить", "закоммить изменения", "сделай commit", "закоммить все", "commit and push": проверяет scope, dirty state, submodule boundaries, staged files, verification evidence, commit message и порядок submodule/root commits.'
---

# Sellgar Commit Changes

## Метаданные

```yaml
name: sellgar-commit-changes
description: Коммитит изменения в Sellgar workspace по просьбам вроде "закоммить", "закоммить изменения", "сделай commit", "закоммить все", "commit and push": проверяет scope, dirty state, submodule boundaries, staged files, verification evidence, commit message и порядок submodule/root commits.
id: sellgar-commit-changes
title: Sellgar Commit Changes
summary: Правила подготовки commit и push в Sellgar workspace.
triggers:
  - закоммить
  - закоммить изменения
  - сделай коммит
  - commit changes
  - commit and push
  - закоммить все
  - запушь
  - git commit
  - git push
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
```

Используй этот skill, когда пользователь просит подготовить commit, закоммитить изменения или закоммитить и запушить Sellgar workspace/submodule changes.

## Обязательное Чтение

Перед commit читай:

- `agent/docs/README.md`;
- `agent/docs/submodules-workflow.md`;
- `agent/docs/agent/closeout-gates.md`;
- ближайший `AGENTS.md` каждого repo/package, где есть изменения.

Если commit затрагивает незавершенную реализацию или scope не был зафиксирован, кратко восстанови task contract из `agent/docs/agent/task-contract.md`: goal, target repos, in/out of scope, acceptance, проверки.

## Scope Gate

Сначала выполни из workspace root:

```bash
./agent/scripts/status-all.sh
git status --short --branch
git submodule status
```

Затем в каждом dirty submodule проверь:

```bash
git status --short --branch
git diff --stat
git diff --check
git diff
```

Раздели изменения на:

- относящиеся к текущей задаче;
- уже существовавшие unrelated changes;
- generated/local/env output;
- submodule gitlink changes в workspace root.

Не добавляй unrelated changes молча. Если пользователь сказал "все", можно включать все dirty worktrees, но сначала проговори риск, если часть изменений явно не относится к текущей задаче или выглядит чужой.

## Когда Задавать Вопрос

Задай короткий вопрос перед commit, если:

- dirty state содержит несколько независимых задач, а пользователь не сказал "все";
- есть untracked files, и непонятно, generated это или нужные source files;
- есть изменения в submodule, который не связан с задачей;
- есть staged files, подготовленные не тобой, и они не совпадают с requested scope;
- проверки не запускались или упали, а пользователь просит commit без явного согласия на риск;
- commit message неоднозначен: нет понятного результата одним предложением.

Не спрашивай, если scope очевиден из текущей задачи и diff подтверждает его.

## Staging

В submodule stage только файлы этой задачи:

```bash
git add <paths>
git commit -m "<message>"
```

В workspace root stage только:

- измененные submodule paths, если нужно зафиксировать новые gitlinks;
- `agent/` docs/scripts или `.agents/skills`, если изменялась workspace agent инфраструктура.

Не коммить feature-code как обычные файлы в workspace root. Feature-code должен быть commit внутри соответствующего submodule.

## Commit Message

Пиши message коротко, на языке ближайшего контекста. В Sellgar допустимы оба стиля, но выбирай один осознанно:

- для feature/fix/refactor/chore удобно использовать conventional prefix;
- для workspace gitlink commits допустим короткий imperative summary без prefix, если так уже идет локальная история.

Формат по умолчанию:

```text
<type>: <краткий результат>
```

Где `type`:

- `feat` - добавлено user-visible поведение;
- `fix` - исправлен bug/regression;
- `refactor` - изменена структура без нового поведения;
- `docs` - документация;
- `chore` - lockfile, workspace pointers, scripts, maintenance.

Примеры:

```text
feat: добавить фрейм редактирования магазинов
fix: восстановить renew после параллельных запросов
refactor: align admin modify frames and store domain
docs: document store product read model
chore: update sellgar submodules
Update session renew and store UI submodules
```

Не используй vague messages вроде `fix`, `changes`, `update`, `wip`, если пользователь явно не просит checkpoint. Для checkpoint допустимо `chore: checkpoint <scope>`, но только если это осознанный промежуточный commit.

## Порядок Commit/Push

Если менялись submodules:

1. Commit внутри каждого dirty submodule.
2. Push каждого submodule commit, если пользователь просил push.
3. Вернись в workspace root.
4. Stage измененные submodule paths.
5. Commit workspace root gitlinks отдельным commit.
6. Push workspace root, если пользователь просил push.

Push order важен: сначала submodule, потом root, чтобы gitlink указывал на уже опубликованный SHA.

Если менялись только workspace docs/skills/scripts, commit делай только в workspace root.

## Проверки Перед Commit

Перед commit используй уже выполненные проверки задачи. Если их нет, подбери минимальные релевантные gates:

- docs/skills only: `git diff --check`;
- frontend UI: package build/typecheck или documented command + browser/manual smoke, если behavior менялся;
- backend: documented build/test для touched service/gateway;
- contract frontend/gateway/service: producer и consumer, build недостаточен;
- runtime behavior: exact URL/scenario/result.

Если пользователь просит срочно commit без проверок, можно commit after explicit consent, но финально укажи skipped checks и риск.

## Финальный Отчет

После commit/push сообщи:

- какие repos/submodules коммитились;
- commit SHA и message для каждого repo;
- workspace root commit/gitlink commit, если был;
- push status, если push просили;
- какие проверки запускались и результат;
- что осталось dirty/untracked и почему.

Если commit не сделан из-за вопроса или failed check, дай evidence и следующий точный action.
