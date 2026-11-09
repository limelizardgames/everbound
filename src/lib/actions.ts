"use client";
/**
 * Every mutation in the site. These run in the browser with the signed-in user's
 * session; Postgres row-level security and SECURITY DEFINER functions decide what
 * is allowed, so nothing here is trusted.
 */
import { sb, must } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/env";
import { safeNext, zonedToUtc } from "@/lib/format";
import type { ActionResult } from "@/lib/toast";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = Number(f.get(k));
  return Number.isFinite(v) ? Math.trunc(v) : 0;
};
async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  return must(sb().rpc(fn, args)) as Promise<T>;
}
async function uid() {
  const { data } = await sb().auth.getSession();
  if (!data.session) throw new Error("Please sign in first.");
  return data.session.user.id;
}
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ------------------------------------------------------------------ Auth
export async function signUp(fd: FormData): Promise<ActionResult> {
  const next = safeNext(str(fd, "next"), "/portal/");
  const email = str(fd, "email");
  const password = String(fd.get("password") ?? "");
  const displayName = str(fd, "display_name");
  if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
  if (displayName.length < 2 || displayName.length > 40) throw new Error("Display name must be 2–40 characters.");
  if (fd.get("age_attested") !== "on") throw new Error("Please confirm the age requirement.");
  const { data, error } = await sb().auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, age_attested: true },
      emailRedirectTo: absoluteUrl(`/auth/callback/?next=${encodeURIComponent(next)}`),
    },
  });
  if (error) throw new Error(error.message);
  if (!data.session) return { ok: "Check your email to confirm your account, then sign in.", go: `/join/?mode=signin&next=${encodeURIComponent(next)}` };
  return { ok: "Welcome to the Guild!", go: next };
}

export async function signIn(fd: FormData): Promise<ActionResult> {
  const next = safeNext(str(fd, "next"), "/portal/");
  const { error } = await sb().auth.signInWithPassword({ email: str(fd, "email"), password: String(fd.get("password") ?? "") });
  if (error) throw new Error("Those credentials were not recognised.");
  return { go: next };
}

export async function sendMagicLink(fd: FormData): Promise<ActionResult> {
  const next = safeNext(str(fd, "next"), "/portal/");
  const { error } = await sb().auth.signInWithOtp({
    email: str(fd, "email"),
    options: { shouldCreateUser: false, emailRedirectTo: absoluteUrl(`/auth/callback/?next=${encodeURIComponent(next)}`) },
  });
  if (error) throw new Error(error.message);
  return "A sign-in link is on its way to your inbox (open it in this browser).";
}

export async function signOut(): Promise<ActionResult> {
  await sb().auth.signOut();
  return { go: "/" };
}

// ------------------------------------------------------------------ Payments (Supabase Edge Function)
async function goToCheckout(kind: "reservation" | "order", id: string) {
  const { data, error } = await sb().functions.invoke("create-checkout", {
    body: { kind, id, success_url: absoluteUrl(kind === "order" ? "/portal/orders/" : "/portal/bookings/"), cancel_url: absoluteUrl(kind === "order" ? "/store/" : "/portal/bookings/") },
  });
  if (error || !data?.url) throw new Error("Online payment is unavailable right now. Ask a Guild Master to collect payment at the store.");
  window.location.href = data.url as string;
}

// ------------------------------------------------------------------ Bookings
export async function reserveSeat(sessionId: string, characterId: string): Promise<ActionResult> {
  const res = await rpc<{ reservation_id: string; status: string }>("reserve_seat", { p_session: sessionId, p_character: characterId });
  if (res.status === "pending_payment") {
    await goToCheckout("reservation", res.reservation_id);
    return "Taking you to secure checkout…";
  }
  return { ok: res.status === "waitlisted" ? "The table is full — you are on the waitlist." : "Quest accepted! Your seat is confirmed.", go: "/portal/bookings/" };
}

