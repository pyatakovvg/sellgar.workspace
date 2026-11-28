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
cd backend/service/sellgar.product.service/code
```

Команды:

```bash
yarn build:product_srv
yarn workspace @service/product test --runInBand
yarn dev:product_srv
```

Доменные команды принимаются через RMQ. Внутренний `GET /health` на `PORT`
(default 8080) проверяет PostgreSQL и оба consumer (commands/events); в Kubernetes
внешнего Ingress нет. Для product changes нужен сценарий с variants/images
через admin UI/gateway либо production-image smoke на временных БД и broker.

### Store Service

Рабочая директория:

```bash
cd backend/service/sellgar.store.service/code
```

Команды:

```bash
yarn build
yarn start:dev
```

Store владеет ассортиментом, категориями, учётными записями, ценами и остатками.
Команды/события идут через RMQ; внутренний `/health` на `PORT` (default 8080)
проверяет PostgreSQL и оба consumer. Проверки: `yarn test --runInBand`,
`yarn test:integration`; в Kubernetes Ingress нет. Внутренние RMQ-команды резервов
реализованы в Store; первый backend-этап Order/Cart проверен локально, gateway,
экраны ещё не подключены; Payment — тестовая интеграция. Контракт —
`backend/service/sellgar.store.service/docs/reservations.md`.

### Cart Service

Рабочая директория: `backend/service/sellgar.cart.service/code`.

```bash
yarn migration:run
yarn build
yarn test --runInBand
yarn test:integration
yarn test:smoke
yarn start:dev
```

Доменные команды: `cart_srv.command.queue`, `cart_srv.event.queue`, health command
`cart.health`; внутренний `/health` на 8080 проверяет PostgreSQL и оба consumer. Отдельная PostgreSQL база `cart_srv`.
Bootstrap читает Store/Product/Shop, проекции обновляются событиями владельцев.
Integration/smoke создают только собственные случайные схемы; smoke также
использует изолированные очереди/exchange. Детали команд, доверенного ownerUuid
и оставшихся интеграций: [Cart README](../../backend/service/sellgar.cart.service/README.md).

### Order Service

Рабочая директория: `backend/service/sellgar.order.service/code`.

```bash
yarn build
yarn test --runInBand
yarn test:integration
```

Integration создаёт случайную схему. Credentials берутся из environment или файла,
явно указанного в `ORDER_TEST_ENV_FILE`; тестовая схема не является рабочей схемой.
Для рабочего запуска необходим собственный `.env` по `.env.example` и миграции
собственной базы Order. Публичного checkout API пока нет; Payment работает через
тестовый адаптер, без банковских операций.

После сборки Cart/Store/Order/Payment из workspace root:

```bash
node agent/scripts/smoke-order-checkout.cjs
```

Smoke использует четыре случайные схемы и отдельные RabbitMQ queues/exchange. Проверяет
реальные Cart prepare, Store reserve, Order ready и применение Cart события через
общий outbox. Только неизменяемые исходные Product/Shop snapshots задаются fixtures.
При отказе Store выбранная строка остаётся в Cart; при ready-expiry резерв
освобождается без списания quantity. Все тестовые ресурсы удаляются.
Также проверяет order.pay → Payment test → payment.succeeded → Order paid через
настоящий outbox. Processing не истекает, после оплаты резерв остаётся.
Код первого этапа описан в Order `docs/checkout.md`. Этот изолированный smoke не
меняет рабочие схемы. Первый dev rollout выполнен 2026-11-28; версии, CI и runtime
проверки — `infrastructure/sellgar.infrastructure/docs/checkout-services.md`.

Deploy artifacts Order/Payment описаны в их `docs/deployment.md`. После сборки
обоих Docker targets `application`/`migration` с тегами `sellgar-<service>-deploy:<target>`:

```bash
node agent/scripts/smoke-checkout-images.cjs
```

Проверка использует новые временные PostgreSQL/RabbitMQ containers в private
Docker network, без host ports и рабочих volumes: миграции от non-superuser дважды,
non-root/read-only startup, production dependencies, `/health=200`, затем 503
после остановки брокера. Временные containers/volumes/network удаляются.
Для первого rollout дополнительно требуется инфраструктурный порядок из
`infrastructure/sellgar.infrastructure/docs/checkout-services.md`.

### Shop Service

Рабочая директория:

```bash
cd backend/service/sellgar.shop.service/code
```

Команды:

```bash
yarn build
yarn test --runInBand
yarn start:shop_srv.dev
```

Shop владеет магазинами, контактами, адресами и outbox. Доменные команды — RMQ:
`shop.getAll`, `shop.getByUuid`, `shop.create`, `shop.update`. Внутренний
`GET /health` на PORT (default 8080) проверяет PostgreSQL и RMQ consumer.
В Kubernetes внешний Ingress не создаётся.

### File Service

Рабочая директория:

```bash
cd backend/service/sellgar.file.service/code
```

Команды:

```bash
yarn build:file_srv
yarn start:file_srv.dev
```

Ожидаемый локальный порт: `5040`; Kubernetes использует 8080.

### Media Service

Рабочая директория:

```bash
cd backend/service/sellgar.media.service/code
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
