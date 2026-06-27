# Sellgar Workspace Agent Entry

Начинай с [agent/docs/README.md](agent/docs/README.md). Этот файл выбирает минимальный маршрут под тип задачи: какие документы читать, какие submodules затрагивать и чем закрывать проверку.

Правила:

- Не открывай весь workspace без маршрута из `agent/docs/README.md`, если задача уже понятна по типу.
- Если задача требует реализации, но scope не зафиксирован, сначала заполни или кратко сформулируй task contract из `agent/docs/agent/task-contract.md`.
- Вся агентская документация и scripts лежат в `agent/`.
- Workspace root отвечает только за submodule pointers и минимальный входной указатель.
- Feature-code живет внутри submodules. Не коммить изменения приложений как обычные файлы в workspace.
- Специфическая документация приложения живет в репозитории этого приложения, рядом с его `AGENTS.md`/`README.md`.
- Для backend-задач после workspace route читай ближайший `AGENTS.md` в `backend/gateway/*` или `backend/service/*`.
- Для frontend/mobile-задач после workspace route читай ближайший `AGENTS.md` в соответствующем submodule, если он есть.
- Игнорируй `.idea/`, `.agents/`, `.codex/`, `node_modules/`, generated output и локальные env-файлы, если задача явно не про них.
- Все рабочие ветки процессов Sellgar по умолчанию ведутся через `master`, если пользователь не сказал другое.