export async function payReservation(reservationId: string): Promise<ActionResult> {
  await goToCheckout("reservation", reservationId);
  return "Taking you to secure checkout…";
}

export async function cancelReservation(reservationId: string): Promise<ActionResult> {
  await rpc("cancel_reservation", { p_reservation: reservationId });
  return "Reservation canceled.";
}

// ------------------------------------------------------------------ Store
export async function orderProduct(fd: FormData): Promise<ActionResult> {
  const orderId = await rpc<string>("create_order", {
    p_items: [{ product_id: str(fd, "product_id"), quantity: num(fd, "quantity") || 1 }],
    p_fulfillment: "pickup",
  });
  const { data: mode } = await sb().from("admin_settings").select("value").eq("key", "store_payments").maybeSingle();
  if (mode?.value === "stripe") {
    await goToCheckout("order", orderId);
    return "Taking you to secure checkout…";
  }
  return { ok: "Order reserved — pay when you pick it up at the store.", go: "/portal/orders/" };
}

export async function buyWithGold(itemId: string, characterId: string): Promise<ActionResult> {
  const left = await rpc<number>("buy_with_gold", { p_item: itemId, p_character: characterId, p_quantity: 1 });
  return `Purchased! You have ${left} gold left.`;
}

// ------------------------------------------------------------------ Cards
export async function claimCard(token: string): Promise<ActionResult> {
  const cardNumber = await rpc<string>("claim_guild_card", { p_token: token });
  const { data: char } = await sb().from("characters").select("id").eq("is_active", true).maybeSingle();
  if (!char) return { ok: `Guild card ${cardNumber} is now bound to you. Register your adventurer!`, go: "/portal/character/new/" };
  return { ok: `Guild card ${cardNumber} is now bound to your account.`, go: "/portal/card/" };
}

export async function generateCards(fd: FormData): Promise<ActionResult> {
  const batch = str(fd, "batch") || `batch-${new Date().toISOString().slice(0, 10)}`;
  const names = str(fd, "names").split("\n").map((n) => n.trim()).filter(Boolean);
  const cards = await rpc<unknown[]>("generate_guild_cards", {
    p_count: names.length || num(fd, "count"), p_batch: batch, p_tier: str(fd, "tier") || "standard", p_names: names.length ? names : null,
  });
  return { ok: `Forged ${cards.length} cards in batch "${batch}".`, go: `/gm/cards/?batch=${encodeURIComponent(batch)}` };
}

export async function assignCard(fd: FormData): Promise<ActionResult> {
  const cardNumber = str(fd, "card_number").toUpperCase();
  const card = await must(sb().from("guild_cards").select("id").eq("card_number", cardNumber).maybeSingle());
  if (!card) throw new Error(`No card ${cardNumber}`);
  await rpc("assign_guild_card", { p_card: card.id, p_profile: str(fd, "profile_id") });
  return `${cardNumber} assigned.`;
}

export async function deactivateCard(cardId: string): Promise<ActionResult> {
  await rpc("deactivate_guild_card", { p_card: cardId, p_reason: "Voided by staff" });
  return "Card voided.";
}

export async function replaceCard(fd: FormData): Promise<ActionResult> {
  const card = await rpc<{ card_number: string }>("replace_guild_card", {
    p_card: str(fd, "card_id"), p_reason: str(fd, "reason") || "Lost card", p_tier: str(fd, "tier") || null,
  });
  return { ok: `Replacement ${card.card_number} issued — print it from the replacement batch.`, go: "/gm/cards/?batch=replacement" };
}

