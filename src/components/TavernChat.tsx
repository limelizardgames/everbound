"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ChatMessage = { id: string; profile_id: string; author_name: string; author_role: string; body: string; created_at: string; deleted_at: string | null };

export function TavernChat({ channel, initial, me, staff, muted }: {
  channel: { id: string; name: string; description: string | null; readOnly: boolean }; initial: ChatMessage[]; me: string; staff: boolean; muted: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    const sub = supabase
      .channel(`tavern-${channel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channel.id}` }, (payload) => {
        const m = payload.new as ChatMessage;
        setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m].slice(-200)));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channel.id}` }, (payload) => {
        const m = payload.new as ChatMessage;
        setMessages((prev) => (m.deleted_at && !staff ? prev.filter((p) => p.id !== m.id) : prev.map((p) => (p.id === m.id ? m : p))));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [channel.id, staff, supabase]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase.from("messages").insert({ channel_id: channel.id, profile_id: me, body: text, author_name: "-" }).select().single();
    setSending(false);
    if (error) return setError(error.message.includes("row-level security") ? "You cannot post in this channel." : error.message);
    setBody("");
    if (data) setMessages((prev) => (prev.some((p) => p.id === data.id) ? prev : [...prev, data as ChatMessage]));
  }

  async function report(m: ChatMessage) {
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason) return;
    const { error } = await supabase.from("message_reports").insert({ message_id: m.id, reporter_id: me, reason });
    setNotice(error ? (error.code === "23505" ? "You already reported this message." : error.message) : "Thanks — a moderator will review it.");
  }

  async function block(m: ChatMessage) {
    if (!window.confirm(`Hide all messages from ${m.author_name}?`)) return;
    const { error } = await supabase.from("user_blocks").insert({ blocker_id: me, blocked_id: m.profile_id });
    if (!error || error.code === "23505") setMessages((prev) => prev.filter((p) => p.profile_id !== m.profile_id));
    setNotice(error && error.code !== "23505" ? error.message : `${m.author_name} is blocked.`);
  }

  async function remove(m: ChatMessage) {
    if (!window.confirm("Remove this message?")) return;
    const { error } = await supabase.rpc("moderate_message", { p_message: m.id, p_reason: "Removed in chat" });
    if (error) return setNotice(error.message);
    setMessages((prev) => prev.map((p) => (p.id === m.id ? { ...p, deleted_at: new Date().toISOString() } : p)));
  }

  return (
    <section className="panel flex h-[70vh] min-h-[420px] flex-col p-0" aria-label={channel.name}>
      <header className="border-b border-midnight-700 px-4 py-3">
        <h2 className="font-display text-lg text-gold-light"># {channel.name}</h2>
        {channel.description && <p className="muted text-xs">{channel.description}</p>}
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {messages.length === 0 && <p className="muted text-sm">No messages yet. Say hello!</p>}
        {messages.map((m) => (
          <div key={m.id} className={`group flex gap-3 ${m.deleted_at ? "opacity-40" : ""}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-display text-sm ${m.author_role === "adventurer" ? "bg-midnight-700 text-parchment" : "bg-gold/20 text-gold-light"}`}>{m.author_name[0]?.toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className={`font-semibold ${m.author_role === "adventurer" ? "" : "text-gold-light"}`}>{m.author_name}</span>
                {m.author_role !== "adventurer" && <span className="ml-1 text-[10px] uppercase tracking-wider text-arcane-light">Guild staff</span>}
                <span className="muted ml-2 text-xs">{new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              </p>
              <p className="whitespace-pre-wrap break-words text-sm text-parchment/90">{m.deleted_at ? "[removed by a moderator]" : m.body}</p>
              {!m.deleted_at && (
                <div className="mt-0.5 flex gap-3 text-[11px] text-parchment/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  {m.profile_id !== me && <button type="button" onClick={() => report(m)} className="hover:text-gold">Report</button>}
                  {m.profile_id !== me && m.author_role === "adventurer" && <button type="button" onClick={() => block(m)} className="hover:text-gold">Block</button>}
                  {staff && <button type="button" onClick={() => remove(m)} className="hover:text-ember">Remove</button>}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {(error || notice) && <p className={`px-4 py-2 text-sm ${error ? "text-ember" : "text-arcane-light"}`} role="status">{error ?? notice}</p>}
      {channel.readOnly ? (
        <p className="muted border-t border-midnight-700 px-4 py-3 text-sm">Only Guild staff can post here.</p>
      ) : muted ? (
        <p className="border-t border-midnight-700 px-4 py-3 text-sm text-ember">You are muted in the Tavern for now.</p>
      ) : (
        <form onSubmit={send} className="flex gap-2 border-t border-midnight-700 p-3">
          <label className="sr-only" htmlFor="chat-body">Message</label>
          <input id="chat-body" className="input" value={body} onChange={(e) => setBody(e.target.value)} maxLength={800} placeholder={`Message #${channel.name}`} autoComplete="off" />
          <button type="submit" className="btn-gold" disabled={sending || !body.trim()}>Send</button>
        </form>
      )}
    </section>
  );
}
