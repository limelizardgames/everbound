export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "America/New_York";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Public base URL of the site (used in QR codes, email links and Stripe redirects). */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (typeof window !== "undefined") return `${window.location.origin}${BASE_PATH}`;
  return BASE_PATH;
}

/** In-site path → absolute URL. */
export function absoluteUrl(path: string) {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
