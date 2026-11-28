#!/usr/bin/env node

// Integration of working checkouts, using only random schemas and private broker resources.
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { parseEnv } = require("node:util");
const { resolve } = require("node:path");

const workspace = resolve(__dirname, "../..");
const root = (service) =>
  resolve(workspace, `backend/service/sellgar.${service}.service/code`);
const local = (service) =>
  createRequire(resolve(root(service), "package.json"));
local("order")("reflect-metadata");
const load = (service, path) =>
  local(service)(resolve(root(service), `dist/${path}`));
const env = (service) => ({
  ...parseEnv(readFileSync(resolve(root(service), ".env"), "utf8")),
  ...process.env,
});
const suffix = randomUUID().replace(/-/g, "");
const exchange = `order.checkout.smoke.${suffix}`;
const queues = Object.fromEntries(
  ["cart", "store", "order", "payment"].map((name) => [
    name,
    `${exchange}.${name}`,
  ]),
);
const orderEventQueue = `${exchange}.order.events`;

async function until(read, ready) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const result = await read();
    if (ready(result)) return result;
    await new Promise((done) => setTimeout(done, 50));
  }
  throw new Error("Checkout smoke timed out");
}

async function main() {
  const databases = [];
  const apps = [];
  const clients = [];
  let broker;
  let channel;
  const previousEnv = { ...process.env };
  try {
    const cartEnv = env("cart");
    const storeEnv = env("store");
    async function database(service, connectionEnv) {
      const { DataSource } = local(service)("typeorm");
      const className = `${service[0].toUpperCase()}${service.slice(1)}DatabaseOptions`;
      const options = load(service, `database/${service}-database.options`)[
        className
      ];
      const schema = `${service}_checkout_smoke_${suffix}`;
      const control = await new DataSource({
        ...options.create(connectionEnv),
        migrations: [],
        entities: [],
      }).initialize();
      try {
        await control.query(`CREATE SCHEMA "${schema}"`);
      } finally {
        await control.destroy();
      }
      const db = await new DataSource(
        options.create({
          ...connectionEnv,
          [`${service.toUpperCase()}_DATABASE_SCHEMA`]: schema,
        }),
      ).initialize();
      databases.push({ db, schema });
      await db.runMigrations();
      return { db, schema };
    }
    const cart = await database("cart", cartEnv);
    const store = await database("store", storeEnv);
    const order = await database("order", cartEnv);
    const payment = await database("payment", cartEnv);
    broker = await local("order")("amqplib").connect({
      hostname: cartEnv.AMQP_HOSTNAME,
      port: Number(cartEnv.AMQP_PORT),
      username: cartEnv.AMQP_USERNAME,
      password: cartEnv.AMQP_PASSWORD,
    });
    channel = await broker.createChannel();
    await channel.assertExchange(exchange, "topic", { durable: true });

    const shopUuid = randomUUID(),
      productUuid = randomUUID(),
      variantUuid = randomUUID();
    const storeUuid = randomUUID(),
      offerUuid = randomUUID();
    const records = [randomUUID(), randomUUID()];
    await store.db.query(
      "INSERT INTO currency(code,value) VALUES ('RUB','Рубль')",
    );
    await store.db.query(
      "INSERT INTO shop_snapshot(shop_uuid,source_version,name) VALUES ($1,1,'Магазин')",
      [shopUuid],
    );
    await store.db.query(
      "INSERT INTO product_snapshot(product_uuid,source_version,name,status) VALUES ($1,1,'Тарелка','active')",
      [productUuid],
    );
    await store.db.query(
      "INSERT INTO variant_snapshot(variant_uuid,product_uuid,source_version,name,status) VALUES ($1,$2,1,'Белая','active')",
      [variantUuid, productUuid],
    );
    await store.db.query(
      "INSERT INTO store_product(uuid,shop_uuid,product_uuid) VALUES ($1,$2,$3)",
      [storeUuid, shopUuid, productUuid],
    );
    await store.db.query(
      "INSERT INTO store_offer(uuid,store_product_uuid,product_uuid,variant_uuid) VALUES ($1,$2,$3,$4)",
      [offerUuid, storeUuid, productUuid, variantUuid],
    );
    for (let i = 0; i < records.length; i++) {
      await store.db.query(
        'INSERT INTO accounting_record(uuid,offer_uuid,article,"order") VALUES ($1,$2,$3,$4)',
        [records[i], offerUuid, records[i], i],
      );
      await store.db.query(
        "INSERT INTO record_inventory(record_uuid,quantity) VALUES ($1,5)",
        [records[i]],
      );
      await store.db.query(
        "INSERT INTO price_history(record_uuid,value,currency_code) VALUES ($1,'125.50','RUB')",
        [records[i]],
      );
    }
    const shopFixture = { uuid: shopUuid, name: "Магазин", version: 1 };
    const productFixture = {
      uuid: productUuid,
      version: 1,
      name: "Тарелка",
      status: "active",
      variants: [
        { uuid: variantUuid, name: "Белая", status: "active", images: [] },
      ],
    };
    const storeFixture = {
      uuid: storeUuid,
      shopUuid,
      productUuid,
      version: 1,
      status: "active",
      showing: true,
      offers: [
        {
          uuid: offerUuid,
          storeProductUuid: storeUuid,
          productUuid,
          variantUuid,
          status: "active",
          showing: true,
          records: records.map((uuid) => ({
            uuid,
            offerUuid,
            article: uuid,
            clarifications: [{ position: 0, value: "250 мм" }],
            currentPrice: {
              uuid: randomUUID(),
              recordUuid: uuid,
              value: "125.50",
              currencyCode: "RUB",
            },
            inventory: {
              uuid: randomUUID(),
              recordUuid: uuid,
              version: 1,
              quantity: 5,
              reserved: 0,
            },
          })),
        },
      ],
    };

    async function microservice(service, module) {
      const nest = local(service)("@nestjs/common");
      nest.Logger.overrideLogger(["warn", "error"]);
      const { Transport } = local(service)("@nestjs/microservices");
      const app = module.createNestMicroservice({
        transport: Transport.RMQ,
        options: {
          urls: [
            {
              hostname: cartEnv.AMQP_HOSTNAME,
              port: Number(cartEnv.AMQP_PORT),
              username: cartEnv.AMQP_USERNAME,
              password: cartEnv.AMQP_PASSWORD,
            },
          ],
          queue: queues[service],
          queueOptions: { durable: true },
          noAck: false,
          ...(service === "cart"
            ? { exchange, exchangeType: "topic", wildcards: true }
            : {}),
        },
      });
      apps.push(app);
      app.useGlobalPipes(
        new nest.ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      app.useGlobalFilters(
        new (load(
          service,
          "common/rpc-http-exception.filter",
        ).RpcHttpExceptionFilter)(),
      );
      await app.listen();
      return app;
    }

    const storeCommon = local("store")("@nestjs/common");
    class StoreResources {}
    storeCommon.Global()(StoreResources);
    const StoreDataSource = local("store")("typeorm").DataSource;
    const StoreWriter = local("store")("@sellgar/outbox").OutboxWriter;
    const storeOptions = load(
      "store",
      "integration/outbox/store-outbox.options",
    ).STORE_OUTBOX_OPTIONS;
    storeCommon.Module({
      providers: [
        { provide: StoreDataSource, useValue: store.db },
        { provide: StoreWriter, useValue: new StoreWriter(storeOptions) },
      ],
      exports: [StoreDataSource, StoreWriter],
    })(StoreResources);
    const storeModule = await local("store")("@nestjs/testing")
      .Test.createTestingModule({
        imports: [
          StoreResources,
          load("store", "api/v1/reservation/reservation.module")
            .ReservationModule,
        ],
      })
      .compile();
    await microservice("store", storeModule);

    const classes = [
      [
        "api/v1/cart/repository/cart-command.repository",
        "CartCommandRepository",
      ],
      ["api/v1/cart/repository/cart.repository", "CartRepository"],
      ["api/v1/cart/repository/cart-query.repository", "CartQueryRepository"],
      ["api/v1/cart/service/cart.service", "CartService"],
      ["api/v1/cart/service/cart-checkout.service", "CartCheckoutService"],
      [
        "api/v1/cart/service/cart-checkout-query.service",
        "CartCheckoutQueryService",
      ],
      ["api/v1/cart/service/cart-selection.factory", "CartSelectionFactory"],
      ["api/v1/cart/service/checkout-state-machine", "CheckoutStateMachine"],
      ["integration/outbox/cart-events.repository", "CartEventsRepository"],
      ["integration/projection/projection.service", "ProjectionService"],
      [
        "integration/recovery/projection-recovery.service",
        "ProjectionRecoveryService",
      ],
    ].map(([path, name]) => load("cart", path)[name]);
    const CartWriter = local("cart")("@sellgar/outbox").OutboxWriter;
    const CartConfig = local("cart")("@nestjs/config").ConfigService;
    const cartModule = await local("cart")("@nestjs/testing")
      .Test.createTestingModule({
        controllers: [
          load("cart", "api/v1/cart/controller/cart.controller").CartController,
          load("cart", "integration/order/order-events.controller")
            .OrderEventsController,
        ],
        providers: [
          ...classes,
          { provide: local("cart")("typeorm").DataSource, useValue: cart.db },
          {
            provide: CartWriter,
            useValue: new CartWriter(
              load("cart", "integration/outbox/cart-outbox.options")
                .CART_OUTBOX_OPTIONS,
            ),
          },
          {
            provide: CartConfig,
            useValue: new CartConfig({
              CART_CURRENCY_CODE: "RUB",
              CART_BOOTSTRAP_ON_START: "false",
              CART_RECOVERY_INTERVAL_MS: 60000,
            }),
          },
          {
            provide: load("cart", "integration/recovery/source.gateway")
              .SourceGateway,
            useValue: {
              assertStock: async () => {},
              storeProductByRecord: async () => storeFixture,
              shopByUuid: async () => shopFixture,
              catalogProduct: async () => productFixture,
            },
          },
        ],
      })
      .compile();
    const projections = cartModule.get(
      load("cart", "integration/projection/projection.service")
        .ProjectionService,
    );
    await projections.synchronize("shop", shopFixture);
    await projections.synchronize("product", productFixture);
    await projections.synchronize("store_product", storeFixture);
    await microservice("cart", cartModule);

    Object.assign(process.env, cartEnv, {
      ORDER_DATABASE_SCHEMA: order.schema,
      AMQP_ORDER_SRV_COMMAND_QUEUE: queues.order,
      AMQP_CART_SRV_COMMAND_QUEUE: queues.cart,
      AMQP_STORE_SRV_COMMAND_QUEUE: queues.store,
      AMQP_EVENTS_EXCHANGE: exchange,
      ORDER_WORKER_ENABLED: "false",
      OUTBOX_PUBLISH_INTERVAL_MS: "50",
      AMQP_PAYMENT_SRV_COMMAND_QUEUE: queues.payment,
      AMQP_ORDER_SRV_EVENT_QUEUE: orderEventQueue,
      PAYMENT_DATABASE_SCHEMA: payment.schema,
      PAYMENT_PROVIDER: "test",
    });
    local("payment")("@nestjs/common").Logger.overrideLogger(["warn", "error"]);
    const paymentApp = await load(
      "payment",
      "bootstrap",
    ).createPaymentApplication();
    apps.push(paymentApp);
    local("order")("@nestjs/common").Logger.overrideLogger(["warn", "error"]);
    const orderApp = await load("order", "bootstrap").createOrderApplication();
    apps.push(orderApp);
    const processor = orderApp.get(
      load("order", "order/service/order-processor.service")
        .OrderProcessorService,
    );
    const { firstValueFrom, timeout } = local("order")("rxjs");
    const { ClientProxyFactory, Transport } = local("order")(
      "@nestjs/microservices",
    );
    function client(service) {
      const result = ClientProxyFactory.create({
        transport: Transport.RMQ,
        options: {
          urls: [
            {
              hostname: cartEnv.AMQP_HOSTNAME,
              port: Number(cartEnv.AMQP_PORT),
              username: cartEnv.AMQP_USERNAME,
              password: cartEnv.AMQP_PASSWORD,
            },
          ],
          queue: queues[service],
          queueOptions: { durable: true },
        },
      });
      clients.push(result);
      return (cmd, input) =>
        firstValueFrom(result.send({ cmd }, input).pipe(timeout(10000)));
    }
    const cartCall = client("cart"),
      orderCall = client("order"),
      paymentCall = client("payment");
    const scope = { ownerUuid: randomUUID(), shopUuid };
    for (let i = 0; i < records.length; i++)
      await cartCall("cart.item.add", {
        ...scope,
        recordUuid: records[i],
        quantity: i === 0 ? 2 : 1,
        idempotencyKey: randomUUID(),
      });
    const cartView = await cartCall("cart.get", scope);
    const item = cartView.items.find((line) => line.recordUuid === records[0]);
    const draftInput = {
      ...scope,
      cartUuid: cartView.uuid,
      commandId: randomUUID(),
      items: [
        {
          recordUuid: item.recordUuid,
          quantity: item.quantity,
          expectedItemVersion: item.version,
        },
      ],
    };
    const draft = await orderCall("order.draft.create", draftInput);
    assert.equal(draft.snapshot.itemsTotal, "251.00");
    assert.equal((await cartCall("cart.get", scope)).items.length, 2);
    storeFixture.version++;
    storeFixture.offers[0].records[0].currentPrice.value = "999.00";
    await store.db.query(
      "UPDATE price_history SET value=999 WHERE record_uuid=$1",
      [records[0]],
    );
    const confirmation = {
      ...scope,
      orderUuid: draft.uuid,
      commandId: randomUUID(),
      email: "buyer@example.org",
    };
    const confirmed = await orderCall("order.confirm", confirmation);
    await processor.runOnce();
    await processor.runOnce();
    const accepted = await orderCall("order.get", {
      ...scope,
      orderUuid: draft.uuid,
    });
    assert.equal(accepted.status, "ready");
    assert.equal(accepted.snapshot.itemsTotal, "251.00");
    const remaining = await until(
      () => cartCall("cart.get", scope),
      (view) => view.items.length === 1,
    );
    assert.equal(remaining.items[0].recordUuid, records[1]);
    const inventory = async () =>
      (
        await store.db.query(
          "SELECT quantity,reserved FROM record_inventory WHERE record_uuid=$1",
          [records[0]],
        )
      )[0];
    assert.deepEqual(await inventory(), { quantity: 5, reserved: 2 });
    assert.deepEqual(await orderCall("order.confirm", confirmation), confirmed);
    assert.equal(
      (
        await orderCall("order.getByAccessToken", {
          accessToken: confirmed.accessToken,
        })
      ).uuid,
      draft.uuid,
    );

    await order.db.query(
      "UPDATE orders SET payment_due_at=now()-interval '1 second' WHERE uuid=$1",
      [draft.uuid],
    );
    await processor.runOnce();
    assert.equal(
      (await orderCall("order.get", { ...scope, orderUuid: draft.uuid }))
        .status,
      "expired",
    );
    assert.deepEqual(await inventory(), { quantity: 5, reserved: 0 });

    const payingScope = { ownerUuid: randomUUID(), shopUuid };
    await cartCall("cart.item.add", {
      ...payingScope,
      recordUuid: records[0],
      quantity: 1,
      idempotencyKey: randomUUID(),
    });
    const payingCart = await cartCall("cart.get", payingScope);
    const payingDraft = await orderCall("order.draft.create", {
      ...payingScope,
      cartUuid: payingCart.uuid,
      commandId: randomUUID(),
      items: [
        {
          recordUuid: records[0],
          quantity: 1,
          expectedItemVersion: payingCart.items[0].version,
        },
      ],
    });
    await orderCall("order.confirm", {
      ...payingScope,
      orderUuid: payingDraft.uuid,
      commandId: randomUUID(),
      email: "buyer@example.org",
    });
    await processor.runOnce();
    await processor.runOnce();
    const payCommand = {
      ...payingScope,
      orderUuid: payingDraft.uuid,
      commandId: randomUUID(),
    };
    let paying = await orderCall("order.pay", payCommand);
    assert.equal(paying.status, "processing");
    assert.deepEqual(await orderCall("order.pay", payCommand), paying);
    await processor.runOnce();
    const operation = await paymentCall("payment.get", {
      paymentUuid: paying.paymentUuid,
      orderUuid: payingDraft.uuid,
    });
    assert.equal(operation.provider, "test");
    assert.equal(operation.status, "processing");
    assert.equal(operation.amount, payingDraft.snapshot.itemsTotal);
    const originalDeadline = paying.paymentDueAt;
    const failed = {
      paymentUuid: paying.paymentUuid,
      orderUuid: payingDraft.uuid,
      commandId: randomUUID(),
      outcome: "failed",
    };
    await paymentCall("payment.test.result", failed);
    const readyAgain = await until(
      () =>
        orderCall("order.get", { ...payingScope, orderUuid: payingDraft.uuid }),
      (value) => value.status === "ready",
    );
    assert.equal(readyAgain.paymentDueAt, originalDeadline);
    const previousPayment = paying.paymentUuid;
    paying = await orderCall("order.pay", {
      ...payCommand,
      commandId: randomUUID(),
    });
    assert.notEqual(paying.paymentUuid, previousPayment);
    await processor.runOnce();
    await order.db.query(
      "UPDATE orders SET payment_due_at=now()-interval '1 day' WHERE uuid=$1",
      [payingDraft.uuid],
    );
    await processor.runOnce();
    assert.equal(
      (
        await orderCall("order.get", {
          ...payingScope,
          orderUuid: payingDraft.uuid,
        })
      ).status,
      "processing",
    );
    const testResult = {
      paymentUuid: paying.paymentUuid,
      orderUuid: payingDraft.uuid,
      commandId: randomUUID(),
      outcome: "succeeded",
    };
    await paymentCall("payment.test.result", testResult);
    await paymentCall("payment.test.result", testResult);
    const paid = await until(
      () =>
        orderCall("order.get", { ...payingScope, orderUuid: payingDraft.uuid }),
      (value) => value.status === "paid",
    );
    assert.equal(paid.paymentProvider, "test");
    assert.deepEqual(await inventory(), { quantity: 5, reserved: 1 });

    const secondScope = { ownerUuid: randomUUID(), shopUuid };
    await cartCall("cart.item.add", {
      ...secondScope,
      recordUuid: records[1],
      quantity: 1,
      idempotencyKey: randomUUID(),
    });
    const secondCart = await cartCall("cart.get", secondScope);
    const secondDraft = await orderCall("order.draft.create", {
      ...secondScope,
      cartUuid: secondCart.uuid,
      commandId: randomUUID(),
      items: [
        {
          recordUuid: records[1],
          quantity: 1,
          expectedItemVersion: secondCart.items[0].version,
        },
      ],
    });
    await store.db.query(
      "UPDATE record_inventory SET quantity=0 WHERE record_uuid=$1",
      [records[1]],
    );
    await orderCall("order.confirm", {
      ...secondScope,
      orderUuid: secondDraft.uuid,
      commandId: randomUUID(),
      email: "buyer@example.org",
    });
    for (let i = 0; i < 4; i++) await processor.runOnce();
    assert.equal(
      (
        await orderCall("order.get", {
          ...secondScope,
          orderUuid: secondDraft.uuid,
        })
      ).status,
      "rejected",
    );
    const retained = await cartCall("cart.get", secondScope);
    assert.equal(retained.items.length, 1);
    assert.equal(retained.items[0].checkoutUuid, null);
    console.log(
      "PASS: Cart → Order → Store reserve → selected Cart removal; fixed agreement; test Payment processing → paid via real outbox; reserve retained; ready-only expiry; stock rejection leaves Cart intact",
    );
  } finally {
    for (const client of clients) client.close();
    for (const app of apps.reverse()) await app.close();
    if (channel) {
      for (const queue of Object.values(queues))
        await channel.deleteQueue(queue);
      await channel.deleteQueue(orderEventQueue);
      await channel.deleteQueue(`${orderEventQueue}.dead`);
      await channel.deleteExchange(`${orderEventQueue}.dead.exchange`);
      await channel.deleteExchange(exchange);
      await channel.close();
    }
    await broker?.close();
    for (const { db, schema } of databases.reverse()) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
    for (const name of Object.keys(process.env))
      if (!(name in previousEnv)) delete process.env[name];
    Object.assign(process.env, previousEnv);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
