import type { ComponentPropsWithoutRef } from "react";

/** Shared surfaces use theme tokens; game-specific content lives inside them. */
export function Surface({
  className = "",
  tone = "card",
  ...props
}: ComponentPropsWithoutRef<"section"> & { tone?: "card" | "game" }) {
  const appearance =
    tone === "game"
      ? "bg-card/35 border-border/60 rounded-3xl"
      : "bg-card border-border rounded-2xl";
  return (
    <section
      {...props}
      className={`min-w-0 border shadow-sm ${appearance} ${className}`}
    />
  );
}
