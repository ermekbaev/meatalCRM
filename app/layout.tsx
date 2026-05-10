import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextAuthProvider } from "@/components/providers/session-provider";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { IosInstallHint } from "@/components/IosInstallHint";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "ORIENT-LASER",
  description: "CRM-система ORIENT-LASER — лазерная резка металла",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ORIENT-LASER",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.className} antialiased bg-gray-50`} suppressHydrationWarning>
        <NextAuthProvider>{children}</NextAuthProvider>
        <ServiceWorkerRegistrar />
        <IosInstallHint />
      </body>
    </html>
  );
}
