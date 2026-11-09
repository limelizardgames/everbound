"use client";
import { sb, must } from "@/lib/supabase";
import { useData } from "@/lib/useData";
import { Guard, Loading, useTitle } from "@/components/Guard";
import { PageHeader } from "@/components/ui";
import { dateTime } from "@/lib/format";

type Log = { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; details: unknown; created_at: string };

export default function Page() {
  return <Guard min="admin"><Audit /></Guard>;
}

function Audit() {
  useTitle("Audit Log");
  const { data } = useData(async () => {
    const [logs, people] = await Promise.all([
      must(sb().from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)),
      must(sb().from("profiles").select("id, display_name")),
    ]);
    return { logs: logs as Log[], name: new Map((people as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name])) };
  }, []);
  if (!data) return <Loading />;
  const { logs, name } = data;
  return (
    <div>
      <PageHeader eyebrow="Append-only" title="Audit Log">Every sensitive action — rewards, card changes, roles, raid overrides — is recorded here and cannot be edited.</PageHeader>
      <div className="panel overflow-x-auto p-0">
        <table className="table-eb">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-xs">{dateTime(l.created_at)}</td>
                <td>{l.actor_id ? name.get(l.actor_id) ?? l.actor_id.slice(0, 8) : "system"}</td>
                <td className="font-mono text-xs">{l.action}</td>
                <td className="text-xs">{l.entity_type}{l.entity_id ? ` ${String(l.entity_id).slice(0, 8)}` : ""}</td>
                <td className="max-w-md truncate font-mono text-[11px] text-parchment/70">{JSON.stringify(l.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