// ------------------------------------------------------------------ Characters & account
export async function createCharacter(fd: FormData, attributeKeys: string[]): Promise<ActionResult> {
  const attrs: Record<string, number> = {};
  for (const k of attributeKeys) attrs[k] = num(fd, `attr_${k}`);
  await rpc("create_character", {
    p_name: str(fd, "name"), p_species: str(fd, "species"), p_class: str(fd, "class"), p_pronouns: str(fd, "pronouns"),
    p_backstory: str(fd, "backstory"), p_attributes: attrs, p_is_public: fd.get("is_public") === "on",
  });
  return { ok: "Welcome to the Guild, adventurer. Your legend begins here.", go: "/portal/" };
}

export async function updateCharacter(fd: FormData, characterId: string): Promise<ActionResult> {
  const me = await uid();
  const patch: Record<string, unknown> = {
    name: str(fd, "name"), pronouns: str(fd, "pronouns") || null, backstory: str(fd, "backstory") || null, is_public: fd.get("is_public") === "on",
  };
  const file = fd.get("portrait");
  if (file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) throw new Error("Portrait must be under 2 MB.");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Use a PNG, JPEG or WebP image.");
    const path = `${me}/${characterId}-${Date.now()}.${file.type.split("/")[1]}`;
    const { error } = await sb().storage.from("portraits").upload(path, file, { contentType: file.type, upsert: true });
    if (error) throw new Error("Upload failed: " + error.message);
    patch.portrait_url = sb().storage.from("portraits").getPublicUrl(path).data.publicUrl;
  }
  await must(sb().from("characters").update(patch).eq("id", characterId));
  return "Character sheet updated.";
}

export async function updateSettings(fd: FormData): Promise<ActionResult> {
  const me = await uid();
  await must(sb().from("profiles").update({ display_name: str(fd, "display_name"), show_on_leaderboards: fd.get("show_on_leaderboards") === "on" }).eq("id", me));
  return "Settings saved.";
}

export async function markAllRead(): Promise<ActionResult> {
  const me = await uid();
  await must(sb().from("notifications").update({ read_at: new Date().toISOString() }).eq("profile_id", me).is("read_at", null));
}

export async function registerForRaid(fd: FormData, characterId: string): Promise<ActionResult> {
  const status = await rpc<string>("register_for_raid", { p_raid: str(fd, "raid_id"), p_character: characterId, p_window: str(fd, "window") || null });
  return status === "waitlisted" ? "The raid is full — you are on the waitlist." : "You have answered the call!";
}

// ------------------------------------------------------------------ GM: quests
export async function saveQuestTemplate(fd: FormData): Promise<ActionResult> {
  const me = await uid();
  const id = str(fd, "id");
  const title = str(fd, "title");
  const row = {
    title,
    slug: str(fd, "slug") || slugify(title),
    quest_type: str(fd, "quest_type") || "standard",
    summary: str(fd, "summary"),
    description: str(fd, "description"),
    rank_min: str(fd, "rank_min") || "F",
    rank_max: str(fd, "rank_max") || "S",
    difficulty: str(fd, "difficulty") || "moderate",
    suggested_level: num(fd, "suggested_level") || 1,
    party_min: num(fd, "party_min") || 3,
    party_max: num(fd, "party_max") || 5,
    est_minutes: num(fd, "est_minutes") || 180,
    location_id: str(fd, "location_id") || null,
    reward_preview: str(fd, "reward_preview") || null,
    content_advisories: str(fd, "content_advisories").split(",").map((s) => s.trim()).filter(Boolean),
  };
  let templateId = id;
  if (id) await must(sb().from("quest_templates").update(row).eq("id", id));
  else templateId = (await must(sb().from("quest_templates").insert({ ...row, created_by: me }).select("id").single()))!.id;
  await must(sb().from("quest_template_secrets").upsert({
    template_id: templateId, gm_notes: str(fd, "gm_notes") || null, npcs: str(fd, "npcs") || null,
    encounter_notes: str(fd, "encounter_notes") || null, consequence_hooks: str(fd, "consequence_hooks") || null,
  }));
  const objectives = str(fd, "objectives").split("\n").map((l) => l.trim()).filter(Boolean);
  await must(sb().from("quest_objectives").delete().eq("template_id", templateId));
  if (objectives.length) {
    await must(sb().from("quest_objectives").insert(objectives.map((o, i) => ({
      template_id: templateId, sort: i, description: o.replace(/^\[secret\]\s*/i, ""), is_secret: /^\[secret\]/i.test(o),
    }))));
  }
  return { ok: id ? "Quest saved." : "Quest drafted. A Senior GM can publish it.", go: `/gm/quest/?id=${templateId}` };
}

