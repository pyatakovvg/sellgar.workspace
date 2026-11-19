/* Run from workspace root after building Identity, Cart, Client and Socket.
   Uses random schemas/queues/exchanges; source Shop/Product/Store are read-only. */
const assert = require("node:assert/strict");
const { createHash, createHmac, randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { parseEnv } = require("node:util");
const root = resolve(__dirname, "../..");
const repos = {
  identity: "backend/service/sellgar.identity.service/code",
  cart: "backend/service/sellgar.cart.service",
  client: "backend/gateway/sellgar.client.gateway/code",
  socket: "backend/gateway/sellgar.socket.gateway/code",
};
const requires = Object.fromEntries(
  Object.entries(repos).map(([key, path]) => [
    key,
    createRequire(resolve(root, path, "package.json")),
  ]),
);
const env = Object.fromEntries(
  Object.entries(repos).map(([key, path]) => [
    key,
    parseEnv(readFileSync(resolve(root, path, ".env"), "utf8")),
  ]),
);
Object.assign(process.env, env.identity, env.socket, env.client, env.cart);
const load = (repo, file) =>
  requires[repo](resolve(root, repos[repo], "dist", file));
const suffix = randomUUID().replace(/-/g, "");
const exchange = `cart.integration.${suffix}`,
  dispatch = `${exchange}.dispatch`;
const queues = {
  identity: `${exchange}.identity`,
  cart: `${exchange}.commands`,
  client: `${exchange}.source`,
  cartEvents: `${exchange}.cart.events`,
  socket: `${exchange}.delivery`,
};
const schemas = Object.fromEntries(
  ["identity", "cart", "socket"].map((key) => [
    key,
    `cart_flow_${key}_${suffix}`,
  ]),
);
const apps = [],
  sources = {},
  controls = {},
  sockets = [];
let broker, channel;
const dbOptions = (values) => ({
  type: "postgres",
  host: values.DATABASE_HOST,
  port: Number(values.DATABASE_PORT),
  username: values.DATABASE_USERNAME,
  password: values.DATABASE_PASSWORD,
  database: values.DATABASE_DATABASE_NAME,
});
async function until(read, ready, label) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const value = await read();
    if (ready(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out: ${label}`);
}
async function schema(repo, entities, migrations = []) {
  const { DataSource } = requires[repo]("typeorm");
  controls[repo] = await new DataSource(dbOptions(env[repo])).initialize();
  await controls[repo].query(`CREATE SCHEMA "${schemas[repo]}"`);
  sources[repo] = await new DataSource({
    ...dbOptions(env[repo]),
    schema: schemas[repo],
    extra: { options: `-c search_path=${schemas[repo]},public` },
    entities,
    migrations,
    synchronize: false,
  }).initialize();
  if (migrations.length) await sources[repo].runMigrations();
  return sources[repo];
}
function config(repo, overrides) {
  const values = { ...env[repo], ...overrides };
  if (repo === "socket")
    return load(repo, "env.validation").validateEnv(values);
  if (repo === "client")
    return load(repo, "config/env.validation").validateEnv(values);
  return values;
}
async function app(repo, values, db) {
  const { Test } = requires[repo]("@nestjs/testing");
  const { ConfigService } = requires[repo]("@nestjs/config");
  const { Logger } = requires[repo]("@nestjs/common");
  Logger.overrideLogger(false);
  let builder = Test.createTestingModule({
    imports: [load(repo, "app.module").AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue(new ConfigService(values));
  if (db)
    builder = builder
      .overrideProvider(requires[repo]("typeorm").DataSource)
      .useValue(db);
  const module = await builder.compile();
  const result = module.createNestApplication();
  result.useLogger(false);
  apps.push(result);
  return result;
}
function rmq(repo, queue, events = false) {
  const { Transport } = requires[repo]("@nestjs/microservices");
  return {
    transport: Transport.RMQ,
    options: {
      urls: [
        {
          hostname: env.cart.AMQP_HOSTNAME,
          port: Number(env.cart.AMQP_PORT),
          username: env.cart.AMQP_USERNAME,
          password: env.cart.AMQP_PASSWORD,
        },
      ],
      queue,
      queueOptions: { durable: true },
      persistent: true,
      ...(events
        ? {
            exchange,
            exchangeType: "topic",
            wildcards: true,
            noAck: false,
            prefetchCount: 1,
          }
        : {}),
    },
  };
}
async function run() {
  const amqp = requires.cart("amqplib");
  broker = await amqp.connect({
    hostname: env.cart.AMQP_HOSTNAME,
    port: Number(env.cart.AMQP_PORT),
    username: env.cart.AMQP_USERNAME,
    password: env.cart.AMQP_PASSWORD,
  });
  channel = await broker.createConfirmChannel();
  await channel.assertExchange(exchange, "topic", { durable: true });
  await channel.assertQueue(queues.cartEvents, { durable: true });
  await channel.bindQueue(queues.cartEvents, exchange, 'identity.owner.closed.v1');
  const { UserModel } = load("identity", "api/v1/user/user.model");
  const { SessionModel } = load("identity", "api/v1/session/session.model");
  const { PersonModel } = load("identity", "api/v1/person/person.model");
  const identityDb = await schema("identity", [
    UserModel,
    SessionModel,
    PersonModel,
  ]);
  for (const table of ["user", "session", "person"])
    await identityDb.query(
      `CREATE TABLE "${schemas.identity}"."${table}" (LIKE public."${table}" INCLUDING ALL)`,
    );
  await identityDb.query('ALTER TABLE session DROP COLUMN IF EXISTS owner_uuid CASCADE');
  await identityDb.query('ALTER TABLE session ALTER COLUMN user_uuid SET NOT NULL');
  const guestMigration = new (load('identity', 'migrations/1794870000000-guest-sessions').GuestSessions1794870000000)();
  const identityRunner = identityDb.createQueryRunner();
  try { await guestMigration.up(identityRunner); } finally { await identityRunner.release(); }
  const password = "Cart smoke account password",
    users = [randomUUID(), randomUUID()];
  const hash = createHmac("sha512", env.identity.LEGACY_PASSWORD_HMAC_SECRET)
    .update(password)
    .digest("hex");
  for (let index = 0; index < 2; index++)
    await identityDb.query(
      'INSERT INTO "user"(uuid,login,password,is_blocked) VALUES ($1,$2,$3,false)',
      [users[index], `cart-test-${index}`, hash],
    );
  const identity = await app("identity", config("identity", { AMQP_EVENTS_EXCHANGE: exchange }), identityDb);
  identity.connectMicroservice(rmq("identity", queues.identity));
  await identity.startAllMicroservices();
  await identity.init();
  const cartModels = load("cart", "api/v1/cart/model").CART_MODELS;
  const migrations = [
    "1794830000000-create-cart",
    "1794830001000-require-complete-price",
  ].flatMap((name) =>
    Object.values(load("cart", `database/migrations/${name}`)),
  );
  const cartDb = await schema("cart", cartModels, migrations);
  const cart = await app(
    "cart",
    config("cart", {
      AMQP_CART_SRV_COMMAND_QUEUE: queues.cart,
      AMQP_EVENTS_EXCHANGE: exchange,
      CART_BOOTSTRAP_ON_START: "false",
      OUTBOX_PUBLISH_INTERVAL_MS: "25",
    }),
    cartDb,
  );
  cart.connectMicroservice(rmq("cart", queues.cart));
  await cart.startAllMicroservices();
  await cart.init();
  await cart
    .get(
      load("cart", "integration/recovery/projection-recovery.service")
        .ProjectionRecoveryService,
    )
    .bootstrap();
  const [record] = await cartDb.query(
    `SELECT ar.uuid,sp.shop_uuid FROM accounting_record_snapshot ar
    JOIN store_offer_snapshot o ON o.uuid=ar.offer_uuid JOIN store_product_snapshot sp ON sp.uuid=o.store_product_uuid
    JOIN product_snapshot p ON p.uuid=sp.product_uuid JOIN variant_snapshot v ON v.uuid=o.variant_uuid
    JOIN record_inventory_snapshot i ON i.record_uuid=ar.uuid WHERE sp.status='active' AND sp.showing AND o.status='active' AND o.showing AND p.status='active' AND v.status='active' AND i.available>0 AND o.currency_code=$1 LIMIT 1`,
    [env.cart.CART_CURRENCY_CODE],
  );
  assert.ok(record, "Source services must have a sellable record");
  const socketMigrations = [
    "1786200000000-durable-delivery",
    "1786201000000-broadcast-delivery",
    "1786202000000-channel-delivery",
    "1786347000000-normalized-realtime-delivery",
    "1794850000000-private-cart-delivery",
    "1794870001000-guest-session-cursors",
  ].flatMap((name) => Object.values(load("socket", `migrations/${name}`)));
  const socketModels = [
    "delivery-event",
    "delivery-outbox",
    "delivery-cursor",
  ].flatMap((name) =>
    Object.values(load("socket", `api/v1/delivery/${name}.model`)),
  );
  const socketDb = await schema("socket", socketModels, socketMigrations);
  const socketConfig = config("socket", {
    AMQP_IDENTITY_SRV_COMMAND_QUEUE: queues.identity,
    AMQP_SOCKET_GATEWAY_EVENT_EXCHANGE: exchange,
    AMQP_SOCKET_GATEWAY_DISPATCH_EXCHANGE: dispatch,
    SOCKET_INSTANCE_ID: suffix,
    DELIVERY_OUTBOX_POLL_INTERVAL_MS: "25",
  });
  const socket = await app("socket", socketConfig, socketDb);
  socket.useWebSocketAdapter(
    new (load(
      "socket",
      "api/v1/delivery/gateway/socket-io.adapter",
    ).SocketIoAdapter)(socket, ["http://localhost"]),
  );
  socket.connectMicroservice(rmq("socket", queues.socket, true));
  await socket.startAllMicroservices();
  await socket.listen(0, "127.0.0.1");
  const socketUrl = await socket.getUrl();
  const client = await app(
    "client",
    config("client", {
      STOREFRONT_SHOP_UUID: record.shop_uuid,
      AUTH_COOKIE_SECURE: false,
      AMQP_IDENTITY_SRV_COMMAND_QUEUE: queues.identity,
      AMQP_CART_SRV_COMMAND_QUEUE: queues.cart,
      AMQP_EVENTS_EXCHANGE: exchange,
      SOCKET_TICKET_SECRET: env.socket.SOCKET_TICKET_SECRET,
      SOCKET_TICKET_AUDIENCE: env.socket.SOCKET_TICKET_AUDIENCE,
    }),
  );
  client.useGlobalPipes(
    new (requires.client("@nestjs/common").ValidationPipe)({
      whitelist: true,
      transform: true,
    }),
  );
  client.useGlobalFilters(
    new (load(
      "client",
      "common/exceptions/all-exception.filter",
    ).AllExceptionsFilter)(),
  );
  client.connectMicroservice(rmq("client", queues.client, true));
  await client.startAllMicroservices();
  await client.listen(0, "127.0.0.1");
  const clientUrl = await client.getUrl();
  async function http(who, path, method = "GET", body, status = 200) {
    const headers = {
      "x-device-id": who.device,
      "User-Agent": "Cart end-to-end smoke",
    };
    if (who.cookie) headers.Cookie = who.cookie;
    if (body) headers["Content-Type"] = "application/json";
    const response = await fetch(clientUrl + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const value = await response.json();
    if (response.headers.getSetCookie().length)
      who.cookie = response.headers.getSetCookie().at(-1).split(";")[0];
    assert.equal(
      response.status,
      status,
      `${method} ${path}: ${value.message ?? response.status}`,
    );
    return value;
  }
  const a1 = { device: randomUUID() },
    a2 = { device: randomUUID() },
    b = { device: randomUUID() };
  await http(a1, "/v1/cart", "GET", undefined, 401);
  await http(
    a1,
    "/v1/auth/login",
    "POST",
    { login: "cart-test-0", password },
    201,
  );
  const sessionA2 = await http(
    a2,
    "/v1/auth/login",
    "POST",
    { login: "cart-test-0", password },
    201,
  );
  await http(
    b,
    "/v1/auth/login",
    "POST",
    { login: "cart-test-1", password },
    201,
  );
  const own = await http(a1, "/v1/cart");
  const same = await http(a2, "/v1/cart");
  const foreign = await http(b, "/v1/cart");
  assert.equal(same.uuid, own.uuid);
  assert.notEqual(foreign.uuid, own.uuid);
  const { io } = createRequire(
    resolve(root, "frontend/sellgar.ui.admin/code/package.json"),
  )("socket.io-client");
  async function connect(who, shortTicket = false) {
    let { ticket } = await http(
      who,
      "/v1/auth/socket-ticket",
      "POST",
      {},
      201,
    );
    if (shortTicket) {
      const { JwtService } = requires.client('@nestjs/jwt');
      const jwt = new JwtService();
      const { sid, sub, oid, scope } = jwt.decode(ticket);
      ticket = await jwt.signAsync({ sid, ...(sub ? { sub } : {}), oid, scope }, {
        algorithm: 'HS256', audience: env.client.SOCKET_TICKET_AUDIENCE,
        secret: env.client.SOCKET_TICKET_SECRET, expiresIn: 4,
      });
    }
    const connection = io(socketUrl, {
      path: "/socket.io/carts",
      forceNew: true,
      transports: ["websocket"],
      auth: { ticket },
      autoConnect: false,
      reconnection: false,
    });
    sockets.push(connection);
    const events = [];
    connection.on("realtime.event.v1", (event) => events.push(event));
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Socket ready timeout")),
        10000,
      );
      connection.once("realtime.ready.v1", () => {
        clearTimeout(timer);
        resolve();
      });
      connection.once("connect_error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      connection.connect();
    });
    return { connection, events };
  }
  const s1 = await connect(a1, true),
    s2 = await connect(a2),
    sb = await connect(b);
  await new Promise(resolve => setTimeout(resolve, 4100));
  assert.equal(s1.connection.connected, true, 'Handshake ticket expiry must not disconnect an active Identity session');
  const add = {
    recordUuid: record.uuid,
    quantity: 1,
    ownerUuid: users[1],
    shopUuid: randomUUID(),
  };
  await http(a1, "/v1/cart/items", "POST", add, 201);
  const added = await http(a1, "/v1/cart/items", "POST", add, 201);
  assert.equal(typeof added.cartVersion, "string");
  assert.ok(!("version" in added));
  let view = await http(a2, "/v1/cart");
  assert.equal(view.items[0].quantity, 2);
  assert.equal(typeof view.items[0].availableQuantity, "number");
  assert.ok(!("sourceVersion" in view.shop));
  for (const field of ["sourceVersions", "checkoutUuid", "available"])
    assert.ok(!(field in view.items[0]));
  const first = await until(
    async () =>
      s2.events.find(
        (event) =>
          event.payload.uuid === own.uuid &&
          event.payload.version === view.version,
      ),
    Boolean,
    "same-account live delivery",
  );
  await until(
    async () =>
      s1.events.some((event) => event.deliveryId === first.deliveryId),
    Boolean,
    "first session live delivery",
  );
  assert.ok(sb.events.every((event) => event.payload.uuid !== own.uuid));
  assert.ok(!("ownerUuid" in first));
  assert.ok(!("targets" in first.payload));
  assert.ok(!("ownerUuid" in first.payload));
  assert.deepEqual(first.payload, view);
  assert.equal(first.schemaVersion, 2);
  await new Promise((resolve, reject) =>
    s2.connection
      .timeout(5000)
      .emit("realtime.ack.v1", { sequence: first.sequence }, (error) =>
        error ? reject(error) : resolve(),
      ),
  );
  s2.connection.disconnect();
  await http(a1, `/v1/cart/items/${record.uuid}`, "PATCH", {
    quantity: 1,
    version: view.items[0].version,
  });
  view = await http(a1, "/v1/cart");
  const replayed = await until(
    async () =>
      s1.events.find((event) => event.payload.version === view.version),
    Boolean,
    "update while second session offline",
  );
  const s2reconnected = await connect(a2);
  assert.ok(
    s2reconnected.events.some(
      (event) => event.deliveryId === replayed.deliveryId,
    ),
  );
  assert.ok(
    s2reconnected.events.every((event) => event.payload.uuid === own.uuid),
  );
  await identityDb.query(
    "UPDATE session SET renew_required_at=NOW()-INTERVAL '1 second' WHERE uuid=$1",
    [sessionA2.sessionUuid],
  );
  const beforeCookie = a2.cookie;
  await http(a2, "/v1/cart");
  assert.notEqual(a2.cookie, beforeCookie);
  await http(a1, "/v1/auth/logout", "POST", {}, 201);
  const stillOwn = await http(a2, "/v1/cart");
  assert.equal(stillOwn.uuid, own.uuid);
  await http(a2, `/v1/cart/items/${record.uuid}`, "PATCH", {
    quantity: 1,
    version: stillOwn.items[0].version,
  });
  await until(
    async () => !s1.connection.connected,
    Boolean,
    "revoked session disconnect",
  );
  const final = await http(a2, "/v1/cart");
  await until(
    async () =>
      s2reconnected.events.some(
        (event) => event.payload.version === final.version,
      ),
    Boolean,
    "active session after other logout",
  );
  assert.ok(sb.events.every((event) => event.payload.uuid !== own.uuid));
  const guest = { device: randomUUID() }, anotherGuest = { device: randomUUID() };
  const beforeGuests = (await cartDb.query('SELECT count(*)::int n FROM carts'))[0].n;
  const guestSession = await http(guest, '/v1/auth/session', 'POST', {}, 201);
  const otherSession = await http(anotherGuest, '/v1/auth/session', 'POST', {}, 201);
  assert.equal(guestSession.userUuid, null);
  assert.notEqual(guestSession.sessionUuid, otherSession.sessionUuid);
  assert.equal((await cartDb.query('SELECT count(*)::int n FROM carts'))[0].n, beforeGuests, 'Session creation must not create a cart');
  const [guestIdentity] = await identityDb.query('SELECT * FROM session WHERE uuid=$1', [guestSession.sessionUuid]);
  assert.equal(guestIdentity.user_uuid, null);
  assert.ok(Math.abs(new Date(guestIdentity.expires_at).getTime() - Date.now() - 30*86400000) < 10000);
  await http(guest, '/v1/cart/items', 'POST', { recordUuid: record.uuid, quantity: 1 }, 201);
  const guestCart = await http(guest, '/v1/cart');
  const g1 = await connect(guest), g2 = await connect(guest), gOther = await connect(anotherGuest);
  await http(guest, `/v1/cart/items/${record.uuid}`, 'PATCH', { quantity: 1, version: guestCart.items[0].version });
  const guestView = await http(guest, '/v1/cart');
  const guestEvent = await until(async () => g1.events.find(e => e.payload.uuid === guestCart.uuid && e.payload.version === guestView.version), Boolean, 'guest live delivery');
  await until(async () => g2.events.some(e => e.deliveryId === guestEvent.deliveryId), Boolean, 'same browser second guest connection');
  assert.ok(gOther.events.every(e => e.payload.uuid !== guestCart.uuid));
  await new Promise((resolve, reject) => g1.connection.timeout(5000).emit('realtime.ack.v1', { sequence: guestEvent.sequence }, error => error ? reject(error) : resolve()));
  const [guestCursor] = await socketDb.query("SELECT * FROM delivery_cursor WHERE session_uuid=$1 AND channel='carts'", [guestSession.sessionUuid]);
  assert.equal(guestCursor.user_uuid, null);
  assert.equal(guestCursor.sequence, guestEvent.sequence);

  const savedCookie = guest.cookie;
  await http(guest, '/v1/auth/login', 'POST', { login: 'cart-test-0', password: 'wrong-password' }, 401);
  assert.equal(guest.cookie, savedCookie, 'Failed sign-in must not replace guest cookie');
  assert.equal((await http(guest, '/v1/cart')).uuid, guestCart.uuid);
  assert.equal((await identityDb.query('SELECT status FROM session WHERE uuid=$1', [guestSession.sessionUuid]))[0].status, 'active');

  await identityDb.query("UPDATE session SET expires_at=now()+interval '1 day',renew_required_at=now()-interval '1 second' WHERE uuid=$1", [guestSession.sessionUuid]);
  const beforePassive = (await identityDb.query('SELECT expires_at FROM session WHERE uuid=$1', [guestSession.sessionUuid]))[0].expires_at;
  await http(guest, '/v1/auth/socket-ticket', 'POST', {}, 201);
  await http(guest, '/v1/cart');
  assert.equal((await identityDb.query('SELECT expires_at FROM session WHERE uuid=$1', [guestSession.sessionUuid]))[0].expires_at.getTime(), beforePassive.getTime(), 'Background reads/tickets must not extend guest inactivity');
  const renewedGuest = await http(guest, '/v1/auth/session', 'POST', {}, 201);
  assert.equal(renewedGuest.sessionUuid, guestSession.sessionUuid);
  assert.notEqual(guest.cookie, savedCookie);
  assert.equal((await identityDb.query('SELECT owner_uuid FROM session WHERE uuid=$1', [guestSession.sessionUuid]))[0].owner_uuid, guestIdentity.owner_uuid);
  assert.equal((await http(guest, '/v1/cart')).uuid, guestCart.uuid);
  const otherShopCart = randomUUID();
  await cartDb.query('INSERT INTO carts(uuid,owner_uuid,shop_uuid) VALUES($1,$2,$3)', [otherShopCart, guestIdentity.owner_uuid, randomUUID()]);
  const accountItems = (await http(a2, '/v1/cart')).items;
  const oldGuestCookie = guest.cookie;
  const identitySessions = identity.get(load('identity', 'api/v1/session/service/session.service').SessionService);
  const browserFingerprint = createHash('sha256').update('Cart end-to-end smoke'+'\0'+guest.device).digest('hex');
  const independentAdmin = await identitySessions.create({ userUuid: users[0], fingerprint: browserFingerprint, device: 'Cart end-to-end smoke', clientType: 'web', gateway: 'admin_gw', authMethod: 'password', assuranceLevel: 'medium' });
  const signedIn = await http(guest, '/v1/auth/login', 'POST', { login: 'cart-test-0', password }, 201);
  assert.equal(signedIn.userUuid, users[0]);
  assert.equal((await identityDb.query('SELECT status FROM session WHERE uuid=$1', [independentAdmin.uuid]))[0].status, 'active', 'Client sign-in must not replace an admin session with the same browser binding');
  assert.notEqual(signedIn.sessionUuid, guestSession.sessionUuid);
  assert.equal((await identityDb.query('SELECT status FROM session WHERE uuid=$1', [guestSession.sessionUuid]))[0].status, 'revoked');
  await http({ device: guest.device, cookie: oldGuestCookie }, '/v1/cart', 'GET', undefined, 401);
  assert.deepEqual((await http(guest, '/v1/cart')).items, accountItems, 'Guest items must not merge into account');
  const lifecycle = identity.get(load('identity', 'api/v1/session/service/session-lifecycle.service').SessionLifecycleService);
  await lifecycle.flush();
  await until(async () => (await identityDb.query('SELECT published_at FROM session_owner_outbox WHERE owner_uuid=$1', [guestIdentity.owner_uuid]))[0]?.published_at, Boolean, 'Identity lifecycle publication');
  assert.equal((await cartDb.query('SELECT closed_at FROM carts WHERE uuid=$1', [guestCart.uuid]))[0].closed_at, null, 'Login succeeds while Cart lifecycle consumer is offline');
  const cartEvents = cart.connectMicroservice(rmq('cart', queues.cartEvents, true));
  await cartEvents.listen();
  await until(async () => (await cartDb.query('SELECT count(*)::int n FROM carts WHERE owner_uuid=$1 AND closed_at IS NULL', [guestIdentity.owner_uuid]))[0].n, n => n === 0, 'all guest shops close after consumer recovery');
  await until(async () => !g1.connection.connected && !g2.connection.connected, Boolean, 'guest sockets stop after sign-in');
  const closedEvent = (await identityDb.query('SELECT * FROM session_owner_outbox WHERE owner_uuid=$1', [guestIdentity.owner_uuid]))[0];
  channel.publish(exchange, 'identity.owner.closed.v1', Buffer.from(JSON.stringify({ pattern: 'identity.owner.closed.v1', data: { eventUuid: closedEvent.uuid, eventType: 'identity.owner.closed.v1', schemaVersion: 1, producer: 'identity_srv', ownerUuid: guestIdentity.owner_uuid, occurredAt: closedEvent.occurred_at.toISOString(), reason: closedEvent.reason } })), { persistent: true });
  await channel.waitForConfirms();
  await http(guest, '/v1/auth/logout', 'POST', {}, 201);
  const afterLogout = await http(guest, '/v1/auth/session', 'POST', {}, 201);
  assert.equal(afterLogout.userUuid, null);
  assert.notEqual(afterLogout.sessionUuid, guestSession.sessionUuid);
  assert.equal((await http(guest, '/v1/cart')).items.length, 0, 'Old guest cart must not return after logout');

  const expiringCart = await http(anotherGuest, '/v1/cart');
  const otherOwner = (await identityDb.query('SELECT owner_uuid FROM session WHERE uuid=$1', [otherSession.sessionUuid]))[0].owner_uuid;
  await identityDb.query("UPDATE session SET expires_at=now()-interval '1 second' WHERE uuid=$1", [otherSession.sessionUuid]);
  await lifecycle.flush();
  await until(async () => (await cartDb.query('SELECT closed_at FROM carts WHERE uuid=$1', [expiringCart.uuid]))[0].closed_at, Boolean, 'inactivity expiry closes guest cart without another visit');
  assert.equal((await identityDb.query('SELECT count(*)::int n FROM session_owner_outbox WHERE owner_uuid=$1', [otherOwner]))[0].n, 1);
  const replacement = await http(anotherGuest, '/v1/auth/session', 'POST', {}, 201);
  assert.notEqual(replacement.sessionUuid, otherSession.sessionUuid);
  console.log(
    "PASS: real Identity login/renew/logout -> Client HTTP -> Cart/RMQ/outbox -> private Socket live/replay/ACK; same-account devices, guests, 30-day lease, passive checks, guest ACK, login/logout/expiry, durable closure after consumer recovery; all writes in isolated schemas",
  );
}
async function cleanup() {
  sockets.forEach((socket) => socket.disconnect());
  for (const app of apps.reverse()) await app.close().catch(() => {});
  for (const [repo, control] of Object.entries(controls)) {
    if (sources[repo]?.isInitialized) await sources[repo].destroy();
    await control.query(`DROP SCHEMA IF EXISTS "${schemas[repo]}" CASCADE`);
    await control.destroy();
  }
  if (channel) {
    for (const queue of Object.values(queues))
      await channel.deleteQueue(queue).catch(() => {});
    for (const name of [exchange, dispatch])
      await channel.deleteExchange(name).catch(() => {});
    await channel.close();
  }
  if (broker) await broker.close();
}
run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(cleanup);
