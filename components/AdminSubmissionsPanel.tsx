"use client";

import { useState, useTransition } from "react";
import { deleteSubmission } from "@/app/actions/admin";
import type { SubmissionWithPicks } from "@/lib/types";

type Props = {
  submissions: SubmissionWithPicks[];
};

export function AdminSubmissionsPanel({ submissions }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      <ul className="space-y-3">
        {submissions.map((s) => {
          const firstCount = s.picks.filter((p) => p.is_first_round).length;
          const topCount = s.picks.filter((p) => p.is_top_10).length;
          const deleting = pending && pendingId === s.id;
          return (
            <li key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{s.username}</p>
                  <p className="text-xs text-[var(--muted)]">{new Date(s.created_at).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    First round: {firstCount} | Top 10: {topCount}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setPendingId(s.id);
                    startTransition(async () => {
                      const res = await deleteSubmission(s.id);
                      if (res.ok) {
                        setMessage(`Deleted ${s.username}'s submission.`);
                        window.location.reload();
                      } else {
                        setMessage(res.error ?? "Delete failed.");
                      }
                    });
                  }}
                  className="rounded-lg border border-red-500/50 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
