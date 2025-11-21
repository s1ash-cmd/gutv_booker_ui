import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: "GUtv booker",
    description: "Сайт для бронирования оборудования студии GUtv",
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
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-oid="m8ap8.o">
      <body className="antialiased" data-oid="og85d8w">
        {children}
      </body>
    </html>
  );
}
