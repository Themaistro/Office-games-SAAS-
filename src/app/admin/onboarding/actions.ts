"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

type InviteResult = { email: string; status: "invited" | "skipped" | "failed"; reason?: string };

function parseCsvLine(line: string) {
  return line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
}

export async function inviteRoster(file: File): Promise<{ results: InviteResult[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Admins only");
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
  const admin = createAdminClient();

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
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName || email.split("@")[0] },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    });
    results.push(error
      ? { email, status: "failed", reason: error.message }
      : { email, status: "invited" });
  }
  return { results };
}
