export type LoginAccount = {
  id: string;
  password_hash: string | null;
  is_active: boolean;
};
export type AuthenticationPort = {
  consume(
    scope: string,
    subject: string,
    limit: number,
    seconds: number,
  ): Promise<boolean>;
  find(email: string): Promise<LoginAccount | undefined>;
  compare(password: string, hash: string | null): Promise<boolean>;
};

export async function authenticate(
  input: { email: string; password: string },
  port: AuthenticationPort,
): Promise<{ userId: string } | { error: string }> {
  const globalAllowed = await port.consume("login-total", "company", 300, 60);
  if (!globalAllowed)
    return {
      error: "Too many attempts. Please wait a few minutes and try again.",
    };
  const accountAllowed = await port.consume(
    "login-account",
    input.email,
    10,
    600,
  );
  if (!accountAllowed)
    return {
      error: "Too many attempts. Please wait a few minutes and try again.",
    };
  const account = await port.find(input.email);
  const valid = await port.compare(
    input.password,
    account?.password_hash ?? null,
  );
  if (!account || !valid || !account.is_active)
    return { error: "Invalid email or password. Please try again." };
  return { userId: account.id };
}
