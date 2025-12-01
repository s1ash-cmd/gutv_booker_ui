import "@/app/styles/globals.css";

import Providers from "@/app/providers"
import { ClientThemeProvider } from "@/components/ThemeProvider";
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
        <Providers>
          <ClientThemeProvider>
            <main className="flex-1 flex flex-col">
              {children}
            </main>
          </ClientThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
