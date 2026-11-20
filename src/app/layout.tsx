import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "./pwa-register";

export const metadata: Metadata = {
  title: "SDMA Office OS",
  description: "Shah Digital Marketing Agency — Office Operations Platform",
  applicationName: "SDMA Office OS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SDMA Office OS" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" }
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<PwaRegister /></body></html>;
}