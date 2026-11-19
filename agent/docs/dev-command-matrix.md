# Матрица Команд Разработки

Этот файл фиксирует повторяющиеся команды по submodule-репозиториям, чтобы не восстанавливать их заново в каждой Codex-сессии.

## Workspace

```bash
./agent/scripts/status-all.sh
./agent/scripts/submodules-sync-master.sh
./agent/scripts/health-check.sh full
git status --short --branch
git submodule status
```

## Backend

### Admin Gateway

Рабочая директория:

```bash
cd backend/gateway/sellgar.admin.gateway/code
```

Команды:

```bash
yarn build:admin_gw
yarn start:admin_gw.dev
```

Ожидаемый локальный порт: `4020`.

### Client Gateway

Рабочая директория:

```bash
cd backend/gateway/sellgar.client.gateway/code
```

Команды:

```bash
yarn build
yarn start:dev
```

Ожидаемый локальный порт: `4030`. Минимальный health endpoint:
`GET http://localhost:4030/health`.

### Socket Gateway

Рабочая директория:

```bash
cd backend/gateway/sellgar.socket.gateway/code
```

Команды:

```bash
yarn build
yarn test --runInBand
yarn start:dev
```

Ожидаемый локальный порт: `4040`. Минимальный health endpoint:
`GET http://localhost:4040/health`. Runtime socket/RMQ smoke требует запущенный
RabbitMQ, валидный short-lived socket ticket и подключение к namespace
`/realtime` только через WebSocket transport.

### Identity Service

Рабочая директория:

```bash
cd backend/service/sellgar.identity.service/code
```

Команды:

```bash
yarn build:identity_srv
yarn test
yarn start:identity_srv.dev
```

Доменные команды принимаются через RabbitMQ. Внутренний `GET /health` на `PORT`
(default 8080) проверяет PostgreSQL и RMQ consumer. В Kubernetes нет внешнего Ingress.
Runtime smoke также проверяет гостевую сессию через Client gateway.

### Product Service

Рабочая директория:

```bash
cd backend/service/sellgar.product.service
```

Команды:

```bash
yarn build
yarn start:dev
```

Сервис сейчас RMQ-only: HTTP port/`/health` не поднимается. Для product changes build недостаточен. Минимальный smoke: получить/сохранить товар с variants/images через admin UI или gateway/API consumer.

### Store Service

Рабочая директория:

```bash
cd backend/service/sellgar.store.service
```

Команды:

```bash
yarn build
yarn start:dev
```

Сервис подготовлен как RMQ-only scaffold. Таблицы `store_product`, `store_variant`, price history, inventory и reservation проектировать до реализации.

### Cart Service

Рабочая директория: `backend/service/sellgar.cart.service`.

```bash
yarn migration:run
yarn build
yarn test --runInBand
yarn test:integration
yarn test:smoke
yarn start:dev
```

RMQ-only: `cart_srv.command.queue`, `cart_srv.event.queue`, health command
`cart.health`; HTTP listen отсутствует. Отдельная PostgreSQL база `cart_srv`.
Bootstrap читает Store/Product/Shop, проекции обновляются событиями владельцев.
Integration/smoke создают только собственные случайные схемы; smoke также
использует изолированные очереди/exchange. Детали команд, доверенного ownerUuid
и оставшихся интеграций: [Cart README](../../backend/service/sellgar.cart.service/README.md).

### Shop Service

Рабочая директория:

```bash
cd backend/service/sellgar.shop.service
```

Команды:

```bash
yarn build
yarn start:dev
```

Сервис RMQ-only. Сейчас владеет таблицей `shop` и командами `shop.getAll`, `shop.getByUuid`, `shop.create`, `shop.update`.

### File Service

Рабочая директория:

```bash
cd backend/service/sellgar.file.service
```

Команды:

```bash
yarn build
yarn start:dev
```

Ожидаемый локальный порт: `5040`.

### Media Service

Рабочая директория:

```bash
cd backend/service/sellgar.media.service
```

Команды:

```bash
docker compose up -d
yarn build
yarn start:dev
```

Ожидаемые локальные порты: service `5050`, MinIO `9000/9001`, local CDN `8088`.

## Frontend

### Admin UI

Рабочая директория:

```bash
cd frontend/sellgar.ui.admin/code
```

Команды:

```bash
yarn build:admin_ui
yarn dev:admin_ui
```

Ожидаемый локальный URL: `http://localhost:3000`.

### UI Kit

Рабочая директория:

```bash
cd frontend/sellgar.ui.admin/code/library/sellgar.kit.ui
```

Команды зависят от package scripts. Перед запуском проверь:

```bash
yarn run
```

### Desktop UI

Рабочая директория:

```bash
cd frontend/sellgar.ui.desktop/code
```

Команды зависят от package scripts. Перед запуском проверь локальный `package.json`.

## Mobile Shop

Рабочая директория:

```bash
cd frontend/sellgar.mobile.shop
```

```bash
yarn install
yarn workspace @client/mobile typecheck
yarn dev:mobile
yarn android:mobile
```

Для других mobile repositories перед запуском проверь локальный `AGENTS.md` и
`package.json`.

## Cross-Repo Проверки

Для contract changes между service/gateway/frontend:

```bash
./agent/scripts/status-all.sh
./agent/scripts/health-check.sh backend
./agent/scripts/health-check.sh frontend
```

Если automated test не покрывает behavior, в финальном ответе указывай manual/browser smoke: URL, шаги, результат и residual risk.

## Полный smoke клиентской корзины и приватных сокетов

После сборки Identity, Cart, Client Gateway и Socket Gateway из workspace:

```bash
node agent/scripts/smoke-client-cart-socket.cjs
```

Нужны установленные зависимости четырех backend repositories и socket.io-client
из admin frontend, локальные PostgreSQL/RabbitMQ и работающие Shop/Product/Store.
Проверка использует случайные схемы, пользователей и очереди, читает исходные
товары без изменений; проверяет login/renew/logout, HTTP Cart, private live/replay,
ACK, несколько сессий аккаунта и изоляцию владельцев. Ресурсы удаляются после smoke.
