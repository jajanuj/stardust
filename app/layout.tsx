import type { Metadata, Viewport } from "next";
import "./globals.css";
import SWRegister from "./sw-register";

export const metadata: Metadata = {
  title: "StarDuty 星際學院",
  description: "親子任務獎勵系統 — 完成星際任務，賺取星塵，兌換獎勵",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "StarDuty" },
};

export const viewport: Viewport = {
  themeColor: "#7c5cff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <SWRegister />
      </body>
    </html>
  );
}
