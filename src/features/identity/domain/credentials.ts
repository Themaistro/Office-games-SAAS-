export function textField(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

export function parseCredentials(form: FormData) {
  const rawEmail = textField(form.get("email"), 254);
  const password = textField(form.get("password"), 256);
  const email = rawEmail?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password)
    return null;
  // bcrypt only distinguishes the first 72 UTF-8 bytes. Never silently truncate.
  if (new TextEncoder().encode(password).length > 72) return null;
  return { email, password };
}

export function parseRegistration(form: FormData) {
  const credentials = parseCredentials(form);
  const fullName = textField(form.get("full_name"), 100)?.trim();
  const department = textField(form.get("department"), 150)?.trim();
  const position = textField(form.get("position"), 100)?.trim();
  const invitationToken = textField(form.get("invitation_token") ?? "", 256);
  if (
    !credentials ||
    credentials.password.length < 6 ||
    !fullName ||
    fullName.length < 2 ||
    fullName.length > 50 ||
    !department ||
    !position ||
    position.length < 2 ||
    position.length > 50 ||
    invitationToken === null
  )
    return null;
  return { ...credentials, fullName, department, position, invitationToken };
}
export function resolveRegistrationMode(value?: string) {
  const mode = value ?? "open";
  if (mode !== "open" && mode !== "invite")
    throw new Error("Invalid registration mode");
  return mode;
}
