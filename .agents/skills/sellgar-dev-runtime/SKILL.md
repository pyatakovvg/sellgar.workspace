---
name: sellgar-dev-runtime
description: >-
  Запускает, переиспользует и smoke-check локальный Sellgar runtime: backend
  services, gateways, admin UI, RabbitMQ-dependent flows, media service, MinIO,
  local CDN, health endpoints и browser scenarios. Использовать для start:dev,
  проверки локального endpoint, runtime-инцидента, upload/images/auth/events и
  manual browser evidence. Не использовать как разрешение изменять production
  code или перезапускать чужие процессы без диагностики.
---

# Sellgar Dev Runtime

## Область и приоритет

- Применяй этот скилл только к локальному runtime и smoke-проверкам Sellgar workspace.
- Перед запуском читай `agent/docs/README.md`, `agent/docs/dev-modes.md`, `agent/docs/dev-command-matrix.md` и ближайший `AGENTS.md` каждого запускаемого repo.
- Сверяй команды и порты с текущими package scripts и `.env`; не восстанавливай их по памяти.
- Для полного admin stack используй `sellgar-admin-start`. Для auth/session сценариев дополняй маршрут `sellgar-auth-session`.
- Диагностика runtime не разрешает автоматически исправлять код. Сначала отдели process/infra/config/contract failure от дефекта реализации.

## Алгоритм

1. Зафиксируй exact scenario, ожидаемый endpoint/UI path и наблюдаемую ошибку.
2. Из workspace root выполни `./agent/scripts/status-all.sh` и подходящий profile `./agent/scripts/health-check.sh`.
3. Проверь активные процессы, listening ports и Docker containers; установи владельца каждого занятого порта.
4. Выбери минимальный runtime mode, достаточный для сценария.
5. Переиспользуй уже запущенные корректные процессы. Запускай отсутствующие services в отдельных долгоживущих sessions.
6. Дождись readiness evidence: compile success, broker/storage connection, route mapping или listening port.
7. Выполни exact HTTP/API/browser scenario и сохрани status, headers, logs или UI observation.
8. Проверь, что запуск не изменил tracked source, lockfiles или env contracts.
9. Оставь требуемые пользователю sessions запущенными и перечисли их; временные диагностические процессы останови.

## STATE — начальное состояние

- **STATE-1.** Используй узкий health profile, когда задача касается одной зоны; `full` запускай для широкого runtime или по явному запросу.
- **STATE-2.** Не считай отсутствие HTTP health ошибкой RMQ-only service. Проверяй `identity`, `product`, `store` и `shop` по startup logs, consumers и сквозному gateway/UI сценарию.
- **STATE-3.** Не убивай процесс только из-за занятого порта. Сначала установи command, cwd и отношение процесса к пользовательской задаче.
- **STATE-4.** Не пересоздавай Docker volumes и не очищай storage/cache без явной необходимости и подтверждения.

## RUN — запуск

- **RUN-1.** Запускай каждый `start:dev` в отдельной долгоживущей session; не объединяй независимые services в один foreground command.
- **RUN-2.** Не запускай второй экземпляр service на том же порту, если существующий процесс соответствует текущему checkout и отвечает.
- **RUN-3.** Не изменяй dependency tree, lockfile или package manager version ради запуска. Если закреплённый package manager недоступен, используй уже установленный точный бинарник либо сообщи blocker.
- **RUN-4.** Если sandbox блокирует необходимое локальное соединение, повтори тот же in-scope запуск с явным escalation; не меняй application code для обхода sandbox.
- **RUN-5.** Для media path проверяй всю цепочку `browser/CDN :8088 → media :5050 → MinIO :9000 → file metadata/RMQ` в необходимом сценарию объёме.

## Частые entrypoints

| Компонент      | Рабочая директория                       | Ожидаемый local endpoint |
| -------------- | ---------------------------------------- | ------------------------ |
| Admin gateway  | `backend/gateway/sellgar.admin.gateway`  | `http://localhost:4020`  |
| Socket gateway | `backend/gateway/sellgar.socket.gateway` | `http://localhost:4040`  |
| File service   | `backend/service/sellgar.file.service`   | `http://localhost:5040`  |
| Media service  | `backend/service/sellgar.media.service`  | `http://localhost:5050`  |
| Admin UI       | `frontend/sellgar.ui.admin`              | `http://localhost:3000`  |
| Local CDN      | media Docker infra                       | `http://localhost:8088`  |
| MinIO console  | media Docker infra                       | `http://localhost:9001`  |

## VERIFY — smoke evidence

- **VERIFY-1.** Считай build только compile evidence. Для auth/session, persistence, upload, images, events, permissions и browser UI обязательно собирай runtime/manual evidence.
- **VERIFY-2.** Для HTTP фиксируй exact method, URL, status, relevant headers и response meaning; не выводи secrets, cookies или tokens.
- **VERIFY-3.** Для browser flow фиксируй URL, user steps, observed result и необходимость сохранённого automated test.
- **VERIFY-4.** Если инфраструктура отвечает, но объект отсутствует, различай `404`, authorization, metadata failure и upstream `5xx`; не лечи их одним frontend fallback.
- **VERIFY-5.** После запуска проверь `git status --short` в затронутых repositories и не оставляй generated output в task scope.

## Завершение

Укажи:

- переиспользованные и запущенные processes/containers;
- exact ports и URLs;
- smoke steps и observed result;
- sessions, оставленные запущенными;
- команды, которые не удалось выполнить, и точный blocker;
- изменённые файлы или `none`;
- residual risk.
