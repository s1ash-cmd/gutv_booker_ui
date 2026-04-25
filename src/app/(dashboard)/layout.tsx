import "@/app/styles/globals.css";

import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";
import { ClientThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "GUtv booker",
  description: "Бронирование оборудования студии GUtv",
  icons: {
    icon: [
      {
        url: "/favicon-dark.svg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-light.svg",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-background text-foreground">
        <ClientThemeProvider>
          <AuthProvider>
            <LayoutWrapper>
              <main className="flex-1 flex flex-col">
                {children}
                <Analytics />
              </main>
            </LayoutWrapper>
          </AuthProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
