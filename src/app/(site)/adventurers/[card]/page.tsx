import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { CharacterProfile } from "@/components/CharacterProfile";
import { SetupNotice } from "@/components/SetupNotice";
import type { PublicCharacter } from "@/lib/types";

export default async function AdventurerPage({ params }: { params: Promise<{ card: string }> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { card } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_character", { p_card_number: card });
  const res = data as { card_number: string; character: PublicCharacter | null } | null;
  if (!res?.character) notFound();
  return (
    <div className="container-eb max-w-3xl py-12">
      <CharacterProfile c={res.character} cardNumber={res.card_number} />
    </div>
  );
}
