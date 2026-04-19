"use client";

import { useMemo, useState, useTransition } from "react";
import { submitDraft } from "@/app/actions/draft";
import type { PlayerRow } from "@/lib/types";

const MAX_FIRST = 32;
const MAX_TOP10 = 10;
const POSITION_ORDER = ["QB", "RB", "WR", "TE", "OL", "Edge", "DT", "LB", "CB", "S"] as const;

type Props = {
  players: PlayerRow[];
  locked: boolean;
  lockMessage: string | null;
};

export function DraftForm({ players, locked, lockMessage }: Props) {
  const [username, setUsername] = useState("");
  const [selection, setSelection] = useState<Record<string, { first: boolean; top10: boolean }>>(
    () => ({}),
  );
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    let first = 0;
    let top10 = 0;
    for (const pid of Object.keys(selection)) {
      const s = selection[pid];
      const fr = s.first || s.top10;
      if (fr) first += 1;
      if (s.top10) top10 += 1;
    }
    return { first, top10 };
  }, [selection]);

  function setPlayer(pid: string, patch: Partial<{ first: boolean; top10: boolean }>) {
    setSelection((prev) => {
      const cur = prev[pid] ?? { first: false, top10: false };
      let next = { ...cur, ...patch };
      if (next.top10) next = { ...next, first: true };
      const nextMap = { ...prev, [pid]: next };
      if (!next.first && !next.top10) {
        const rest = { ...nextMap };
        delete rest[pid];
        return rest;
      }
      return nextMap;
    });
    setMessage(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (locked) return;

    const picks = Object.entries(selection).map(([playerId, s]) => ({
      playerId,
      isFirstRound: s.first || s.top10,
      isTop10: s.top10,
    }));

    startTransition(async () => {
      const res = await submitDraft(username, picks);
      if (res.ok) {
        setMessage({ type: "ok", text: "Submission saved. Check the leaderboard." });
        setUsername("");
        setSelection({});
      } else {
        setMessage({ type: "err", text: res.error ?? "Something went wrong." });
      }
    });
  }

  const overFirst = counts.first > MAX_FIRST;
  const overTop = counts.top10 > MAX_TOP10;
  const canSubmit =
    !locked &&
    !pending &&
    username.trim().length >= 2 &&
    counts.first > 0 &&
    !overFirst &&
    !overTop;

  const grouped = useMemo(() => {
    const map = new Map<(typeof POSITION_ORDER)[number], PlayerRow[]>();
    for (const pos of POSITION_ORDER) map.set(pos, []);
    for (const p of players) {
      const key = POSITION_ORDER.includes(p.position as (typeof POSITION_ORDER)[number])
        ? (p.position as (typeof POSITION_ORDER)[number])
        : "WR";
      map.get(key)!.push(p);
    }
    for (const pos of POSITION_ORDER) {
      map.get(pos)!.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [players]);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {locked && lockMessage && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {lockMessage}
        </p>
      )}

      <div>
        <label htmlFor="username" className="mb-2 block text-sm font-medium text-[var(--muted)]">
          Your name
        </label>
        <input
          id="username"
          name="username"
          autoComplete="nickname"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setMessage(null);
          }}
          disabled={locked}
          placeholder="e.g. Alex"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-[var(--accent)] disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">One submission per name.</p>
      </div>

      <div
        className="sticky top-0 z-30 -mx-4 flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/95 px-4 py-3 text-sm text-[var(--muted)] backdrop-blur-md supports-[backdrop-filter]:bg-[var(--background)]/80"
        aria-live="polite"
        aria-label="Selection progress"
      >
        <span>
          First round:{" "}
          <strong className={overFirst ? "text-red-400" : "text-white"}>
            {counts.first}/{MAX_FIRST}
          </strong>
        </span>
        <span className="text-[var(--border)]">|</span>
        <span>
          Top 10:{" "}
          <strong className={overTop ? "text-red-400" : "text-white"}>
            {counts.top10}/{MAX_TOP10}
          </strong>
        </span>
      </div>

      <div className="space-y-4">
        {POSITION_ORDER.map((pos) => {
          const list = grouped.get(pos) ?? [];
          if (list.length === 0) return null;
          return (
            <section
              key={pos}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <h2 className="text-sm font-semibold text-white">{pos}</h2>
                <span className="text-xs text-[var(--muted)]">{list.length} players</span>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {list.map((p) => {
                  const s = selection[p.id] ?? { first: false, top10: false };
                  const first = s.first || s.top10;
                  const top10 = s.top10;
                  return (
                    <li
                      key={p.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium text-white">{p.name}</span>
                      <div className="flex flex-wrap gap-6">
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted)]">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--accent)]"
                            checked={first}
                            disabled={locked}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setPlayer(p.id, { first: on, top10: on ? top10 : false });
                            }}
                          />
                          First round
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted)]">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--accent)]"
                            checked={top10}
                            disabled={locked}
                            onChange={(e) =>
                              setPlayer(p.id, {
                                top10: e.target.checked,
                                first: e.target.checked ? true : first,
                              })
                            }
                          />
                          Top 10
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
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
        disabled={!canSubmit}
        className="w-full rounded-lg bg-[var(--accent)] py-3 text-sm font-semibold text-[#052e16] transition hover:bg-[var(--accent-muted)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Submitting…" : "Submit predictions"}
      </button>
    </form>
  );
}
