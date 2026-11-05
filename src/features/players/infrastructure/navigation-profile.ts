import "server-only";
import { query } from "../../../server/database/connection";

export async function navigationProfile(userId: string) {
  return (
    (await query("SELECT * FROM profiles WHERE id=$1", [userId])).rows[0] ??
    null
  );
}
