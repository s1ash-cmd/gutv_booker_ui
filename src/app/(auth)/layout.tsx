import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClientThemeProvider } from "@/components/ThemeProvider";
import "@/app/styles/globals.css";
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
      <body className="antialiased h-screen flex flex-col overflow-hidden">
        <ClientThemeProvider>
          <AuthProvider>
            <main className="flex-1 flex items-center justify-center overflow-hidden">
              {children}
              <Analytics />
            </main>
          </AuthProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
