"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useViewer } from "@/lib/viewer";
import { isSupabaseConfigured } from "@/lib/env";
import { roleAtLeast, type Role } from "@/lib/types";
import { SetupNotice } from "@/components/SetupNotice";
import { Crest } from "@/components/Crest";

export function Loading({ label = "Consulting the Guild ledgers…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-parchment/60" role="status">
      <Crest className="rune-pulse h-12 w-12" />
      <p className="text-sm">{label}</p>
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
        <p className="heading text-xl">Guild staff only</p>
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
