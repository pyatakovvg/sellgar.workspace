---
name: sellgar-workspace-route
description: >-
  Маршрутизирует задачи в Sellgar workspace между workspace root, git
  submodules, backend, web frontend, mobile и профильными skills; фиксирует task
  contract, scope, dirty-state ownership, acceptance и closeout. Использовать
  первым для cross-repo изменений, неизвестного владельца, реализации из
  workspace root, диагностики, runtime, submodule и commit workflows. Не
  заменяет repo-local архитектурные правила и не является разрешением менять все
  затронутые слои.
---

# Маршрут Sellgar Workspace

## Область и приоритет

- Применяй этот скилл как первый слой маршрутизации из Sellgar workspace root.
- Используй `agent/docs/README.md` как индекс минимального маршрута и читай только документы, необходимые для типа задачи.
- После workspace route обязательно читай ближайший `AGENTS.md` каждого затронутого submodule и package.
- Не используй этот скилл как архитектурный стандарт feature-code. Передавай реализацию профильному repo/domain/frontend/mobile skill.
- Явный пользовательский scope ограничивает работу; обнаруженная зависимость не расширяет разрешённые изменения автоматически.

## Режимы

- **Диагностика:** собери evidence, verdict и next action; не изменяй код без явного запроса на исправление.
- **Реализация:** зафиксируй task contract, владельцев, in/out of scope и acceptance до правок.
- **Runtime:** передай запуск и smoke skill `sellgar-dev-runtime`; полный admin stack — `sellgar-admin-start`.
- **Commit:** передай staging, commit и push skill `sellgar-commit-changes`.
- **Submodules:** передай sync, detached state и gitlinks skill `sellgar-submodule-maintenance`.

## Алгоритм

1. Определи тип запроса: анализ, реализация, runtime, auth, commerce, frontend, mobile, submodule или commit.
2. Прочитай `agent/docs/README.md` и выбери минимальный документальный маршрут.
3. Выполни `./agent/scripts/status-all.sh`, если задача может изменять файлы, submodules или runtime state.
4. Определи target repositories, текущие branches, существующий dirty state и владельца каждого изменения.
5. Для реализации кратко зафиксируй task contract по `agent/docs/agent/task-contract.md`.
6. Подключи только профильные skills и ближайшие `AGENTS.md` для реально затрагиваемых границ.
7. Реализуй или диагностируй в рамках установленного scope.
8. Выполни closeout по `agent/docs/agent/closeout-gates.md` и перечисли доказательства, пропуски и residual risk.

## ROUTE — выбор владельца

- **ROUTE-1.** Оставляй в workspace root только submodule pointers, `.agents/skills`, `agent/docs`, `agent/scripts` и минимальные workspace entrypoints.
- **ROUTE-2.** Размещай backend feature-code в соответствующем `backend/gateway/*` или `backend/service/*` submodule.
- **ROUTE-3.** Размещай admin web frontend в `frontend/sellgar.ui.admin` и начинай с `sellgar-admin-ui-routing`.
- **ROUTE-4.** Размещай desktop frontend в `frontend/sellgar.ui.desktop` и читай его ближайший `AGENTS.md`.
- **ROUTE-5.** Размещай mobile code в `mobile/sellgar.mobile`; frontend skills с областью web frontend к нему не применяй.
- **ROUTE-6.** Для product/store/shop ownership используй `sellgar-product-store-shop` и актуальный service owner.
- **ROUTE-7.** Для auth/session границ используй `sellgar-auth-session`.
- **ROUTE-8.** Не коммить feature-code submodule как обычные файлы workspace root.

## SCOPE — task contract и изменения

- **SCOPE-1.** Фиксируй goal, target repos, branch, in/out of scope, acceptance, проверки и submodule pointer impact.
- **SCOPE-2.** Используй `master` как default branch, если пользователь не задал другую.
- **SCOPE-3.** Отделяй related changes от существовавших unrelated, generated, local и env файлов. Не присваивай чужие изменения.
- **SCOPE-4.** Если новый владелец или изменение внешнего контракта расширяет task scope, остановись и запроси направление до записи в дополнительный repo.
- **SCOPE-5.** Не изменяй production-код ради прохождения теста. Исправляй production только по пользовательскому поведению и реальному контракту; тест должен проверять этот контракт.
- **SCOPE-6.** Не считай build доказательством runtime behavior, persistence, permissions, side effects, external calls или browser flow.

## VERIFY — доказательства

- **VERIFY-1.** Для contract change проверяй producer и каждого изменённого consumer.
- **VERIFY-2.** Для bugfix сохраняй red evidence либо указывай точную причину, почему его нельзя получить.
- **VERIFY-3.** Для runtime/UI behavior указывай exact URL или command, шаги, наблюдаемый результат и оставшийся риск.
- **VERIFY-4.** Не приписывай целевой задаче ошибку проверки из внешнего или уже повреждённого файла; отмечай проверку заблокированной с evidence.

## Завершение

Выполни либо явно пропусти с причиной:

```bash
./agent/scripts/status-all.sh
git status --short --branch
git submodule status
```

В финальном отчёте укажи:

- branch и изменённые repositories/files;
- выполненные команды и результаты;
- пропущенные или заблокированные проверки;
- docs и skills, изменённые вместе с контрактом;
- submodule commits и gitlink impact;
- residual risk и следующий action, если задача не завершена.
