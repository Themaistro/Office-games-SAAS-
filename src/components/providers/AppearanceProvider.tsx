"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  APPEARANCE_COOKIE,
  resolveAppearance,
  type AppearanceTheme,
} from "@/lib/appearance";

const AppearanceContext = createContext<{
  theme: AppearanceTheme;
  setTheme: (theme: AppearanceTheme) => void;
} | null>(null);

export default function AppearanceProvider({
  initialTheme,
  children,
}: {
  initialTheme: AppearanceTheme;
  children: ReactNode;
}) {
  const [theme, updateTheme] = useState(initialTheme);
  function setTheme(value: AppearanceTheme) {
    const next = resolveAppearance(value);
    document.documentElement.dataset.officeTheme = next;
    // Presentation preference only; never shares a name with authentication cookies.
    document.cookie = `${APPEARANCE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    updateTheme(next);
  }
  return (
    <AppearanceContext.Provider value={{ theme, setTheme }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("AppearanceProvider is required");
  return context;
}
