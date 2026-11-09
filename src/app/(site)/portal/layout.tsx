"use client";
import { Guard } from "@/components/Guard";
import { PortalNav } from "@/components/PortalNav";
import { useViewer } from "@/lib/viewer";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { viewer } = useViewer();
  return (
    <Guard>
      <div className="container-eb py-8">
        <PortalNav unread={viewer?.unread ?? 0} />
        {children}
      </div>
    </Guard>
  );
}
