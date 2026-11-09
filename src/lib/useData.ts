"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { useToast } from "@/lib/toast";

/** Load data on mount / when deps change. `reload()` refetches (e.g. after an action). */
export function useData<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const { push } = useToast();
  const pushRef = useRef(push);
  pushRef.current = push;

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      setError(null);
      setData(await fnRef.current());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      pushRef.current("error", `Could not reach the Guild ledgers: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;
    setLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, reload]);

  return { data, error, loading, reload };
}
