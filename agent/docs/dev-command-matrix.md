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
cd backend/gateway/sellgar.admin.gateway
```

Команды:

```bash
yarn build
yarn start:dev
```

Ожидаемый локальный порт: `4020`.

### Client Gateway

Рабочая директория:

```bash
cd backend/gateway/sellgar.client.gateway
```

Команды:

```bash
yarn build
yarn start:dev
```

Ожидаемый локальный порт: `4030`. Минимальный health endpoint:
`GET http://localhost:4030/health`.

### Identity Service

Рабочая директория:

```bash
cd backend/service/sellgar.identity.service
```

Команды:

```bash
yarn build
yarn test
yarn start:dev
```

Сервис сейчас RMQ-only: HTTP port/`/health` не поднимается. Runtime smoke проверять по логам запуска и через gateway/auth сценарий.

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
cd frontend/sellgar.ui.admin
```

Команды:

```bash
yarn build
yarn dev:admin_ui
```

Ожидаемый локальный URL: `http://localhost:3000`.

### UI Kit

Рабочая директория:

```bash
cd frontend/sellgar.ui.admin/library/sellgar.kit.ui
```

Команды зависят от package scripts. Перед запуском проверь:

```bash
yarn run
```

### Desktop UI

Рабочая директория:

```bash
cd frontend/sellgar.ui.desktop
```

Команды зависят от package scripts. Перед запуском проверь локальный `package.json`.

## Mobile

Рабочая директория:

```bash
cd mobile/sellgar.mobile
```

Команды зависят от mobile stack. Перед запуском проверь локальный `AGENTS.md` или `package.json`.

## Cross-Repo Проверки

Для contract changes между service/gateway/frontend:

```bash
./agent/scripts/status-all.sh
./agent/scripts/health-check.sh backend
./agent/scripts/health-check.sh frontend
```

Если automated test не покрывает behavior, в финальном ответе указывай manual/browser smoke: URL, шаги, результат и residual risk.
