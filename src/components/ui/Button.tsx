import type { ComponentPropsWithoutRef } from "react";

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const appearance = {
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    danger: "bg-destructive text-destructive-foreground",
  }[variant];
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 ${appearance} ${className}`}
    />
  );
}