export async function setTemplateStatus(id: string, status: string): Promise<ActionResult> {
  await must(sb().from("quest_templates").update({ status }).eq("id", id));
  return `Quest is now ${status}.`;
}

// ------------------------------------------------------------------ GM: sessions
export async function scheduleSession(fd: FormData): Promise<ActionResult> {
  const me = await uid();
  const startsLocal = str(fd, "starts_at");
  if (!startsLocal) throw new Error("Choose a start time.");
  const starts = zonedToUtc(startsLocal);
  const hours = Number(fd.get("hours") || 3);
  const row = await must(sb().from("quest_sessions").insert({
    template_id: str(fd, "template_id"),
    starts_at: starts.toISOString(),
    ends_at: new Date(starts.getTime() + hours * 3600000).toISOString(),
    venue: str(fd, "venue") || "Partner Game Store",
    table_label: str(fd, "table_label") || null,
    capacity: num(fd, "capacity") || 5,
    price_cents: Math.round(Number(fd.get("price") || 0) * 100),
    gm_id: str(fd, "gm_id") || me,
    created_by: me,
  }).select("id").single());
  return { ok: "Session scheduled. A private party room was created in the Tavern.", go: `/gm/session/?id=${row!.id}` };
}

export async function updateSession(fd: FormData): Promise<ActionResult> {
  const patch: Record<string, unknown> = {
    capacity: num(fd, "capacity"), table_label: str(fd, "table_label") || null, gm_id: str(fd, "gm_id") || null, status: str(fd, "status"),
  };
  await must(sb().from("quest_sessions").update(patch).eq("id", str(fd, "id")));
  return "Session updated.";
}

export async function saveSessionNotes(fd: FormData): Promise<ActionResult> {
  const me = await uid();
  await must(sb().from("quest_session_notes").upsert({ session_id: str(fd, "id"), notes: str(fd, "notes"), updated_by: me, updated_at: new Date().toISOString() }));
  return "Notes saved.";
}

export async function updateLiveState(fd: FormData): Promise<ActionResult> {
  await rpc("gm_update_character_state", { p_reservation: str(fd, "reservation_id"), p_hp: num(fd, "hp"), p_conditions: str(fd, "conditions") || null });
  return "Table updated.";
}

export async function setPaymentStatus(reservationId: string, status: string): Promise<ActionResult> {
  await rpc("admin_set_payment_status", { p_reservation: reservationId, p_status: status });
  return "Payment status recorded.";
}

