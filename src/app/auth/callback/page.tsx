"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { safeNext } from "@/lib/format";
import { Loading } from "@/components/Guard";

/** Landing page for email confirmation / sign-in links. supabase-js exchanges the code automatically. */
export default function Page() {
  return <Suspense fallback={<Loading />}><Callback /></Suspense>;
}

function Callback() {
  const params = useSearchParams();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const next = safeNext(params.get("next"), "/portal/");
    let done = false;
    const finish = () => { if (!done) { done = true; router.replace(next); } };
    const { data } = sb().auth.onAuthStateChange((_e, session) => { if (session) finish(); });
    sb().auth.getSession().then(({ data: d }) => { if (d.session) finish(); });
    const t = setTimeout(() => { if (!done) setFailed(true); }, 8000);
    return () => { clearTimeout(t); data.subscription.unsubscribe(); };
  }, [params, router]);
  return (
    <main className="container-eb py-20 text-center">
      {failed ? (
        <div className="panel mx-auto max-w-md">
          <p className="heading text-xl">That link has expired</p>
          <p className="muted mt-2 text-sm">Open the link in the same browser you signed up with, or sign in again.</p>
          <a className="btn-gold mt-4" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/join/?mode=signin`}>Sign in</a>
        </div>
      ) : (
        <Loading label="Opening the Guild gates…" />
      )}
    </main>
  );
}
