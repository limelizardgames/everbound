import { TIMEZONE } from "@/lib/env";

export function money(cents: number, currency = "usd") {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function dateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: TIMEZONE,
  }).format(new Date(iso));
}

export function shortDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: TIMEZONE }).format(new Date(iso));
}

export function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TIMEZONE }).format(new Date(iso));
}

export function longDay(iso: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: TIMEZONE }).format(new Date(iso));
}

export function timeOnly(iso: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: TIMEZONE }).format(new Date(iso));
}

export function relative(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export const QUEST_TYPE_LABEL: Record<string, string> = {
  standard: "Standard Quest", story: "Story Quest", contract: "Guild Contract",
  party: "Party Quest", elite: "Elite Quest", world: "World Quest",
};

export const CHRONICLE_LABEL: Record<string, string> = {
  world_news: "World News", adventure_outcome: "Adventure Outcome", discovery: "Discovery",
  npc_announcement: "NPC Announcement", guild_proclamation: "Guild Proclamation",
};

export const LOCATION_STATUSES = ["peaceful", "threatened", "besieged", "destroyed", "rebuilding", "unknown"] as const;

/** Only allow relative in-site redirect targets. */
export function safeNext(next: string | null | undefined, fallback = "/portal") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong";
}

/** Convert a "YYYY-MM-DDTHH:mm" wall-clock time in the venue timezone to a UTC Date. */
export function zonedToUtc(local: string, timeZone = TIMEZONE): Date {
  const [d, t = "00:00"] = local.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, day, hh, mm);
  const offsetAt = (ts: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(ts)).map((p) => [p.type, p.value]),
    );
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - ts;
  };
  let ts = guess - offsetAt(guess);
  ts = guess - offsetAt(ts);
  return new Date(ts);
}

/** UTC ISO -> "YYYY-MM-DDTHH:mm" in the venue timezone (for datetime-local inputs). */
export function toZonedInput(iso: string, timeZone = TIMEZONE) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
