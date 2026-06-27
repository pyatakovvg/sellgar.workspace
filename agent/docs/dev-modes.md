# Режимы Разработки

Этот workspace является операционной точкой входа для локальной разработки Sellgar submodules.

Используй частичный режим, когда меняешь один сервис или UI и хочешь оставить остальной контур стабильным. Full local stack нужен для проверки end-to-end поведения.

## Перед Стартом

```bash
./agent/scripts/status-all.sh
cp .env.example .env
```

Если `.env.example` отсутствует или в submodule нужен свой `.env`, смотри ближайший `AGENTS.md` и `README.md` конкретного repo.

## Матрица Режимов

| Режим | Когда использовать | Команды | Основные URL |
|---|---|---|---|
| Только backend services | Проверяешь gateway/service contract без frontend | запуск нужных services из [dev-command-matrix.md](dev-command-matrix.md) | gateway `http://localhost:4020`, services по локальным портам |
| Media infra | Проверяешь upload/CDN/MinIO | `cd backend/service/sellgar.media.service && docker compose up -d` | MinIO `http://localhost:9001`, CDN `http://localhost:8088` |
| Admin UI + локальный backend | Проверяешь пользовательский сценарий в браузере | поднять backend services, затем `cd frontend/sellgar.ui.admin && yarn dev:admin_ui` | `http://localhost:3000` |
| Service-only | Меняешь один service | `yarn build`/`dotnet build`, затем локальный run service | порт сервиса из package docs |
| Workspace smoke | Нужно понять, что уже запущено | `./agent/scripts/health-check.sh full` | сводка health endpoints |

## Runtime Health Vs Build

Build доказывает только компиляцию. Для задач про сохранение данных, API contract, изображения, auth/session, upload или UI behavior нужен runtime smoke:

- какой сервис запущен;
- какой URL или endpoint проверялся;
- какие шаги выполнены;
- какой результат увиден;
- что осталось непроверенным.

`sellgar.identity.service` и `sellgar.product.service` сейчас работают как RMQ-only сервисы и не дают HTTP `/health`. Их работоспособность проверяется через успешный запуск, логи подписки на очередь и сценарий через gateway/frontend.

## Dependency Install

Если зависимости отсутствуют или lockfile требует обновления, а пользователь просил устанавливать вручную, остановись и попроси пользователя выполнить install/update в нужном repo. Не пытайся лечить dependency tree обходными командами.
