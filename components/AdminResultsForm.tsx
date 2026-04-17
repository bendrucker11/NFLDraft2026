"use client";

import { useState, useTransition } from "react";
import { saveDraftResults } from "@/app/actions/admin";

type Props = { configured: boolean };

export function AdminResultsForm({ configured }: Props) {
  const [slots, setSlots] = useState<string[]>(() => Array.from({ length: 32 }, () => ""));
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function setSlot(i: number, playerName: string) {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = playerName;
      return next;
    });
    setMessage(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!configured) return;
    const missing = slots.some((name) => !name.trim());
    if (missing) {
      setMessage({ type: "err", text: "Enter a player name for every pick 1–32." });
      return;
    }
    startTransition(async () => {
      const res = await saveDraftResults(slots);
      if (res.ok) setMessage({ type: "ok", text: "Draft results saved." });
      else setMessage({ type: "err", text: res.error ?? "Save failed." });
    });
  }

  if (!configured) {
    return (
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Set <code className="rounded bg-black/30 px-1">ADMIN_SECRET</code> in your environment to use
        this page.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {slots.map((val, i) => (
          <div key={i} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--muted)]">Pick {i + 1}</label>
            <input
              type="text"
              value={val}
              onChange={(e) => setSlot(i, e.target.value)}
              placeholder="Type player name"
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
            />
          </div>
        ))}
      </div>

      {message && (
        <p
          className={
            message.type === "ok"
              ? "rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
              : "rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          }
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[#052e16] hover:bg-[var(--accent-muted)] disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save results"}
      </button>
    </form>
  );
}
