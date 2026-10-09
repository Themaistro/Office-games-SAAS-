"use server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { createHash, randomBytes } from "node:crypto";

type InviteResult = { email: string; status: "invited" | "skipped" | "failed"; reason?: string };

function parseCsvLine(line: string) {
  return line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
}

export async function inviteRoster(file: File): Promise<{ results: InviteResult[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  if (profiles[0]?.role !== "admin") throw new Error("Admins only");
  if (!file || file.size > 1024 * 1024) return { results: [], error: "CSV must be smaller than 1 MB." };

  const lines = (await file.text()).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return { results: [], error: "CSV must include a header and at least one employee." };
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const emailIndex = headers.indexOf("email");
  const nameIndex = headers.indexOf("full_name");
  if (emailIndex < 0 || nameIndex < 0) return { results: [], error: "CSV needs email and full_name headers." };
  if (lines.length - 1 > 500) return { results: [], error: "Maximum 500 employees per upload." };

  const corporateDomain = user.email?.split("@")[1]?.toLowerCase();
  const emails = new Set<string>();
  const results: InviteResult[] = [];
  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const email = values[emailIndex]?.toLowerCase();
    const fullName = values[nameIndex]?.slice(0, 80);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      results.push({ email: email || "unknown", status: "failed", reason: "Invalid email" });
      continue;
    }
    if (corporateDomain && email.split("@")[1] !== corporateDomain) {
      results.push({ email, status: "skipped", reason: "Outside admin corporate domain" });
      continue;
    }
    if (emails.has(email)) {
      results.push({ email, status: "skipped", reason: "Duplicate in upload" });
      continue;
    }
    emails.add(email);
    try {
      const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
      await query(`INSERT INTO invitations (email, full_name, invited_by, token_hash, expires_at)
        VALUES ($1, $2, $3, $4, now() + interval '7 days')
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, invited_by = EXCLUDED.invited_by, token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, accepted_at = NULL`, [email, fullName || email.split("@")[0], user.id, tokenHash]);
      results.push({ email, status: "invited" });
    } catch (error) { results.push({ email, status: "failed", reason: error instanceof Error ? error.message : "Could not create invitation" }); }
  }
  return { results };
}

