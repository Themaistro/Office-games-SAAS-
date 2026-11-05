export type AppearanceTheme = "original" | "combined";
export const APPEARANCE_COOKIE = "office-games-appearance";
export function resolveAppearance(value: unknown): AppearanceTheme {
  return value === "original" ? "original" : "combined";
}
