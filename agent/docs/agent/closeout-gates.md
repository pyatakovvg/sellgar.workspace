# Agent Closeout Gates

- Статус: current
- Назначение: единый checklist перед commit, push или финальным ответом.

## Workspace Gate

```bash
./agent/scripts/status-all.sh
git status --short --branch
git submodule status
```

Проверить отдельно:

- текущая ветка соответствует задаче, по умолчанию `master`;
- `git status --short` разобран по ownership:
  - related changes to stage;
  - related changes intentionally left unstaged;
  - unrelated dirty files/submodules;
  - untracked/generated files;
  - submodule pointer changes;
- submodule pointer changes осознанны и перечислены в финальном ответе или commit/MR;
- untracked/generated files не попали в commit;
- workspace commit не содержит feature-code из submodules как обычные файлы.

## Documentation Gate

- Если менялся контракт между repos, обновлен workspace-level документ или ближайший `AGENTS.md`.
- Если менялся способ запуска, обновлены [../dev-modes.md](../dev-modes.md) или [../dev-command-matrix.md](../dev-command-matrix.md).
- Если менялся submodule workflow, обновлен [../submodules-workflow.md](../submodules-workflow.md).
- Документация не содержит machine-specific absolute paths из home directory, OS temp directory или конкретного checkout. Использовать repo-relative paths, workspace-root commands или placeholders вроде `<workspace-root>`.

## Test Gate

- Для bugfix есть red evidence или явно указано, почему его нельзя получить.
- Для runtime behavior запускался релевантный сервис или browser/manual smoke, а не только build.
- Для contract changes проверены обе стороны контракта: producer и consumer.
- Для UI behavior есть local/manual/browser evidence, если automated coverage отсутствует:
  - exact URL/page;
  - scenario steps;
  - observed result;
  - whether an automated test was added;
  - if no test was saved, why manual-only is acceptable.

## Final Evidence

Финальный ответ должен содержать:

- branch/status;
- changed files или `none`;
- commands run + result;
- commands skipped + reason;
- docs touched;
- submodule commits/gitlinks, если менялись;
- residual risk.
