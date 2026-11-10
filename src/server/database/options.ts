import type { PoolConfig } from "pg";

type Environment = Record<string, string | undefined>;
function bounded(
  env: Environment,
  name: string,
  fallback: number,
  min: number,
  max: number,
) {
  const value = Number(env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name} must be between ${min} and ${max}`);
  return value;
}

export function databasePoolOptions(env: Environment): PoolConfig {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required at runtime");
  const url = new URL(env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL must use PostgreSQL");
  const privateHost = [
    "localhost",
    "127.0.0.1",
    "[::1]",
    "postgres",
    "host.docker.internal",
  ].includes(url.hostname);
  if (!privateHost) {
    if (url.searchParams.get("sslmode") === "disable")
      throw new Error(
        "TLS may not be disabled for public database connections",
      );
    url.searchParams.set("sslmode", "verify-full");
  }
  const mode =
    env.DATABASE_CONNECTION_MODE ??
    (url.hostname.includes("-pooler.") ? "transaction" : "direct");
  if (!["direct", "transaction"].includes(mode))
    throw new Error("Invalid database connection mode");
  const statement = bounded(
    env,
    "DATABASE_STATEMENT_TIMEOUT_MS",
    15000,
    100,
    300000,
  );
  const lock = bounded(env, "DATABASE_LOCK_TIMEOUT_MS", 5000, 100, 300000);
  const idle = bounded(
    env,
    "DATABASE_IDLE_TRANSACTION_TIMEOUT_MS",
    15000,
    100,
    300000,
  );
  return {
    connectionString: url.toString(),
    max: bounded(env, "DATABASE_POOL_MAX", 10, 1, 100),
    idleTimeoutMillis: 5000,
    maxLifetimeSeconds: 300,
    allowExitOnIdle: true,
    connectionTimeoutMillis: 5000,
    application_name: "office-games",
    // Transaction-pooling installations use operator-provisioned role defaults.
    statement_timeout: mode === "direct" ? statement : undefined,
    lock_timeout: mode === "direct" ? lock : undefined,
    idle_in_transaction_session_timeout: mode === "direct" ? idle : undefined,
    ssl:
      !privateHost || env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: true }
        : undefined,
  };
}

export type RuntimeRole = {
  rolsuper: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolbypassrls: boolean;
  owns_tables: boolean;
};
export function assertRestrictedRuntimeRole(role: RuntimeRole) {
  if (
    [
      role.rolsuper,
      role.rolcreatedb,
      role.rolcreaterole,
      role.rolbypassrls,
      role.owns_tables,
    ].some((flag) => flag !== false)
  )
    throw Object.assign(
      new Error("Use a restricted application database role"),
      { name: "UnsafeDatabaseRoleError" },
    );
}
