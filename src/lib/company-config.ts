import { DEVELOPMENT_COMPANY_ID } from "../features/companies/domain/deployment";

// Public ID only; this value is not a credential. Namespace realtime on both sides.
export function getPublicCompanyId() {
  return (
    process.env.NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID || DEVELOPMENT_COMPANY_ID
  );
}

export function getServerCompanyId() {
  const id = process.env.OFFICE_GAMES_COMPANY_ID;
  if (
    process.env.NODE_ENV === "production" &&
    (!id || !process.env.NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID)
  ) {
    throw new Error(
      "Set server and public company IDs before deploying Office Games.",
    );
  }
  const expected = id || DEVELOPMENT_COMPANY_ID;
  if (expected !== getPublicCompanyId())
    throw new Error("Server and public company IDs must match.");
  return expected;
}
