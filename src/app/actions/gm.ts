"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { errorMessage, zonedToUtc } from "@/lib/format";

function go(path: string, error?: unknown, ok?: string): never {
  const sep = path.includes("?") ? "&" : "?";
  if (error) redirect(`${path}${sep}error=${encodeURIComponent(errorMessage(error))}`);
  redirect(`${path}${sep}ok=${encodeURIComponent(ok ?? "Saved.")}`);
}
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = Number(f.get(k));
  return Number.isFinite(v) ? Math.trunc(v) : 0;
};

// ---------------------------------------------------------------- Quests
export async function saveQuestTemplate(formData: FormData) {
  const viewer = await requireRole("game_master");
  const supabase = await createClient();
  const id = str(formData, "id");
  const title = str(formData, "title");
  const row = {
    title,
    slug: str(formData, "slug") || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    quest_type: str(formData, "quest_type") || "standard",
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    rank_min: str(formData, "rank_min") || "F",
    rank_max: str(formData, "rank_max") || "S",
    difficulty: str(formData, "difficulty") || "moderate",
    suggested_level: num(formData, "suggested_level") || 1,
    party_min: num(formData, "party_min") || 3,
    party_max: num(formData, "party_max") || 5,
    est_minutes: num(formData, "est_minutes") || 180,
    location_id: str(formData, "location_id") || null,
    reward_preview: str(formData, "reward_preview") || null,
    content_advisories: str(formData, "content_advisories").split(",").map((s) => s.trim()).filter(Boolean),
  };
  const secrets = {
    gm_notes: str(formData, "gm_notes") || null,
    npcs: str(formData, "npcs") || null,
    encounter_notes: str(formData, "encounter_notes") || null,
    consequence_hooks: str(formData, "consequence_hooks") || null,
  };
  let templateId = id;
  if (id) {
    const { error } = await supabase.from("quest_templates").update(row).eq("id", id);
    if (error) go(`/gm/quests/${id}`, error);
  } else {
    const { data, error } = await supabase.from("quest_templates").insert({ ...row, created_by: viewer.userId }).select("id").single();
    if (error) go("/gm/quests", error);
    templateId = data!.id;
  }
  const { error: sErr } = await supabase.from("quest_template_secrets").upsert({ template_id: templateId, ...secrets });
  if (sErr) go(`/gm/quests/${templateId}`, sErr);

  const objectives = str(formData, "objectives").split("\n").map((l) => l.trim()).filter(Boolean);
  if (formData.has("objectives")) {
    await supabase.from("quest_objectives").delete().eq("template_id", templateId);
    if (objectives.length) {
      await supabase.from("quest_objectives").insert(
        objectives.map((o, i) => ({ template_id: templateId, sort: i, description: o.replace(/^\[secret\]\s*/i, ""), is_secret: /^\[secret\]/i.test(o) })),
      );
    }
  }
  revalidatePath("/gm/quests");
  revalidatePath("/quests");
  go(`/gm/quests/${templateId}`, undefined, id ? "Quest saved." : "Quest drafted. A Senior GM can publish it.");
}

export async function setTemplateStatus(formData: FormData) {
  await requireRole("senior_gm");
  const supabase = await createClient();
  const id = str(formData, "id");
  const { error } = await supabase.from("quest_templates").update({ status: str(formData, "status") }).eq("id", id);
  revalidatePath("/quests");
  go(`/gm/quests/${id}`, error, `Quest is now ${str(formData, "status")}.`);
}

