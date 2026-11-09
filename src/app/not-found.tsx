import Link from "next/link";
import { Crest } from "@/components/Crest";

export default function NotFound() {
  return (
    <main className="container-eb flex min-h-[70vh] flex-col items-center justify-center text-center">
      <Crest className="h-20 w-20 opacity-70" />
      <h1 className="heading mt-6 text-3xl">This path leads nowhere</h1>
      <p className="muted mt-2">The Guild&apos;s cartographers have no record of this place.</p>
      <Link href="/" className="btn-gold mt-6">Return to the Guild Hall</Link>
    </main>
  );
}
