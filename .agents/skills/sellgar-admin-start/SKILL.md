---
name: sellgar-admin-start
description: 'Запускает полный dev-контур Sellgar admin по просьбам вроде "запусти админку": нужные Docker/infra зависимости, все backend services в dev mode и frontend/sellgar.ui.admin.'
id: sellgar-admin-start
title: Sellgar Admin Start
summary: Запуск админки Sellgar со всеми нужными dev services.
triggers:
  - запусти админку
  - подними админку
  - запусти admin UI
  - подними admin UI
  - запусти sellgar.ui.admin
  - sellgar.ui.admin
  - dev admin
  - start admin
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
---

# Sellgar Admin Start

## Метаданные

```yaml
name: sellgar-admin-start
description: 'Запускает полный dev-контур Sellgar admin по просьбам вроде "запусти админку": нужные Docker/infra зависимости, все backend services в dev mode и frontend/sellgar.ui.admin.'
triggers:
  - запусти админку
  - подними админку
  - запусти admin UI
  - подними admin UI
  - запусти sellgar.ui.admin
  - sellgar.ui.admin
  - dev admin
  - start admin
scope:
  workspace: /home/sellgar/projects/my/sellgar.workspace
```

Используй этот skill, когда пользователь просит запустить админку Sellgar, а не проверить конкретный баг.

## Обязательное Чтение

Перед запуском читай:

- `agent/docs/README.md`
- `agent/docs/dev-modes.md`
- `agent/docs/dev-command-matrix.md`
- `backend/service/sellgar.media.service/AGENTS.md`
- `frontend/sellgar.ui.admin/AGENTS.md`

Если команда или локальный контракт расходится с этим skill, текущие workspace docs и ближайший `AGENTS.md` важнее.

## Перед Стартом

Из workspace root проверь состояние рабочих деревьев:

```bash
./agent/scripts/status-all.sh
```

Не выполняй smoke/health-check по умолчанию. Пользователь попросил только запуск. `./agent/scripts/health-check.sh full` запускай только если пользователь отдельно попросил проверку.

## Порядок Запуска

Запускай процессы в отдельных долгоживущих терминальных сессиях или эквивалентных background/dev-server sessions. Не объединяй все services в одну команду, потому что каждый `start:dev` должен остаться живым.

1. Подними Docker/infra зависимости media service:

```bash
cd backend/service/sellgar.media.service
docker compose up -d
```

2. Запусти backend services в dev mode:

```bash
cd backend/service/sellgar.identity.service
yarn start:dev
```

```bash
cd backend/service/sellgar.product.service
yarn start:dev
```

```bash
cd backend/service/sellgar.store.service
yarn start:dev
```

```bash
cd backend/service/sellgar.shop.service
yarn start:dev
```

```bash
cd backend/service/sellgar.file.service
yarn start:dev
```

```bash
cd backend/service/sellgar.media.service
yarn start:dev
```

```bash
cd backend/gateway/sellgar.admin.gateway
yarn start:dev
```

3. Запусти admin frontend:

```bash
cd frontend/sellgar.ui.admin
yarn dev:admin_ui
```

## Runtime Notes

- `identity`, `product`, `store` и `shop` могут быть RMQ-only services без HTTP `/health`.
- Admin gateway ожидается на `http://localhost:4020`.
- File service ожидается на `http://localhost:5040`.
- Media service ожидается на `http://localhost:5050`.
- Admin UI ожидается на `http://localhost:3000`.
- Media infra поднимает MinIO `9000/9001` и local CDN `8088`.

## Финальный Отчет

В финале сообщай:

- какие Docker/infra зависимости были подняты;
- какие dev-server sessions запущены;
- какие URLs ожидаются;
- какие команды не запускались и почему;
- что smoke/health-check не выполнялся, если пользователь не просил проверку.
