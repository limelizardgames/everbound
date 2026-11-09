import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { GmNav } from "@/components/GmNav";
import { SetupNotice } from "@/components/SetupNotice";

export const dynamic = "force-dynamic";

export default async function GmLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  await requireRole("game_master");
  return (
    <div className="container-eb py-8">
      <GmNav />
      {children}
    </div>
  );
}
