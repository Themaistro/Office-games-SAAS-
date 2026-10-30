import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {

  var postgresPool: Pool | undefined;
}

function getPool() {
  if (global.postgresPool) return global.postgresPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required at runtime");
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });
  // Reuse one pool per worker in production too; creating a pool per query
  // leaks connections and can exhaust PostgreSQL under normal traffic.
  global.postgresPool = pool;
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  try {
    return await getPool().query<T>(text, values);
  } catch (error) {
    // Next's development error renderer cannot serialize Node's connection
    // AggregateError reliably. Preserve a regular Error for callers to handle.
    if (error instanceof AggregateError) {
      throw new Error("Database connection unavailable");
    }
    throw error;
  }
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function withDatabaseLock<T>(key: string, callback: () => Promise<T>) {
  // Failed contenders release their connections rather than exhausting the pool
  // while the lock holder performs work on another connection.
  for (let attempt = 0; attempt < 200; attempt++) {
    const client = await getPool().connect();
    let rows: {locked:boolean}[];
    try { ({rows} = await client.query<{locked:boolean}>("SELECT pg_try_advisory_lock(hashtext($1)) AS locked",[key])); }
    catch (error) { client.release(); throw error; }
    if (rows[0].locked) {
      try { return await callback(); }
      finally { try { await client.query("SELECT pg_advisory_unlock(hashtext($1))",[key]); } finally { client.release(); } }
    }
    client.release();
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("Your mission is being prepared in another tab. Please try again shortly.");
}