// ---------------------------------------------------------------- Sessions
export async function scheduleSession(formData: FormData) {
  const viewer = await requireRole("game_master");
  const supabase = await createClient();
  const startsLocal = str(formData, "starts_at"); // wall-clock time at the venue (NEXT_PUBLIC_TIMEZONE)
  const starts = startsLocal ? zonedToUtc(startsLocal) : null;
  if (!starts || Number.isNaN(starts.getTime())) go("/gm/sessions", "Choose a valid start time.");
  const hours = Number(formData.get("hours") || 3);
  const { data, error } = await supabase.from("quest_sessions").insert({
    template_id: str(formData, "template_id"),
    starts_at: starts!.toISOString(),
    ends_at: new Date(starts!.getTime() + hours * 3600000).toISOString(),
    venue: str(formData, "venue") || "Partner Game Store",
    table_label: str(formData, "table_label") || null,
    capacity: num(formData, "capacity") || 5,
    price_cents: Math.round(Number(formData.get("price") || 0) * 100),
    gm_id: str(formData, "gm_id") || viewer.userId,
    created_by: viewer.userId,
  }).select("id").single();
  revalidatePath("/calendar");
  if (error) go("/gm/sessions", error);
  go(`/gm/sessions/${data!.id}`, undefined, "Session scheduled. A private party room was created in the Tavern.");
}

export async function updateSession(formData: FormData) {
  await requireRole("game_master");
  const supabase = await createClient();
  const id = str(formData, "id");
  const patch: Record<string, unknown> = {};
  for (const k of ["venue", "table_label", "outcome_summary"]) if (formData.has(k)) patch[k] = str(formData, k) || null;
  if (formData.has("capacity")) patch.capacity = num(formData, "capacity");
  if (formData.has("gm_id")) patch.gm_id = str(formData, "gm_id") || null;
  if (formData.has("status")) patch.status = str(formData, "status");
  const { error } = await supabase.from("quest_sessions").update(patch).eq("id", id);
  revalidatePath(`/gm/sessions/${id}`);
  go(`/gm/sessions/${id}`, error, "Session updated.");
}

export async function saveSessionNotes(formData: FormData) {
  const viewer = await requireRole("game_master");
  const supabase = await createClient();
  const id = str(formData, "id");
  const { error } = await supabase.from("quest_session_notes").upsert({ session_id: id, notes: str(formData, "notes"), updated_by: viewer.userId, updated_at: new Date().toISOString() });
  go(`/gm/sessions/${id}`, error, "Notes saved.");
}

export async function updateLiveState(formData: FormData) {
  await requireRole("game_master");
  const supabase = await createClient();
  const id = str(formData, "session_id");
  const { error } = await supabase.rpc("gm_update_character_state", {
    p_reservation: str(formData, "reservation_id"), p_hp: num(formData, "hp"), p_conditions: str(formData, "conditions") || null,
  });
  go(`/gm/sessions/${id}#roster`, error, "Table updated.");
}

export async function staffCancelReservation(formData: FormData) {
  await requireRole("game_master");
  const supabase = await createClient();
  const id = str(formData, "session_id");
  const { error } = await supabase.rpc("cancel_reservation", { p_reservation: str(formData, "reservation_id") });
  go(`/gm/sessions/${id}#roster`, error, "Reservation canceled; waitlist promoted.");
}

export async function saveResults(formData: FormData) {
  await requireRole("game_master");
  const supabase = await createClient();
  const id = str(formData, "session_id");
  const ids = formData.getAll("character_id").map(String);
  const rewards = ids.map((cid) => {
    const items = formData.getAll(`item_${cid}`).map(String).filter(Boolean);
    return {
      character_id: cid,
      attended: formData.get(`attended_${cid}`) === "on",
      xp: num(formData, `xp_${cid}`),
      gold: num(formData, `gold_${cid}`),
      renown: num(formData, `renown_${cid}`),
      items: items.map((item_id) => ({ item_id, quantity: 1 })),
      achievements: formData.getAll(`ach_${cid}`).map(String).filter(Boolean),
      note: str(formData, `note_${cid}`),
    };
  });
  const flags = [0, 1, 2]
    .map((i) => ({ key: str(formData, `flag_key_${i}`), delta: num(formData, `flag_delta_${i}`) }))
    .filter((f) => f.key && f.delta !== 0);
  const locations = [0, 1, 2]
    .map((i) => {
      const [locId, expected] = str(formData, `loc_${i}`).split("|");
      return {
        location_id: locId,
        expected_status: expected || null,
        new_status: str(formData, `loc_status_${i}`) || null,
        discovered: formData.get(`loc_disc_${i}`) === "on",
      };
    })
    .filter((l) => l.location_id && (l.new_status || l.discovered));
  const chronicleTitle = str(formData, "chronicle_title");
  const world_changes = {
    flags,
    locations,
    chronicle: chronicleTitle ? { title: chronicleTitle, excerpt: str(formData, "chronicle_excerpt"), body: str(formData, "chronicle_body"), category: str(formData, "chronicle_category") || "adventure_outcome" } : null,
  };
  const submit = str(formData, "intent") === "submit";
  const { error } = await supabase.rpc("gm_save_results", {
    p_session: id, p_summary: str(formData, "summary_public"), p_decisions: str(formData, "decisions"),
    p_rewards: rewards, p_world_changes: world_changes, p_submit: submit,
  });
  revalidatePath(`/gm/sessions/${id}`);
  go(`/gm/sessions/${id}#results`, error, submit ? "Results submitted for approval." : "Draft saved.");
}

