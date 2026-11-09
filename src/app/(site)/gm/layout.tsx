"use client";
import { Guard } from "@/components/Guard";
import { GmNav } from "@/components/GmNav";

export default function GmLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard min="game_master">
      <div className="container-eb py-8">
        <GmNav />
        {children}
      </div>
    </Guard>
  );
}
