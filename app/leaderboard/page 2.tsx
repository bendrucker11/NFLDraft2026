import Link from "next/link";
import { isAdminSession } from "@/lib/admin-session";
import { getLeaderboardRevealDate, leaderboardIsPublic } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeScores, resultsAreComplete, type DraftResultMap } from "@/lib/scoring";
import type { PlayerPosition, SubmissionWithPicks } from "@/lib/types";

export const dynamic = "force-dynamic";
const POSITION_ORDER: PlayerPosition[] = ["QB", "RB", "WR", "TE", "OL", "Edge", "DT", "LB", "CB", "S"];

export default async function LeaderboardPage() {
  const isAdmin = await isAdminSession();
  const isPublic = leaderboardIsPublic();
  const revealAt = getLeaderboardRevealDate();

  if (!isAdmin && !isPublic) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Leaderboard</h1>
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Submissions are hidden until{" "}
          {revealAt ? revealAt.toLocaleString() : "the reveal deadline"}. Admin can still view now.
        </p>
      </div>
    );
  }

  let submissions: SubmissionWithPicks[] = [];
  let resultsMap: DraftResultMap = new Map();
  let loadError: string | null = null;

  try {
    const supabase = createAdminClient();
    const { data: subData, error: subErr } = await supabase
      .from("submissions")
      .select(
        `id, username, created_at, picks (player_id, is_first_round, is_top_10, players (name, position))`,
      )
      .order("created_at", { ascending: false });

    if (subErr) loadError = subErr.message;
    else submissions = (subData ?? []) as unknown as SubmissionWithPicks[];

    const { data: resData, error: resErr } = await supabase
      .from("draft_results")
      .select("pick_number, player_id");
    if (resErr && !loadError) loadError = resErr.message;
    else {
      resultsMap = new Map(
        (resData ?? []).map((r: { pick_number: number; player_id: string }) => [
          r.pick_number,
          r.player_id,
        ]),
      );
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Unknown error";
  }

  const scoringOn = resultsAreComplete(resultsMap);
  const scores = scoringOn ? computeScores(submissions, resultsMap) : null;

  const ordered = scoringOn
    ? [...submissions].sort((a, b) => {
        const sa = scores!.get(a.id) ?? { firstRoundHits: 0, top10Hits: 0 };
        const sb = scores!.get(b.id) ?? { firstRoundHits: 0, top10Hits: 0 };
        const ta = sa.firstRoundHits + sa.top10Hits;
        const tb = sb.firstRoundHits + sb.top10Hits;
        if (tb !== ta) return tb - ta;
        return sb.top10Hits - sa.top10Hits;
      })
    : submissions;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Leaderboard</h1>
        <p className="mt-2 text-[var(--muted)]">
          Everyone who submitted. {scoringOn ? "Scores use actual results from Admin." : "Scores appear once all 32 picks are entered in Admin."}
        </p>
      </div>

      {loadError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {loadError}
        </p>
      )}

      {!loadError && ordered.length === 0 && (
        <p className="text-[var(--muted)]">No submissions yet.{" "}
          <Link href="/" className="text-[var(--accent)] underline-offset-2 hover:underline">
            Be the first
          </Link>
          .
        </p>
      )}

      {!loadError && ordered.length > 0 && (
        <ul className="space-y-4">
          {ordered.map((s) => {
            const firstCount = s.picks.filter((p) => p.is_first_round).length;
            const topCount = s.picks.filter((p) => p.is_top_10).length;
            const sc = scores?.get(s.id);
            const firstRoundByPosition = POSITION_ORDER.map((pos) => ({
              position: pos,
              picks: s.picks.filter(
                (p) => p.is_first_round && p.players?.position === pos,
              ),
            })).filter((g) => g.picks.length > 0);
            const top10Picks = s.picks
              .filter((p) => p.is_top_10)
              .sort((a, b) => (a.players?.position ?? "").localeCompare(b.players?.position ?? ""));
            return (
              <li
                key={s.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-white">{s.username}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                    <span>
                      First round: <strong className="text-white">{firstCount}</strong>
                    </span>
                    <span>
                      Top 10: <strong className="text-white">{topCount}</strong>
                    </span>
                    {sc && (
                      <>
                        <span className="text-[var(--border)]">|</span>
                        <span>
                          Hits (1st): <strong className="text-[var(--accent)]">{sc.firstRoundHits}</strong>
                        </span>
                        <span>
                          Hits (T10): <strong className="text-[var(--accent)]">{sc.top10Hits}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-[var(--muted)] hover:text-white">
                    First-round picks by position
                  </summary>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {firstRoundByPosition.map((group) => (
                      <div key={group.position} className="rounded-lg border border-[var(--border)] p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white">
                          {group.position}
                        </p>
                        <ul className="space-y-1 text-[var(--muted)]">
                          {group.picks.map((p) => (
                            <li key={p.player_id}>
                              {p.players?.name ?? "Player"}
                              {p.is_top_10 ? (
                                <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-200">
                                  Top 10
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>

                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-[var(--muted)] hover:text-white">
                    Top 10 picks
                  </summary>
                  <ul className="mt-2 space-y-1 text-[var(--muted)]">
                    {top10Picks.map((p) => (
                      <li key={p.player_id}>
                        {p.players?.name ?? "Player"}
                        <span className="ml-2 text-xs text-slate-400">({p.players?.position ?? "N/A"})</span>
                      </li>
                    ))}
                    {top10Picks.length === 0 ? <li>No top-10 picks selected.</li> : null}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
