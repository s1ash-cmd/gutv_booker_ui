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
      <body className="flex min-h-dvh flex-col overflow-y-auto antialiased">
        <ClientThemeProvider>
          <AuthProvider>
            <main className="flex min-h-dvh w-full flex-1 items-center justify-center py-4">
              {children}
              <Analytics />
            </main>
          </AuthProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