export async function saveResults(fd: FormData, intent: "draft" | "submit"): Promise<ActionResult> {
  const id = str(fd, "session_id");
  const rewards = fd.getAll("character_id").map(String).map((cid) => ({
    character_id: cid,
    attended: fd.get(`attended_${cid}`) === "on",
    xp: num(fd, `xp_${cid}`),
    gold: num(fd, `gold_${cid}`),
    renown: num(fd, `renown_${cid}`),
    items: fd.getAll(`item_${cid}`).map(String).filter(Boolean).map((item_id) => ({ item_id, quantity: 1 })),
    achievements: fd.getAll(`ach_${cid}`).map(String).filter(Boolean),
    note: str(fd, `note_${cid}`),
  }));
  const flags = [0, 1, 2].map((i) => ({ key: str(fd, `flag_key_${i}`), delta: num(fd, `flag_delta_${i}`) })).filter((f) => f.key && f.delta !== 0);
  const locations = [0, 1, 2]
    .map((i) => {
      const [locId, expected] = str(fd, `loc_${i}`).split("|");
      return { location_id: locId, expected_status: expected || null, new_status: str(fd, `loc_status_${i}`) || null, discovered: fd.get(`loc_disc_${i}`) === "on" };
    })
    .filter((l) => l.location_id && (l.new_status || l.discovered));
  const title = str(fd, "chronicle_title");
  await rpc("gm_save_results", {
    p_session: id, p_summary: str(fd, "summary_public"), p_decisions: str(fd, "decisions"), p_rewards: rewards,
    p_world_changes: { flags, locations, chronicle: title ? { title, excerpt: str(fd, "chronicle_excerpt"), body: str(fd, "chronicle_body"), category: str(fd, "chronicle_category") || "adventure_outcome" } : null },
    p_submit: intent === "submit",
  });
  return intent === "submit" ? "Results submitted for approval." : "Draft saved.";
}

export async function approveResults(sessionId: string): Promise<ActionResult> {
  const res = await rpc<{ rewarded: number; world_conflicts: number }>("approve_session_results", { p_session: sessionId });
  return `Published! ${res.rewarded} adventurer(s) rewarded${res.world_conflicts ? `, ${res.world_conflicts} world change(s) need review` : ""}.`;
}

export async function rejectResults(fd: FormData): Promise<ActionResult> {
  await rpc("reject_session_results", { p_session: str(fd, "session_id"), p_reason: str(fd, "reason") || "Needs changes" });
  return "Returned to the GM for changes.";
}

// ------------------------------------------------------------------ GM: world
export async function setLocation(fd: FormData): Promise<ActionResult> {
  const r = await rpc<string>("set_location_status", {
    p_location: str(fd, "location_id"), p_new: str(fd, "status"), p_reason: str(fd, "reason") || null,
    p_expected: str(fd, "expected") || null, p_discovered: fd.get("discovered") === "on",
  });
  return r === "conflict" ? "Another table changed this location first — parked for review." : "Location updated.";
}

export async function saveLocationLore(fd: FormData): Promise<ActionResult> {
  await must(sb().from("locations").update({
    summary: str(fd, "summary") || null, lore: str(fd, "lore") || null, threat: str(fd, "threat") || null, discovered_by: str(fd, "discovered_by") || null,
  }).eq("id", str(fd, "location_id")));
  return "Lore saved.";
}

export async function adjustFlag(fd: FormData): Promise<ActionResult> {
  const v = await rpc<number>("adjust_world_flag", { p_key: str(fd, "key"), p_delta: num(fd, "delta"), p_reason: str(fd, "reason") || null });
  return `World flag now ${v}. Raid conditions were re-evaluated.`;
}

export async function createFlag(fd: FormData): Promise<ActionResult> {
  await must(sb().from("world_flags").insert({
    key: str(fd, "key").toLowerCase().replace(/[^a-z0-9_]+/g, "_"), label: str(fd, "label"), value: 0, is_public: fd.get("is_public") === "on",
  }));
  return "Flag created.";
}

export async function resolveConflict(eventId: string, apply: boolean): Promise<ActionResult> {
  await rpc("resolve_world_conflict", { p_event: eventId, p_apply: apply });
  return "Conflict resolved.";
}

export async function publishChronicle(fd: FormData, intent: "publish" | "draft"): Promise<ActionResult> {
  const me = await uid();
  const title = str(fd, "title");
  const publish = intent === "publish";
  await must(sb().from("chronicle_posts").insert({
    slug: `${slugify(title)}-${Date.now().toString(36)}`, title, category: str(fd, "category"), excerpt: str(fd, "excerpt"), body: str(fd, "body"),
    location_id: str(fd, "location_id") || null, is_featured: fd.get("is_featured") === "on",
    published: publish, published_at: publish ? new Date().toISOString() : null, author_id: me,
  }));
  return publish ? "Published to the Chronicle." : "Draft saved.";
}

