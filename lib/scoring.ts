import type { SubmissionWithPicks } from "./types";

export type DraftResultMap = Map<number, string>;

/** pick_number 1-32 -> player_id */
export function computeScores(
  submissions: SubmissionWithPicks[],
  results: DraftResultMap,
): Map<string, { firstRoundHits: number; top10Hits: number }> {
  const actualFirst = new Set<string>();
  const actualTop10 = new Set<string>();
  for (const [pick, playerId] of results) {
    actualFirst.add(playerId);
    if (pick <= 10) actualTop10.add(playerId);
  }

  const out = new Map<string, { firstRoundHits: number; top10Hits: number }>();
  for (const sub of submissions) {
    let firstRoundHits = 0;
    let top10Hits = 0;
    for (const p of sub.picks) {
      if (p.is_first_round && actualFirst.has(p.player_id)) firstRoundHits += 1;
      if (p.is_top_10 && actualTop10.has(p.player_id)) top10Hits += 1;
    }
    out.set(sub.id, { firstRoundHits, top10Hits });
  }
  return out;
}

export function resultsAreComplete(results: DraftResultMap): boolean {
  if (results.size === 0) return false;
  for (let i = 1; i <= 32; i++) {
    if (!results.has(i)) return false;
  }
  return true;
}
