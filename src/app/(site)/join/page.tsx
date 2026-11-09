"use client";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp, sendMagicLink } from "@/lib/actions";
import { useAct } from "@/lib/toast";
import { useViewer } from "@/lib/viewer";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNext } from "@/lib/format";
import { Crest } from "@/components/Crest";
import { SubmitButton } from "@/components/SubmitButton";
import { SetupNotice } from "@/components/SetupNotice";
import { Loading, useTitle } from "@/components/Guard";

export default function Page() {
  return <Suspense fallback={<Loading />}><JoinPage /></Suspense>;
}

function JoinPage() {
  useTitle("Join the Guild");
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/portal/");
  const mode = params.get("mode") === "signin" ? "signin" : "signup";
  const { viewer, loading } = useViewer();
  const router = useRouter();
  const act = useAct();
  useEffect(() => {
    if (viewer) router.replace(next);
  }, [viewer, next, router]);
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading || viewer) return <Loading />;
  const fromCard = next.startsWith("/card");
  const q = (m: string) => `/join/?mode=${m}&next=${encodeURIComponent(next)}`;

  return (
    <div className="container-eb py-12">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <Crest className="mx-auto h-16 w-16" glow />
          <p className="eyebrow mt-4">{mode === "signup" ? "Guild registration" : "Welcome back"}</p>
          <h1 className="heading mt-2 text-3xl">{mode === "signup" ? "Join the Guild" : "Sign in"}</h1>
          {fromCard && <p className="mt-3 rounded-lg border border-arcane/40 bg-arcane/10 p-3 text-sm text-arcane-light">Sign in or create an account to bind the guild card you just scanned.</p>}
        </div>
        <div className="my-6 grid grid-cols-2 rounded-lg border border-gold/30 p-1 text-sm">
          <Link href={q("signup")} className={`rounded-md py-2 text-center ${mode === "signup" ? "bg-gold font-semibold text-midnight" : "text-parchment/70"}`}>New adventurer</Link>
          <Link href={q("signin")} className={`rounded-md py-2 text-center ${mode === "signin" ? "bg-gold font-semibold text-midnight" : "text-parchment/70"}`}>I have an account</Link>
        </div>
        {mode === "signup" ? (
          <form action={act(signUp)} className="panel grid gap-4">
            <input type="hidden" name="next" value={next} />
            <div>
              <label className="label" htmlFor="display_name">Display name</label>
              <input className="input" id="display_name" name="display_name" required minLength={2} maxLength={40} autoComplete="nickname" placeholder="Shown in the Tavern" />
              <p className="muted mt-1 text-xs">Use a nickname. Never your full legal name.</p>
            </div>
            <div><label className="label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div>
            <div><label className="label" htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="age_attested" className="mt-1 h-5 w-5 accent-gold" required />
              <span className="muted">I am 18 or older, or I have permission from a parent or guardian who has read the Guild&apos;s privacy policy.</span>
            </label>
            <SubmitButton pendingText="Registering…">Create my Guild account</SubmitButton>
          </form>
        ) : (
          <>
            <form action={act(signIn)} className="panel grid gap-4">
              <input type="hidden" name="next" value={next} />
              <div><label className="label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div>
              <div><label className="label" htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" required autoComplete="current-password" /></div>
              <SubmitButton pendingText="Opening the gates…">Sign in</SubmitButton>
            </form>
            <form action={act(sendMagicLink)} className="mt-4 grid gap-2 rounded-xl border border-midnight-600 p-4">
              <input type="hidden" name="next" value={next} />
              <label className="label" htmlFor="ml-email">Forgot your password? Get a sign-in link</label>
              <div className="flex gap-2">
                <input className="input" id="ml-email" name="email" type="email" required autoComplete="email" />
                <SubmitButton className="btn-ghost" pendingText="Sending…">Send</SubmitButton>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
