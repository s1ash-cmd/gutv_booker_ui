"use client";

import { ThemeProvider } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";

export function ClientThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
      {children}
    </ThemeProvider>
  );
}
