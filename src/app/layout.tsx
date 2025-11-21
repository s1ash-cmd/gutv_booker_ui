import type { Metadata } from "next";
import { Open_Sans, Roboto } from "next/font/google";
import "./globals.css";

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
    <body className={`${openSans.variable} ${roboto.variable} antialiased`}>
        {children}
    </body>
    </html>
  );
}
