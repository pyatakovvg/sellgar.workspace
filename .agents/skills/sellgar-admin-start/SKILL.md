---
name: sellgar-admin-start
description: >-
  Запускает полный локальный dev-контур Sellgar Admin по запросам «запусти
  админку», «подними admin UI» или «start admin»: проверяет уже работающие
  процессы, поднимает media Docker infra, необходимые backend services,
  gateways и frontend/sellgar.ui.admin в отдельных sessions. Использовать для
  запуска всего admin stack, а не для диагностики одного endpoint или изменения
  кода. Health/smoke выполнять дополнительно только по запросу.
---

# Запуск Sellgar Admin

## Область и приоритет

- Применяй этот скилл только когда пользователь просит запустить полный admin dev-контур.
- Для точечного service/UI запуска, health-check или bug diagnosis используй `sellgar-dev-runtime`.
- Перед запуском читай `agent/docs/README.md`, `agent/docs/dev-modes.md`, `agent/docs/dev-command-matrix.md`, `backend/service/sellgar.media.service/AGENTS.md` и `frontend/sellgar.ui.admin/AGENTS.md`.
- Сверяй каждую команду с актуальным `package.json` и ближайшим `AGENTS.md`; этот скилл задаёт порядок, а не заменяет repo-local source of truth.
- Запуск не разрешает sync submodules, dependency upgrade, изменение env contracts или очистку данных.

## Алгоритм

1. Из workspace root выполни `./agent/scripts/status-all.sh`.
2. Проверь listening ports, активные dev processes и Docker containers; переиспользуй корректно запущенные компоненты.
3. Проверь доступность RabbitMQ и media infra ports. Не останавливай существующего владельца порта без установления его назначения.
4. Подними отсутствующую media infrastructure из `backend/service/sellgar.media.service`.
5. Запусти отсутствующие backend services и gateways в отдельных долгоживущих sessions.
6. Дождись startup/readiness logs каждого нового процесса.
7. Запусти `frontend/sellgar.ui.admin` отдельной session и дождись URL Vite.
8. Сообщи состояние запуска. Не выполняй полный smoke/health-check, если пользователь просил только запуск.

## START — правила запуска

- **START-1.** Не запускай дубликат уже работающего service только ради единообразия списка.
- **START-2.** Не объединяй несколько `start:dev` в одну session: каждый процесс должен оставаться наблюдаемым и управляемым отдельно.
- **START-3.** Поднимай Docker infra командой из media service только после проверки конфликтов ports/containers:

```bash
cd backend/service/sellgar.media.service
docker compose up -d
```

- **START-4.** Не пересоздавай volumes, не очищай MinIO/CDN cache и не удаляй контейнеры при обычном запуске.
- **START-5.** Если package manager или dependency отсутствует, не изменяй lockfile и не выполняй upgrade. Сообщи blocker либо используй уже установленный exact package-manager binary.
- **START-6.** Оставляй успешно запущенные sessions активными после завершения turn, потому что результатом запроса является работающий dev-контур.

## Backend services

Запускай отсутствующие процессы текущими package scripts:

| Порядок | Рабочая директория                         | Команда                       |
| ------- | ------------------------------------------ | ----------------------------- |
| 1       | `backend/service/sellgar.identity.service` | `yarn start:identity_srv.dev` |
| 2       | `backend/service/sellgar.product.service`  | `yarn dev:product_srv`        |
| 3       | `backend/service/sellgar.store.service`    | `yarn start:dev`              |
| 4       | `backend/service/sellgar.shop.service`     | `yarn start:shop_srv.dev`     |
| 5       | `backend/service/sellgar.file.service`     | `yarn start:file_srv.dev`     |
| 6       | `backend/service/sellgar.media.service`    | `yarn start:dev`              |
| 7       | `backend/gateway/sellgar.admin.gateway`    | `yarn start:admin_gw.dev`     |
| 8       | `backend/gateway/sellgar.socket.gateway`   | `yarn start:dev`              |

Не запускай client gateway, desktop или mobile, если пользователь не расширил scope.

## Admin frontend

Запускай отсутствующий frontend process:

```bash
cd frontend/sellgar.ui.admin
yarn dev:admin_ui
```

## Expected runtime

| Компонент           | Endpoint                                          |
| ------------------- | ------------------------------------------------- |
| Admin UI            | `http://localhost:3000`                           |
| Admin gateway       | `http://localhost:4020`                           |
| Socket gateway      | `http://localhost:4040`                           |
| File service        | `http://localhost:5040`                           |
| Media service       | `http://localhost:5050`                           |
| Local CDN           | `http://localhost:8088`                           |
| MinIO API / console | `http://localhost:9000` / `http://localhost:9001` |

`identity`, `product`, `store` и `shop` могут быть RMQ-only и не обязаны иметь HTTP `/health`.

## VERIFY — готовность

- **VERIFY-1.** Для каждого нового process зафиксируй compile/startup result и connection failures.
- **VERIFY-2.** Для Vite зафиксируй фактический local URL.
- **VERIFY-3.** Не называй stack smoke-проверенным, если выполнен только startup.
- **VERIFY-4.** Запускай `./agent/scripts/health-check.sh full` и browser scenario только по отдельному запросу либо когда без них нельзя подтвердить успешный запуск.

## Завершение

Сообщи:

- какие containers и процессы уже работали;
- какие sessions были запущены;
- какие endpoints ожидаются;
- какие компоненты не запустились и почему;
- выполнялся ли health/smoke;
- что tracked files не изменялись, либо перечисли неожиданные изменения.
