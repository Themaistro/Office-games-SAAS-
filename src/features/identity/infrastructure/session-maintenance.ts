import "server-only";
import { runMaintenance } from "@/server/database/maintenance";

export function cleanExpiredIdentityRecords() {
  return runMaintenance("identity-expiry", 60, async (client) => {
    await client.query(
      "DELETE FROM sessions WHERE id IN (SELECT id FROM sessions WHERE expires_at<=now() ORDER BY expires_at LIMIT 1000)",
    );
    await client.query(
      "DELETE FROM authentication_attempts WHERE bucket IN (SELECT bucket FROM authentication_attempts WHERE expires_at<=now() ORDER BY expires_at LIMIT 5000)",
    );
  });
}
