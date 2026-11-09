import { requireViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { PortalNav } from "@/components/PortalNav";
import { SetupNotice } from "@/components/SetupNotice";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const viewer = await requireViewer();
  return (
    <div className="container-eb py-8">
      <PortalNav unread={viewer.unread} />
      {children}
    </div>
  );
}
