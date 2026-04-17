"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { submissionsAreLocked } from "@/lib/env";
import type { PickInput } from "@/lib/types";

export type SubmitDraftState = {
  ok: boolean;
  error?: string;
};

const MAX_FIRST = 32;
const MAX_TOP10 = 10;

function normalizeUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function validatePicks(picks: PickInput[]): string | null {
  let first = 0;
  let top10 = 0;
  const seen = new Set<string>();
  for (const p of picks) {
    if (!p.playerId) return "Invalid player selection.";
    if (seen.has(p.playerId)) return "Duplicate player in submission.";
    seen.add(p.playerId);

    const firstRound = p.isFirstRound || p.isTop10;
    const top = p.isTop10;
    if (top && !firstRound) return "Top 10 picks must also be first round.";

    if (firstRound) first += 1;
    if (top) top10 += 1;
  }
  if (first > MAX_FIRST) return `At most ${MAX_FIRST} first-round picks.`;
  if (top10 > MAX_TOP10) return `At most ${MAX_TOP10} top-10 picks.`;
  if (first === 0) return "Select at least one first-round pick.";
  return null;
}

export async function submitDraft(
  username: string,
  picks: PickInput[],
): Promise<SubmitDraftState> {
  if (submissionsAreLocked()) {
    return { ok: false, error: "Submissions are closed for this draft." };
  }

  const u = normalizeUsername(username);
  if (u.length < 2) return { ok: false, error: "Enter a name (at least 2 characters)." };
  if (u.length > 64) return { ok: false, error: "Name is too long (max 64 characters)." };

  const err = validatePicks(picks);
  if (err) return { ok: false, error: err };

  const rows = picks.map((p) => ({
    player_id: p.playerId,
    is_first_round: p.isFirstRound || p.isTop10,
    is_top_10: p.isTop10,
  }));

  const supabase = createAdminClient();

  const { data: subRow, error: subErr } = await supabase
    .from("submissions")
    .insert({ username: u })
    .select("id")
    .single();

  if (subErr) {
    if (subErr.code === "23505") {
      return {
        ok: false,
        error: "That name already submitted. Pick a different name or ask an admin to reset.",
      };
    }
    return { ok: false, error: subErr.message };
  }

  const submissionId = subRow.id as string;
  const pickRows = rows.map((r) => ({
    submission_id: submissionId,
    player_id: r.player_id,
    is_first_round: r.is_first_round,
    is_top_10: r.is_top_10,
  }));

  const { error: pickErr } = await supabase.from("picks").insert(pickRows);
  if (pickErr) {
    await supabase.from("submissions").delete().eq("id", submissionId);
    return { ok: false, error: pickErr.message };
  }

  return { ok: true };
}