export async function approveResults(formData: FormData) {
  await requireRole("senior_gm");
  const supabase = await createClient();
  const id = str(formData, "session_id");
  const { data, error } = await supabase.rpc("approve_session_results", { p_session: id });
  revalidatePath("/", "layout");
  const res = data as { rewarded: number; world_conflicts: number } | null;
  go(`/gm/sessions/${id}`, error, `Published! ${res?.rewarded ?? 0} adventurers rewarded${res?.world_conflicts ? `, ${res.world_conflicts} world change(s) need review` : ""}.`);
}

export async function rejectResults(formData: FormData) {
  await requireRole("senior_gm");
  const supabase = await createClient();
  const id = str(formData, "session_id");
  const { error } = await supabase.rpc("reject_session_results", { p_session: id, p_reason: str(formData, "reason") || "Needs changes" });
  go(`/gm/sessions/${id}`, error, "Returned to the GM for changes.");
}

// ---------------------------------------------------------------- World
export async function setLocation(formData: FormData) {
  await requireRole("senior_gm");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_location_status", {
    p_location: str(formData, "location_id"),
    p_new: str(formData, "status"),
    p_reason: str(formData, "reason") || null,
    p_expected: str(formData, "expected") || null,
    p_discovered: formData.get("discovered") === "on",
  });
  revalidatePath("/world");
  go("/gm/world", error, data === "conflict" ? "Another table changed this location first — parked for review." : "Location updated.");
}

export async function saveLocationLore(formData: FormData) {
  await requireRole("senior_gm");
  const supabase = await createClient();
  const { error } = await supabase.from("locations").update({
    summary: str(formData, "summary") || null, lore: str(formData, "lore") || null, threat: str(formData, "threat") || null,
    discovered_by: str(formData, "discovered_by") || null,
  }).eq("id", str(formData, "location_id"));
  revalidatePath("/world");
  go("/gm/world", error, "Lore saved.");
}

export async function adjustFlag(formData: FormData) {
  await requireRole("senior_gm");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("adjust_world_flag", { p_key: str(formData, "key"), p_delta: num(formData, "delta"), p_reason: str(formData, "reason") || null });
  revalidatePath("/", "layout");
  go("/gm/world", error, `World flag now ${data}. Raid conditions were re-evaluated.`);
}

export async function createFlag(formData: FormData) {
  await requireRole("senior_gm");
  const supabase = await createClient();
  const { error } = await supabase.from("world_flags").insert({
    key: str(formData, "key").toLowerCase().replace(/[^a-z0-9_]+/g, "_"), label: str(formData, "label"), value: 0, is_public: formData.get("is_public") === "on",
  });
  go("/gm/world", error, "Flag created.");
}

export async function resolveConflict(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_world_conflict", { p_event: str(formData, "event_id"), p_apply: str(formData, "apply") === "true" });
  revalidatePath("/world");
  go("/gm/world", error, "Conflict resolved.");
}

