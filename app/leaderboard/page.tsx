import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeScores, resultsAreComplete, type DraftResultMap } from "@/lib/scoring";
import type { SubmissionWithPicks } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  let submissions: SubmissionWithPicks[] = [];
  let resultsMap: DraftResultMap = new Map();
  let loadError: string | null = null;

  try {
    const supabase = createAdminClient();
    const { data: subData, error: subErr } = await supabase
      .from("submissions")
      .select(
        `id, username, created_at, picks (player_id, is_first_round, is_top_10, players (name))`,
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
                    Full pick list
                  </summary>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[var(--muted)]">
                    {s.picks
                      .filter((p) => p.is_first_round)
                      .map((p) => (
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
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
