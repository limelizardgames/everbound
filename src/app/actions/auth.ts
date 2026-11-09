"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNext, errorMessage } from "@/lib/format";
import { siteUrl } from "@/lib/env";

function back(mode: string, next: string, error: string) {
  redirect(`/join?mode=${mode}&next=${encodeURIComponent(next)}&error=${encodeURIComponent(error)}`);
}

export async function signUp(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""), "/portal");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const age = formData.get("age_attested") === "on";
  if (!email || password.length < 8) back("signup", next, "Enter an email and a password of at least 8 characters.");
  if (displayName.length < 2 || displayName.length > 40) back("signup", next, "Display name must be 2–40 characters.");
  if (!age) back("signup", next, "Please confirm the age requirement.");

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? siteUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, age_attested: age },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) back("signup", next, errorMessage(error));
  if (!data.session) {
    redirect(`/join?mode=signin&next=${encodeURIComponent(next)}&ok=${encodeURIComponent("Check your email to confirm your account, then sign in.")}`);
  }
  redirect(next);
}

export async function signIn(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""), "/portal");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) back("signin", next, "Those credentials were not recognised.");
  redirect(next);
}

export async function sendMagicLink(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""), "/portal");
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? siteUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) back("signin", next, errorMessage(error));
  redirect(`/join?mode=signin&next=${encodeURIComponent(next)}&ok=${encodeURIComponent("A sign-in link is on its way to your inbox.")}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
