"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/env";
import { useData } from "@/lib/useData";
import { CharacterProfile } from "@/components/CharacterProfile";
import { Empty } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";
import { Loading, useTitle } from "@/components/Guard";
import type { PublicCharacter } from "@/lib/types";

export default function Page() {
  return <Suspense fallback={<Loading />}><Adventurer /></Suspense>;
}

function Adventurer() {
  const n = useSearchParams().get("n") ?? "";
  const { data, loading } = useData(async () => (await must(sb().rpc("get_public_character", { p_card_number: n }))) as { card_number: string; character: PublicCharacter | null } | null, [n]);
  useTitle(data?.character?.name ?? "Adventurer");
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading) return <Loading />;
  if (!data?.character) return <div className="container-eb py-12"><Empty title="No public adventurer with that card" action={<Link className="btn-ghost" href="/leaderboards/">Hall of Legends</Link>} /></div>;
  return <div className="container-eb max-w-3xl py-12"><CharacterProfile c={data.character} cardNumber={data.card_number} /></div>;
}
