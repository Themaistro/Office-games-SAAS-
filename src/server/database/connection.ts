import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { validateCompanyIdentity } from "../../features/companies/domain/deployment";
import { getServerCompanyId } from "../../lib/company-config";

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
      const { rows } = await raw.query<{ company_id: string }>(
        "SELECT company_id FROM deployment_identity WHERE id=1",
      );
      validateCompanyIdentity(expected, rows[0]?.company_id);
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
          const next = pending.then(() =>
            Reflect.apply(target.query, target, args),
          );
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
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required at runtime");
  const max = Number(process.env.DATABASE_POOL_MAX ?? 10);
  if (!Number.isInteger(max) || max < 1 || max > 100) {
    throw new Error("DATABASE_POOL_MAX must be an integer between 1 and 100");
  }
  const pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: true }
        : undefined,
  });
  pool.on("error", () =>
    console.error("An idle database connection was lost."),
  );
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
    if (scoped) return await scoped.client.query<T>(text, values);
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
      await existing.client.query(
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
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
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