export async function toggleChronicle(id: string, publish: boolean): Promise<ActionResult> {
  await must(sb().from("chronicle_posts").update({ published: publish, published_at: publish ? new Date().toISOString() : null }).eq("id", id));
  return publish ? "Published." : "Unpublished.";
}

// ------------------------------------------------------------------ GM: raids
export async function setRaidState(raidId: string, state: string, override = false): Promise<ActionResult> {
  await rpc("set_raid_state", { p_raid: raidId, p_state: state, p_override: override });
  return "Raid state updated.";
}

export async function toggleRaidPause(raidId: string, paused: boolean): Promise<ActionResult> {
  await rpc("set_raid_paused", { p_raid: raidId, p_paused: paused });
  return paused ? "Raid paused." : "Raid resumed.";
}

export async function updateRaid(fd: FormData): Promise<ActionResult> {
  const starts = str(fd, "starts_at");
  await must(sb().from("raids").update({
    foreshadow_text: str(fd, "foreshadow_text") || null, reveal_text: str(fd, "reveal_text") || null,
    capacity: num(fd, "capacity") || null, min_rank: str(fd, "min_rank") || null,
    starts_at: starts ? zonedToUtc(starts).toISOString() : null, conditions_public: fd.get("conditions_public") === "on",
    updated_at: new Date().toISOString(),
  }).eq("id", str(fd, "raid_id")));
  return "Raid details saved.";
}

// ------------------------------------------------------------------ Admin: people, moderation, settings
export async function setRole(fd: FormData): Promise<ActionResult> {
  await rpc("set_user_role", { p_profile: str(fd, "profile_id"), p_role: str(fd, "role") });
  return "Role updated.";
}

export async function restrictUser(profileId: string, muteMinutes: number, ban: boolean | null): Promise<ActionResult> {
  await rpc("restrict_user", { p_profile: profileId, p_mute_minutes: muteMinutes, p_ban: ban });
  return "Restrictions updated.";
}

export async function adjustLedger(fd: FormData): Promise<ActionResult> {
  await rpc("admin_adjust_ledger", { p_character: str(fd, "character_id"), p_resource: str(fd, "resource"), p_amount: num(fd, "amount"), p_reason: str(fd, "reason") });
  return "Correction recorded in the ledger.";
}

export async function grantItem(fd: FormData): Promise<ActionResult> {
  await rpc("admin_grant_item", { p_character: str(fd, "character_id"), p_item: str(fd, "item_id"), p_quantity: num(fd, "quantity") || 1, p_reason: str(fd, "reason") || "Staff grant" });
  return "Inventory updated.";
}

export async function resolveReport(reportId: string, messageId: string, remove: boolean): Promise<ActionResult> {
  if (remove) {
    await rpc("moderate_message", { p_message: messageId, p_reason: "Report upheld" });
    return "Message removed.";
  }
  const me = await uid();
  await must(sb().from("message_reports").update({ status: "dismissed", resolved_by: me, resolved_at: new Date().toISOString() }).eq("id", reportId));
  return "Report dismissed.";
}

export async function saveSetting(fd: FormData): Promise<ActionResult> {
  const key = str(fd, "key");
  const raw = str(fd, "value");
  const value = key === "chat_retention_days" ? Number(raw) : key === "season_start" ? new Date(raw).toISOString() : raw;
  await must(sb().from("admin_settings").upsert({ key, value, updated_at: new Date().toISOString() }));
  return "Setting saved.";
}

export async function updateOrderFulfillment(fd: FormData): Promise<ActionResult> {
  await must(sb().from("orders").update({ fulfillment_status: str(fd, "fulfillment_status"), updated_at: new Date().toISOString() }).eq("id", str(fd, "order_id")));
  return "Order updated.";
}
