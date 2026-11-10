import "server-only";
import { withTransaction } from "./connection";
import type { PoolClient } from "pg";

/** A transaction-scoped, cross-worker lease; rollback also releases the claim. */
export function runMaintenance(
  name: string,
  seconds: number,
  work: (client: PoolClient) => Promise<void>,
) {
  return withTransaction(async (client) => {
    const lock = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS locked",
      [`maintenance:${name}`],
    );
    if (!lock.rows[0].locked) return;
    const claimed = await client.query(
      `INSERT INTO maintenance_leases(name,next_run_at) VALUES($1,now()+$2*interval '1 second')
       ON CONFLICT(name) DO UPDATE SET next_run_at=EXCLUDED.next_run_at
       WHERE maintenance_leases.next_run_at<=now() RETURNING name`,
      [name, seconds],
    );
    if (claimed.rowCount) await work(client);
  });
}
