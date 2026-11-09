import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { PageHeader, StatusPill } from "@/components/ui";
import { WorldMap } from "@/components/WorldMap";
import { SetupNotice } from "@/components/SetupNotice";
import type { Location } from "@/lib/types";

export const metadata = { title: "Explore the World" };
export const dynamic = "force-dynamic";

export default async function WorldPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const supabase = await createClient();
  const [{ data }, { data: flags }] = await Promise.all([
    supabase.from("locations").select("*").order("region").order("name"),
    supabase.from("world_flags").select("key, label, value").eq("is_public", true),
  ]);
  const locations = (data ?? []) as Location[];
  const regions = [...new Set(locations.map((l) => l.region))];
  return (
    <div className="container-eb py-12">
      <PageHeader eyebrow="Atlas of the realm" title="Explore the World">
        Locations appear here as the Guild discovers them. Their status changes with every adventure — the world remembers what its players have done.
      </PageHeader>
      <WorldMap locations={locations} />
      {flags && flags.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {flags.map((f) => (
            <div key={f.key} className="panel py-3 text-center">
              <div className="text-[10px] uppercase tracking-[0.2em] text-parchment/60">{f.label}</div>
              <div className="font-display text-2xl text-arcane-light">{f.value}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-10 grid gap-8">
        {regions.map((r) => (
          <section key={r}>
            <h2 className="heading text-xl">{r}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {locations.filter((l) => l.region === r).map((l) => (
                <Link key={l.id} href={`/world/${l.slug}`} className="panel block hover:border-gold/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg text-gold-light">{l.name}</span>
                    <StatusPill status={l.status} />
                  </div>
                  <p className="muted mt-2 text-sm">{l.summary}</p>
                  {l.threat && <p className="mt-2 text-xs text-gold">Threat: {l.threat}</p>}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
