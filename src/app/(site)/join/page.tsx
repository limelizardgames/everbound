"use client";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, sendMagicLink } from "@/lib/actions";
import { useAct } from "@/lib/toast";
import { useViewer } from "@/lib/viewer";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNext } from "@/lib/format";
import { Crest } from "@/components/Crest";
import { MagicCircle } from "@/components/MagicCircle";
import { SubmitButton } from "@/components/SubmitButton";
import { SetupNotice } from "@/components/SetupNotice";
import { SystemWindow } from "@/components/ui";
import { Loading, useTitle } from "@/components/Guard";

export default function Page() {
  return <Suspense fallback={<Loading />}><JoinPage /></Suspense>;
}

const STEPS: [string, string, string][] = [
  ["◈", "Get your guild card", "Visit the Guild at our partner store. A Guild Master hands you your own printed card."],
  ["⌁", "Scan the QR code", "Point your phone camera at the card. It opens your card's page on this site."],
  ["✦", "Create your account", "Pick a name, email and password. The card is bound to you — no one else can ever claim it."],
  ["⚔", "Create your adventurer", "Choose a species and class, then book your first quest."],
];

/**
 * There is no open sign-up: new accounts are created by scanning a guild card.
 * This page explains how to join and lets existing adventurers log in.
 */
function JoinPage() {
  useTitle("Join the Guild");
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/portal/");
  const { viewer, loading } = useViewer();
  const router = useRouter();
  const act = useAct();
  useEffect(() => {
    if (viewer) router.replace(next);
  }, [viewer, next, router]);
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading || viewer) return <Loading />;
  const fromCard = next.startsWith("/card");

  return (
    <div className="container-eb py-12">
      <div className="grid items-start gap-10 lg:grid-cols-[1.1fr,1fr]">
        <section>
          <div className="relative h-32 w-32">
            <MagicCircle className="absolute inset-0" />
            <Crest className="absolute inset-[28%] h-[44%] w-[44%]" glow />
          </div>
          <p className="mt-3 font-ui text-[13px] font-bold uppercase tracking-[0.3em] text-arcane-light">【 System · How to Join 】</p>
          <h1 className="heading mt-2 text-4xl sm:text-5xl">Your Card Is Your Key</h1>
          <p className="muted mt-3 max-w-lg">
            Every adventurer in Everbound begins with a real, printed guild card. There&apos;s no sign-up form — your account is created the first time you scan your card.
          </p>
          <ol className="mt-8 grid gap-4">
            {STEPS.map(([icon, t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center text-lg text-gold-light" style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)", background: "linear-gradient(160deg,#1c2944,#0d1424)", boxShadow: "inset 0 0 0 2px rgba(212,170,90,.7)" }}>{icon}</span>
                <span>
                  <span className="block font-ui text-[12px] font-bold uppercase tracking-[0.24em] text-arcane/80">Step {i + 1}</span>
                  <span className="block font-display text-lg text-gold-light">{t}</span>
                  <span className="muted text-sm">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/calendar/" className="btn-gold">See when the Guild meets</Link>
            <Link href="/how-it-works/" className="btn-ghost">Read the Guild Handbook</Link>
          </div>
          <p className="muted mt-6 text-sm">Lost your card? Your progress is safe. Ask a Guild Master for a replacement at your next session.</p>
        </section>

        <section className="lg:pt-24">
          <SystemWindow title="Log In">
            {fromCard && <p className="mb-4 rounded-sm border border-arcane/40 bg-arcane/10 p-3 text-sm text-arcane-light">Log in to continue with the card you scanned.</p>}
            <p className="mb-4 text-sm text-parchment/80">Already bound a card? Welcome back, adventurer.</p>
            <form action={act(signIn)} className="grid gap-4">
              <input type="hidden" name="next" value={next} />
              <div><label className="label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div>
              <div><label className="label" htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" required autoComplete="current-password" /></div>
              <SubmitButton pendingText="Opening the gates…">▸ Log in</SubmitButton>
            </form>
            <form action={act(sendMagicLink)} className="mt-5 grid gap-2 border-t border-white/10 pt-4">
              <input type="hidden" name="next" value={next} />
              <label className="label" htmlFor="ml-email">Forgot your password? Get a sign-in link</label>
              <div className="flex gap-2">
                <input className="input" id="ml-email" name="email" type="email" required autoComplete="email" />
                <SubmitButton className="btn-ghost" pendingText="Sending…">Send</SubmitButton>
              </div>
            </form>
          </SystemWindow>
        </section>
      </div>
    </div>
  );
}
