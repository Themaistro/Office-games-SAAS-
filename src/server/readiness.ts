import "server-only";
import migrations from "../../db/runtime-migrations.json";
import { query } from "./database/connection";
import { logServerFailure } from "./observability";

export async function checkReadiness() {
  try {
    const { rows } = await query<{ name: string }>(
      "SELECT unnest($1::text[]) AS name EXCEPT SELECT name FROM schema_migrations",
      [migrations],
    );
    return {
      ready: rows.length === 0,
      missingMigrations: rows.map((row) => row.name),
    };
  } catch (error) {
    logServerFailure("readiness.database", error);
    return { ready: false, missingMigrations: [] as string[] };
  }
}
