import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import { ViewerProvider } from "@/lib/viewer";
import { ToastProvider } from "@/lib/toast";
import "./globals.css";

const display = Cinzel({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "Everbound — The Living Adventurers Guild", template: "%s · Everbound" },
  description: "A persistent, real-world tabletop adventure connected through an online fantasy guild. Register, accept quests, earn renown and change the world.",
};

export const viewport: Viewport = { themeColor: "#101827", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen">
        <ViewerProvider>
          <ToastProvider>{children}</ToastProvider>
        </ViewerProvider>
      </body>
    </html>
  );
}
