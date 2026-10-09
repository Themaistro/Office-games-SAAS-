"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        id="password"
        name="password"
        type={showPassword ? "text" : "password"}
        required
        className="block w-full rounded-xl border border-border/60 bg-card pl-4 pr-12 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:text-sm shadow-sm"
        placeholder="••••••••"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1} // Don't interrupt tab flow
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
