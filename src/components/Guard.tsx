"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useViewer } from "@/lib/viewer";
import { isSupabaseConfigured } from "@/lib/env";
import { roleAtLeast, type Role } from "@/lib/types";
import { SetupNotice } from "@/components/SetupNotice";
import { Crest } from "@/components/Crest";
import { MagicCircle } from "@/components/MagicCircle";

export function Loading({ label = "Consulting the Guild ledgers…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-parchment/60" role="status">
      <div className="relative h-24 w-24">
        <MagicCircle className="absolute inset-0" />
        <Crest className="absolute inset-[30%] h-[40%] w-[40%] rune-pulse" />
      </div>
      <p className="font-ui text-[13px] font-bold uppercase tracking-[0.3em] text-arcane-light">Now Loading</p>
      <p className="-mt-3 text-sm">{label}</p>
    </div>
  );
}

/** Client-side gate for signed-in areas. Real enforcement is RLS in the database. */
export function Guard({ min = "adventurer", children }: { min?: Role; children: ReactNode }) {
  const { viewer, loading } = useViewer();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (isSupabaseConfigured && !loading && !viewer) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.replace(`/join/?next=${encodeURIComponent(path + search)}`);
    }
  }, [loading, viewer, router, path]);
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading || !viewer) return <Loading />;
  if (!roleAtLeast(viewer.profile.role, min)) {
    return (
      <div className="panel mx-auto my-10 max-w-md text-center">
        <p className="font-ui text-[13px] font-bold uppercase tracking-[0.3em] text-ember-light">【 Access Denied 】</p>
        <p className="heading mt-1 text-xl">Guild staff only</p>
        <p className="muted mt-2 text-sm">This area is reserved for Game Masters.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Everbound` : "Everbound — The Living Adventurers Guild";
  }, [title]);
}
