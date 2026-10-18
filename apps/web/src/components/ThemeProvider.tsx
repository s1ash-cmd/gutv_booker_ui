"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function ClientThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
      {children}
    </ThemeProvider>
  );
}
