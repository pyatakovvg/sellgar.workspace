# Sellgar Workspace

Единая точка входа для разработки Sellgar через git submodules.

## Репозитории

| Зона | Путь | Назначение |
|---|---|---|
| Backend gateway | `backend/gateway/sellgar.admin.gateway` | Admin API gateway |
| Backend service | `backend/service/sellgar.identity.service` | Identity/session service |
| Backend service | `backend/service/sellgar.product.service` | Product catalog service |
| Backend service | `backend/service/sellgar.store.service` | Sellable products, future prices/stock/reservations |
| Backend service | `backend/service/sellgar.shop.service` | Shops/sales channels |
| Backend service | `backend/service/sellgar.file.service` | File metadata service |
| Backend service | `backend/service/sellgar.media.service` | Media upload/CDN/MinIO service |
| Frontend | `frontend/sellgar.ui.admin` | Admin frontend |
| Frontend | `frontend/sellgar.ui.desktop` | Desktop UI |
| Mobile | `frontend/sellgar.mobile.shop` | Mobile shop application |
| Frontend nested library | `frontend/sellgar.ui.admin/library/sellgar.kit.ui` | UI kit/storybook |
| Frontend nested library | `frontend/sellgar.ui.admin/library/sellgar.orm.ui` | ORM UI |
| Shared nested library | `frontend/sellgar.ui.admin/library/sellgar.app.ui` | Universal `@sellgar/app` framework |
| Shared nested library | `frontend/sellgar.mobile.shop/library/sellgar.app.ui` | The same `@sellgar/app` framework commit |
| Mobile | `mobile/sellgar.mobile` | Mobile app |

## Быстрый старт

```bash
git submodule update --init --recursive
./agent/scripts/status-all.sh
cp .env.example .env
./agent/scripts/health-check.sh full
```

Если `.env.example` еще не создан или контур запуска меняется, см. [docs/dev-modes.md](docs/dev-modes.md) и локальные `AGENTS.md` внутри submodules.

## Документация

Главная точка входа для разработчика и агента: [docs/README.md](docs/README.md).

Часто нужное:

- [Agent task contract](docs/agent/task-contract.md)
- [Agent closeout gates](docs/agent/closeout-gates.md)
- [Submodule workflow](docs/submodules-workflow.md)
- [Development command matrix](docs/dev-command-matrix.md)
- [Development modes](docs/dev-modes.md)

## Принцип

Workspace фиксирует воспроизводимый набор commit'ов submodules. Обновление кода в submodule и обновление gitlink в workspace - разные действия и должны быть видны отдельно.
