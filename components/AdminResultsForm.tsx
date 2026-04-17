"use client";

import { useMemo, useState, useTransition } from "react";
import { saveDraftResults } from "@/app/actions/admin";
import type { PlayerRow } from "@/lib/types";

type Props = { players: PlayerRow[]; configured: boolean };

export function AdminResultsForm({ players, configured }: Props) {
  const byName = useMemo(
    () => [...players].sort((a, b) => a.name.localeCompare(b.name)),
    [players],
  );
  const [secret, setSecret] = useState("");
  const [slots, setSlots] = useState<string[]>(() => Array.from({ length: 32 }, () => ""));
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function setSlot(i: number, playerId: string) {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = playerId;
      return next;
    });
    setMessage(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!configured) return;
    const missing = slots.some((id) => !id);
    if (missing) {
      setMessage({ type: "err", text: "Select a player for every pick 1–32." });
      return;
    }
    startTransition(async () => {
      const res = await saveDraftResults(secret, slots);
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
      <div>
        <label htmlFor="secret" className="mb-2 block text-sm font-medium text-[var(--muted)]">
          Admin secret
        </label>
        <input
          id="secret"
          type="password"
          value={secret}
          onChange={(e) => {
            setSecret(e.target.value);
            setMessage(null);
          }}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {slots.map((val, i) => (
          <div key={i} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--muted)]">Pick {i + 1}</label>
            <select
              value={val}
              onChange={(e) => setSlot(i, e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
            >
              <option value="">— choose —</option>
              {byName.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
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
