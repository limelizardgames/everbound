import type { Metadata, Viewport } from "next";
import "@fontsource/cinzel/500.css";
import "@fontsource/cinzel/600.css";
import "@fontsource/cinzel/700.css";
import "@fontsource-variable/inter/index.css";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import { ViewerProvider } from "@/lib/viewer";
import { ToastProvider } from "@/lib/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Everbound — The Living Adventurers Guild", template: "%s · Everbound" },
  description: "A persistent, real-world tabletop adventure connected through an online fantasy guild. Register, accept quests, earn renown and change the world.",
};

export const viewport: Viewport = { themeColor: "#101827", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ViewerProvider>
          <ToastProvider>{children}</ToastProvider>
        </ViewerProvider>
      </body>
    </html>
  );
}