export async function publishChronicle(formData: FormData) {
  const viewer = await requireRole("senior_gm");
  const supabase = await createClient();
  const title = str(formData, "title");
  const publish = str(formData, "intent") !== "draft";
  const { error } = await supabase.from("chronicle_posts").insert({
    slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`,
    title, category: str(formData, "category"), excerpt: str(formData, "excerpt"), body: str(formData, "body"),
    location_id: str(formData, "location_id") || null, is_featured: formData.get("is_featured") === "on",
    published: publish, published_at: publish ? new Date().toISOString() : null, author_id: viewer.userId,
  });
  revalidatePath("/chronicle");
  revalidatePath("/");
  go("/gm/world#chronicle", error, publish ? "Published to the Chronicle." : "Draft saved.");
}

export async function toggleChronicle(formData: FormData) {
  await requireRole("senior_gm");
  const supabase = await createClient();
  const publish = str(formData, "publish") === "true";
  const { error } = await supabase.from("chronicle_posts").update({ published: publish, published_at: publish ? new Date().toISOString() : null }).eq("id", str(formData, "id"));
  revalidatePath("/chronicle");
  go("/gm/world#chronicle", error, publish ? "Published." : "Unpublished.");
}

// ---------------------------------------------------------------- People & moderation
export async function setRole(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_profile: str(formData, "profile_id"), p_role: str(formData, "role") });
  go("/gm/players", error, "Role updated.");
}

export async function restrictUser(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const ban = str(formData, "ban");
  const { error } = await supabase.rpc("restrict_user", {
    p_profile: str(formData, "profile_id"), p_mute_minutes: num(formData, "mute_minutes"), p_ban: ban === "" ? null : ban === "true",
  });
  go("/gm/players", error, "Restrictions updated.");
}

export async function adjustLedger(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_adjust_ledger", {
    p_character: str(formData, "character_id"), p_resource: str(formData, "resource"), p_amount: num(formData, "amount"), p_reason: str(formData, "reason"),
  });
  go("/gm/players", error, "Correction recorded in the ledger.");
}

export async function grantItem(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_grant_item", {
    p_character: str(formData, "character_id"), p_item: str(formData, "item_id"), p_quantity: num(formData, "quantity") || 1, p_reason: str(formData, "reason") || "Staff grant",
  });
  go("/gm/players", error, "Inventory updated.");
}

export async function resolveReport(formData: FormData) {
  const viewer = await requireRole("game_master");
  const supabase = await createClient();
  const action = str(formData, "action");
  if (action === "remove") {
    const { error } = await supabase.rpc("moderate_message", { p_message: str(formData, "message_id"), p_reason: "Report upheld" });
    go("/gm/players#reports", error, "Message removed.");
  }
  const { error } = await supabase.from("message_reports").update({ status: "dismissed", resolved_by: viewer.userId, resolved_at: new Date().toISOString() }).eq("id", str(formData, "report_id"));
  go("/gm/players#reports", error, "Report dismissed.");
}

export async function saveSetting(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const key = str(formData, "key");
  const raw = str(formData, "value");
  const value = key === "chat_retention_days" ? Number(raw) : key === "season_start" ? new Date(raw).toISOString() : raw;
  const { error } = await supabase.from("admin_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  revalidatePath("/", "layout");
  go("/gm/settings", error, "Setting saved.");
}

export async function updateOrderFulfillment(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ fulfillment_status: str(formData, "fulfillment_status"), updated_at: new Date().toISOString() }).eq("id", str(formData, "order_id"));
  go("/gm/settings#orders", error, "Order updated.");
}

export async function markReservationPayment(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const id = str(formData, "session_id");
  // Admin-only bookkeeping for cash at the table / comps / manual refunds.
  const { error } = await supabase.rpc("admin_set_payment_status", { p_reservation: str(formData, "reservation_id"), p_status: str(formData, "payment_status") });
  go(`/gm/sessions/${id}#roster`, error, "Payment status recorded.");
}

