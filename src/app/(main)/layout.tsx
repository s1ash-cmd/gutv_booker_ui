import "@/app/styles/globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Analytics } from "@vercel/analytics/next"
import { ClientThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import type { Metadata } from "next";
import { Open_Sans, Roboto } from "next/font/google";
import type { ReactNode } from "react";

const openSans = Open_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-opensans",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin", "cyrillic"],
  weight: ["100", "300", "400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

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
      <body
        className={`${openSans.variable} ${roboto.variable} antialiased min-h-screen flex flex-col bg-background text-foreground`}
      >
        <ClientThemeProvider>
          <AuthProvider>
            <Header />

            <main className="flex-1 flex flex-col">
              {children}
              <Analytics />
            </main>

            <Footer />
          </AuthProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
