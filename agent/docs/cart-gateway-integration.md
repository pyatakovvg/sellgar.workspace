# Cart gateways — 2026-11-16

- Source: user requested Client and Socket Gateway support after the admin branch.
- Initial scope: authenticated buyers. Guest sessions added 2026-11-16; general session contract: [guest-sessions.md](guest-sessions.md).
- Repositories: client gateway, socket gateway, Identity; Cart contracts unchanged.
- HTTP: account login/session/logout/socket ticket and current storefront cart add/set/remove.
- Owner: normalized by Identity, never taken from public body/query; shop follows existing STOREFRONT_SHOP_UUID.
- Realtime: Client gateway converts Cart events into one private delivery per cart; projection fanout preserves stable distinct UUIDs and source identity.
- Socket: explicit carts path and scope; live/replay SQL and in-memory checks use the same owner. Session validity is checked with Identity. Owner streams serialize asynchronous checks; session cursors remain independent.
- Migration: PrivateCartDelivery1794850000000 adds nullable owner_uuid and private audience constraints/index. Public broadcast behavior is retained.
- Verification passed: Client 34, Socket 23, Identity 14; Socket PostgreSQL 4. All three builds, formatting checks and the final full isolated smoke passed.
- Full smoke: node agent/scripts/smoke-client-cart-socket.cjs. Creates random schemas/queues/exchanges and real temporary accounts; authenticates through real Identity, changes Cart through real HTTP/RMQ, verifies same-account live/replay/ACK and foreign-owner isolation, rotates credentials, revokes one session while another keeps access.
- Runtime: Client/Socket watchers reused, Identity restarted. Client health=ok, anonymous Cart=401, Socket health=ok with database up and no pending/failed/dead outbox; session.check responds from the updated Identity. No commit/push requested.
- Out of scope: frontend Cart UI/provider/auth UI, Order/Payment orchestration and admin Cart socket audience.

## Граница публичного Cart API

- Frontend domain Cart подключён к административной ветке gateway.
- В frontend Input/DTO и HTTP body нет ключей внутренних команд. Backend gateway
  сам создает `idempotencyKey` перед отправкой запроса Cart.
- Версия изменяемой/удаляемой позиции передается как `version`;
  она берется из `items[].version`, не из `Cart.version`.
- Два самостоятельных HTTP-добавления увеличивают количество дважды. Дедупликация
  внутренней доставки команды сохраняется; повторы HTTP не объявляются одной операцией.
- Проверки после изменения: Cart 15 unit + 23 PostgreSQL; admin gateway 62;
  client gateway 38; frontend domain 48. Сборки Cart, обоих gateway и админки,
  domain typecheck, RMQ smoke и полный изолированный HTTP/Socket smoke прошли.

Публичный контракт очищен от sourceVersions, shop.sourceVersion и checkoutUuid.
Доступный остаток — availableQuantity, версия корзины в результате записи —
cartVersion. PATCH/DELETE используют version позиции. Полный smoke проверяет
эти имена и отсутствие внутренних полей в реальном HTTP-ответе.


## Общая гостевая сессия — 2026-11-16

Identity теперь выдаёт гостя без User. Session bootstrap не зависит от Cart;
Cart — первый потребитель общего ownerUuid. Frontend initializer создаёт/продлевает
сессию, Socket допускает userUuid=null только с проверенным owner и private Cart
scope. Пассивные проверки и tickets не продлевают срок гостя. Вход отзывает гостя
и пишет событие owner.closed в Identity outbox; Cart закрывает все его магазины
после надёжной доставки, без merge. Подробный HTTP, lifecycle и rollout contract
находится в [guest-sessions.md](guest-sessions.md). Полный изолированный smoke
расширен проверками гостей, срока, фоновых запросов, guest ACK и восстановления
потребителя после входа. Проверки аккаунтов сохранены.

## Полный объект по Socket — 2026-11-17

Client gateway публикует schemaVersion=2 с полным публичным CartEntity, включая
items, названия, цены, доступность и версии. Используется существующий внутренний
cart.admin.getByUuid; uuid, owner и shop сверяются с адресатом события. Внешние
HTTP endpoints не добавляются. Frontend provider применяет Entity напрямую через
store/updateEntity; нет GET после записи, по событию или realtime.ready. Начальный
GET и bootstrap после смены сессии сохраняются. Action ждёт соответствующий socket
snapshot, чтобы следующая команда использовала подтверждённую версию позиции.
Сохранённые v1 notifications подтверждаются без HTTP и без применения к Entity.

60-секундный ticket ограничивает только handshake. Установленное соединение использует
общий lifecycle, как административные каналы, без отдельного Cart таймера. Перед
private replay/live проверяются актуальные status/owner/user/expiresAt Identity.
Отзыв/expiry/outage закрывает доступ до доставки, без продвижения cursor.
