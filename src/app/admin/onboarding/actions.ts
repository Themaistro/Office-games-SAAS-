"use server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { createHash, randomBytes } from "node:crypto";

type InviteResult = { email: string; status: "invited" | "skipped" | "failed"; reason?: string; invitationPath?: string };

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

export async function inviteRoster(file: File, allowedDomain: string): Promise<{ results: InviteResult[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  if (profiles[0]?.role !== "admin") throw new Error("Admins only");
  const corporateDomain = typeof allowedDomain === "string" ? allowedDomain.trim().toLowerCase() : "";
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(corporateDomain)) return { results: [], error: "Enter the company email domain you want to invite, such as example.com." };
  if (!file || file.size > 1024 * 1024) return { results: [], error: "CSV must be smaller than 1 MB." };

  const lines = (await file.text()).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return { results: [], error: "CSV must include a header and at least one employee." };
  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const emailIndex = headers.indexOf("email");
  const nameIndex = headers.indexOf("full_name");
  if (emailIndex < 0 || nameIndex < 0) return { results: [], error: "CSV needs email and full_name headers." };
  if (lines.length - 1 > 500) return { results: [], error: "Maximum 500 employees per upload." };

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
    if (!fullName?.trim()) {
      results.push({ email, status: "failed", reason: "Full name is required" });
      continue;
    }
    if (corporateDomain && email.split("@")[1] !== corporateDomain) {
      results.push({ email, status: "skipped", reason: "Outside the approved company domain" });
      continue;
    }
    if (emails.has(email)) {
      results.push({ email, status: "skipped", reason: "Duplicate in upload" });
      continue;
    }
    emails.add(email);
    try {
      const existing = await query("SELECT id FROM users WHERE lower(email)=$1 LIMIT 1", [email]);
      if (existing.rowCount) { results.push({ email, status: "skipped", reason: "Already has an account" }); continue; }
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await query(`INSERT INTO invitations (email, full_name, invited_by, token_hash, expires_at)
        VALUES ($1, $2, $3, $4, now() + interval '7 days')
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, invited_by = EXCLUDED.invited_by, token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, accepted_at = NULL`, [email, fullName || email.split("@")[0], user.id, tokenHash]);
      results.push({ email, status: "invited", invitationPath: `/register?invite=${encodeURIComponent(token)}` });
    } catch (error) { results.push({ email, status: "failed", reason: error instanceof Error ? error.message : "Could not create invitation" }); }
  }
  return { results };
}

