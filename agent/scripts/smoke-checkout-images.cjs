#!/usr/bin/env node

// Check deployment artifacts in a private Docker network, without host ports or working volumes.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { resolve, join } = require("node:path");

const workspace = resolve(__dirname, "../..");
const prefix = `sellgar-checkout-image-${randomBytes(6).toString("hex")}`;
const directory = mkdtempSync(join(tmpdir(), `${prefix}-`));
const password = randomBytes(32).toString("hex");
const containers = [];
let networkCreated = false;

function docker(args, input) {
  try {
    return execFileSync("docker", args, {
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(
      `Docker ${args[0]} failed: ${String(error.stderr ?? error.message).replaceAll(password, "[redacted]")}`,
    );
  }
}

function environment(name, values) {
  const path = join(directory, name);
  writeFileSync(
    path,
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  return path;
}

async function until(read, ready, label) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const value = read();
      if (ready(value)) return value;
    } catch {}
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`${label} did not become ready`);
}

function start(name, image, args = []) {
  containers.push(name);
  return docker([
    "run",
    "-d",
    "--name",
    name,
    "--network",
    prefix,
    ...args,
    image,
  ]).trim();
}

function status(name) {
  return Number(
    docker([
      "exec",
      name,
      "node",
      "-e",
      "fetch('http://127.0.0.1:8080/health').then(r=>console.log(r.status)).catch(()=>process.exit(1))",
    ]).trim(),
  );
}

async function main() {
  docker(["network", "create", "--internal", prefix]);
  networkCreated = true;
  const postgres = `${prefix}-postgres`;
  const rabbit = `${prefix}-rabbit`;
  start(postgres, "postgres:16-bookworm", [
    "--env-file",
    environment("postgres.env", {
      POSTGRES_USER: "smoke",
      POSTGRES_PASSWORD: password,
    }),
  ]);
  start(rabbit, "rabbitmq:4.4.1-management", [
    "--env-file",
    environment("rabbit.env", {
      RABBITMQ_DEFAULT_USER: "smoke",
      RABBITMQ_DEFAULT_PASS: password,
    }),
  ]);
  await until(
    () => docker(["exec", postgres, "pg_isready", "-U", "smoke"]),
    (value) => value.includes("accepting connections"),
    "PostgreSQL",
  );
  await until(
    () =>
      docker([
        "exec",
        rabbit,
        "rabbitmq-diagnostics",
        "-q",
        "check_port_connectivity",
      ]),
    () => true,
    "RabbitMQ",
  );

  for (const service of ["order", "payment"]) {
    docker(
      [
        "exec",
        "-i",
        postgres,
        "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "smoke",
        "-d",
        "smoke",
      ],
      `CREATE ROLE ${service}_srv LOGIN PASSWORD '${password}';\nCREATE DATABASE ${service}_srv OWNER ${service}_srv;\n`,
    );
    const values = readFileSync(
      resolve(
        workspace,
        `backend/service/sellgar.${service}.service/helm/dev/values.yaml`,
      ),
      "utf8",
    );
    const config =
      values
        .split("  data: |\n")[1]
        .split("\n")
        .filter(Boolean)
        .map((line) => line.slice(4))
        .join("\n") + "\n";
    const configPath = join(directory, `${service}.env`);
    writeFileSync(configPath, config, { mode: 0o444 });
    const secrets = environment(`${service}-secrets.env`, {
      DATABASE_HOST: postgres,
      DATABASE_USERNAME: `${service}_srv`,
      DATABASE_PASSWORD: password,
      AMQP_HOSTNAME: rabbit,
      AMQP_USERNAME: "smoke",
      AMQP_PASSWORD: password,
    });
    const runtime = [
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=32m",
      "--env-file",
      secrets,
      "--mount",
      `type=bind,source=${configPath},target=/app/.env,readonly`,
    ];
    for (let attempt = 0; attempt < 2; attempt++) {
      const migration = `${prefix}-${service}-migration-${attempt}`;
      containers.push(migration);
      const output = docker([
        "run",
        "--rm",
        "--name",
        migration,
        "--network",
        prefix,
        ...runtime,
        `sellgar-${service}-deploy:migration`,
      ]);
      assert.match(
        output,
        attempt === 0 ? /executed successfully/ : /No migrations are pending/,
      );
    }
    const image = `sellgar-${service}-deploy:application`;
    const name = `${prefix}-${service}`;
    start(name, image, runtime);
    await until(
      () => status(name),
      (value) => value === 200,
      `${service} HTTP readiness`,
    );
    assert.equal(docker(["exec", name, "id", "-u"]).trim(), "1000");
    docker([
      "exec",
      name,
      "node",
      "-e",
      "const fs=require('node:fs'); require('@sellgar/outbox'); if(fs.existsSync('dist/database/migrations') || fs.existsSync('dist/database/data-source.js') || fs.existsSync('node_modules/typescript')) process.exit(1)",
    ]);
    console.log(
      `PASS: ${service}: migration + repeat with non-superuser, production dependencies, non-root/read-only startup, /health=200`,
    );
  }

  docker(["stop", "--time", "10", rabbit]);
  for (const service of ["order", "payment"]) {
    await until(
      () => status(`${prefix}-${service}`),
      (value) => value === 503,
      `${service} readiness after broker shutdown`,
    );
  }
  console.log("PASS: broker disconnect makes Order and Payment unready (503)");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const name of containers.reverse()) {
      try {
        docker(["rm", "-fv", name]);
      } catch {}
    }
    if (networkCreated) {
      try {
        docker(["network", "rm", prefix]);
      } catch {}
    }
    rmSync(directory, { recursive: true, force: true });
  });
