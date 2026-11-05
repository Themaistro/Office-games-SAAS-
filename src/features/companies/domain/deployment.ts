export const DEVELOPMENT_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export function validateCompanyIdentity(
  expected: string,
  actual: string | undefined,
) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      expected,
    )
  ) {
    throw new Error("OFFICE_GAMES_COMPANY_ID must be a UUID.");
  }
  if (actual !== expected)
    throw new Error(
      "Company database identity mismatch. Refusing database access.",
    );
}
