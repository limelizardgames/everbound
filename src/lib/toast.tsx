"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Toast = { id: number; kind: "ok" | "error"; text: string };
type Ctx = { push: (kind: Toast["kind"], text: string) => void };
const ToastContext = createContext<Ctx>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 9000 : 5000);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto max-w-lg rounded-lg border px-4 py-3 text-sm shadow-2xl ${t.kind === "error" ? "border-ember/70 bg-[#2a1414] text-parchment" : "border-forest/70 bg-[#10241f] text-parchment"}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export type ActionResult = string | void | { ok?: string; go?: string };

/**
 * Wraps an async form handler: shows success/error toasts, optionally navigates,
 * then runs `after` (usually a data reload). Use as <form action={act(fn)}>.
 */
export function useAct() {
  const { push } = useToast();
  const router = useRouter();
  return useCallback(
    (fn: (fd: FormData) => Promise<ActionResult>, opts: { after?: () => unknown } = {}) =>
      async (fd: FormData) => {
        try {
          const res = await fn(fd);
          const ok = typeof res === "string" ? res : res?.ok;
          if (ok) push("ok", ok);
          if (res && typeof res === "object" && res.go) router.push(res.go);
          await opts.after?.();
        } catch (e) {
          push("error", e instanceof Error ? e.message : String(e));
        }
      },
    [push, router],
  );
}
