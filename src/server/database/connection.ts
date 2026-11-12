import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { validateCompanyIdentity } from "../../features/companies/domain/deployment";
import { getServerCompanyId } from "../../lib/company-config";
import { logServerFailure } from "../observability";
import { databasePoolOptions, assertRestrictedRuntimeRole } from "./options";
import { attachDatabasePool } from "@vercel/functions/db-connections";

const unusableConnections = new WeakSet<PoolClient>();
let lastSlowQueryLog = 0;
const queryMetrics = {
  completed: 0,
  failed: 0,
  totalExecutionMs: 0,
  totalQueueMs: 0,
};

async function rollback(client: PoolClient, statement = "ROLLBACK") {
  try {
    await client.query(statement);
  } catch (error) {
    unusableConnections.add(client);
    logServerFailure("database.rollback", error);
  }
}

export function databasePoolMetrics() {
  const pool = getPool();
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    queries: { ...queryMetrics },
  };
}

const verifiedConnections = new WeakMap<
  PoolClient,
  { companyId: string; expiresAt: number }
>();

async function connectClient() {
  const raw = await getPool().connect();
  try {
    const expected = getServerCompanyId();
    const verified = verifiedConnections.get(raw);
    if (
      !verified ||
      verified.companyId !== expected ||
      verified.expiresAt < Date.now()
    ) {
      const { rows } = await raw.query<{
        company_id: string;
        rolsuper: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolbypassrls: boolean;
        owns_tables: boolean;
        database_role: string;
      }>(
        `SELECT d.company_id,r.rolname AS database_role,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,
          pg_has_role(current_user,(SELECT relowner FROM pg_class WHERE oid='public.profiles'::regclass),'USAGE') AS owns_tables
         FROM deployment_identity d CROSS JOIN pg_roles r WHERE d.id=1 AND r.rolname=current_user`,
      );
      validateCompanyIdentity(expected, rows[0]?.company_id);
      if (process.env.NODE_ENV === "production") {
        try {
          assertRestrictedRuntimeRole(rows[0]);
        } catch (error) {
          console.error("Runtime database permissions rejected", {
            role: rows[0]?.database_role,
            superuser: rows[0]?.rolsuper,
            createDatabase: rows[0]?.rolcreatedb,
            createRole: rows[0]?.rolcreaterole,
            bypassRowSecurity: rows[0]?.rolbypassrls,
            ownsTables: rows[0]?.owns_tables,
          });
          throw error;
        }
      }
      verifiedConnections.set(raw, {
        companyId: expected,
        expiresAt: Date.now() + 60_000,
      });
    }
    return serializeClient(raw);
  } catch (error) {
    raw.release(
      error instanceof Error
        ? error
        : new Error("Company identity validation failed"),
    );
    throw error;
  }
}

// A request holding a database lock must perform its work on that connection.
const connections = new AsyncLocalStorage<{
  client: PoolClient;
  inTransaction: boolean;
}>();
let savepointSequence = 0;

// pg connections execute one statement at a time. Queue Promise.all callers
// explicitly rather than relying on pg's deprecated implicit query queue.
function serializeClient(client: PoolClient): PoolClient {
  let pending: Promise<unknown> = Promise.resolve();
  return new Proxy(client, {
    get(target, property) {
      if (property === "query")
        return (...args: unknown[]) => {
          const queuedAt = performance.now();
          const next = pending.then(async () => {
            const started = performance.now();
            const queueMs = started - queuedAt;
            try {
              return await Reflect.apply(target.query, target, args);
            } catch (error) {
              queryMetrics.failed++;
              throw error;
            } finally {
              const executionMs = performance.now() - started;
              queryMetrics.completed++;
              queryMetrics.totalExecutionMs += executionMs;
              queryMetrics.totalQueueMs += queueMs;
              if (
                (executionMs > 1000 || queueMs > 1000) &&
                Date.now() - lastSlowQueryLog > 60000
              ) {
                lastSlowQueryLog = Date.now();
                console.warn("Slow database operation", {
                  executionMs: Math.round(executionMs),
                  queueMs: Math.round(queueMs),
                  pool: databasePoolMetrics(),
                });
              }
            }
          });
          pending = next.then(
            () => undefined,
            () => undefined,
          );
          return next;
        };
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

declare global {
  var postgresPool: Pool | undefined;
}

function getPool() {
  if (global.postgresPool) return global.postgresPool;
  const pool = new Pool(databasePoolOptions(process.env));
  pool.on("error", () =>
    console.error("An idle database connection was lost."),
  );
  if (process.env.VERCEL === "1") attachDatabasePool(pool);
  // Reuse one pool per worker in production too; creating a pool per query
  // leaks connections and can exhaust PostgreSQL under normal traffic.
  global.postgresPool = pool;
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  try {
    const scoped = connections.getStore();
    if (scoped) {
      if (unusableConnections.has(scoped.client))
        throw new Error("Transaction connection is no longer usable");
      return await scoped.client.query<T>(text, values);
    }
    const client = await connectClient();
    try {
      return await client.query<T>(text, values);
    } finally {
      client.release();
    }
  } catch (error) {
    // Next's development error renderer cannot serialize Node's connection
    // AggregateError reliably. Preserve a regular Error for callers to handle.
    if (error instanceof AggregateError) {
      throw new Error("Database connection unavailable");
    }
    throw error;
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
) {
  const existing = connections.getStore();
  if (existing) {
    const savepoint = `nested_${++savepointSequence}`;
    await existing.client.query(
      existing.inTransaction ? `SAVEPOINT ${savepoint}` : "BEGIN",
    );
    try {
      const result = await connections.run(
        { client: existing.client, inTransaction: true },
        () => callback(existing.client),
      );
      await existing.client.query(
        existing.inTransaction ? `RELEASE SAVEPOINT ${savepoint}` : "COMMIT",
      );
      return result;
    } catch (error) {
      await rollback(
        existing.client,
        existing.inTransaction
          ? `ROLLBACK TO SAVEPOINT ${savepoint}`
          : "ROLLBACK",
      );
      throw error;
    }
  }
  const client = await connectClient();
  try {
    await client.query("BEGIN");
    const result = await connections.run({ client, inTransaction: true }, () =>
      callback(client),
    );
    if (unusableConnections.has(client))
      throw new Error("Transaction connection is no longer usable");
    const committed = await client.query("COMMIT");
    if (committed.command !== "COMMIT")
      throw new Error("Transaction did not commit");
    return result;
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release(
      unusableConnections.has(client)
        ? new Error("Transaction connection discarded")
        : undefined,
    );
  }
}

export async function withDatabaseLock<T>(
  key: string,
  callback: () => Promise<T>,
) {
  if (connections.getStore())
    throw new Error(
      "Acquire database locks before opening a transaction or another lock.",
    );
  for (let attempt = 0; attempt < 200; attempt++) {
    const client = await connectClient();
    let failed: Error | undefined;
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS locked",
        [key],
      );
      if (rows[0].locked) {
        const result = await connections.run(
          { client, inTransaction: true },
          callback,
        );
        const committed = await client.query("COMMIT");
        if (committed.command !== "COMMIT")
          throw new Error("Mission transaction did not commit");
        return result;
      }
      await client.query("ROLLBACK");
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        failed =
          rollbackError instanceof Error
            ? rollbackError
            : new Error("Rollback failed");
      }
      throw error;
    } finally {
      client.release(failed);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    "Your mission is being prepared in another tab. Please try again shortly.",
  );
}
