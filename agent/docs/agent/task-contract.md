# Task Contract For Agents

- Статус: current
- Назначение: зафиксировать scope перед реализацией, переносом сервиса или commit.

Этот шаблон нужен для задач, где легко получить "частично сделано": перенос сервисов, FE/BE contracts, runtime smoke, submodule pointer updates, cross-repo changes.

## Минимальный Контракт

```md
## Task

- Source: user request / incident / repo sync / migration
- Goal:
- Target repos:
- Target branch: master

## Scope

- In scope:
- Out of scope:
- Requires user confirmation before implementation: yes/no

## Investigation

- Evidence:
- Verdict:
- Next action:
- Implementation approved by / exact trigger:

## Required Reading

- Workspace route:
- Repo-local docs:
- Nearest AGENTS.md:
- Contract source:

## Acceptance

- User-visible behavior:
- Contract changes:
- Tests:
- Runtime/manual smoke:
- Docs:

## Red / Green Evidence

- Red command or scenario:
- Red failure reason:
- Green command:
- Broader verification:
- Manual smoke only, no saved test: yes/no + reason:

## Closeout

- Commands to run:
- Submodule pointer impact:
- Known residual risk:
```

## Правила

- Если задача началась как анализ, остановись на `Evidence`, `Verdict` и `Next action`. Реализация начинается только после явного "приступай", "делай" или аналогичного указания.
- Если меняется frontend/gateway/service contract, сначала найди реальный source of truth в актуальном коде, а не восстанавливай контракт по памяти.
- Не считать зеленый build доказательством acceptance, если требование связано с behavior, side effects, permissions, external calls, сохранением данных или browser flow.
- Если dependency install нужен, а пользователь должен ставить пакеты вручную, попроси его установить зависимости вместо попытки auto-install.
- Для submodule-задач commit в submodule и commit gitlink в workspace должны быть осознанно разделены.
