"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function SwithThemeButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="px-4 py-2 bg-primary-500 rounded"
    >
      {theme === "dark" ? "выбрана dark" : "выбрана light"}
    </button>
  );
}
