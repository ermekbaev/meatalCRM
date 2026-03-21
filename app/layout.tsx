import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextAuthProvider } from "@/components/providers/session-provider";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "МеталлCRM",
  description: "CRM-система для металлообрабатывающего производства",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
