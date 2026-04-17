"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSecret } from "@/lib/env";

export type SaveResultsState = { ok: boolean; error?: string };

/** Ordered list of 32 player UUIDs: index 0 = pick #1 */
export async function saveDraftResults(
  secret: string,
  orderedPlayerIds: string[],
): Promise<SaveResultsState> {
  const expected = getAdminSecret();
  if (!expected) {
    return { ok: false, error: "Admin is not configured (set ADMIN_SECRET)." };
  }
  if (secret !== expected) {
    return { ok: false, error: "Invalid admin secret." };
  }

  if (orderedPlayerIds.length !== 32) {
    return { ok: false, error: "Provide exactly 32 picks (full first round)." };
  }

  const unique = new Set(orderedPlayerIds);
  if (unique.size !== 32) {
    return { ok: false, error: "Each pick must be a different player." };
  }

  const supabase = createAdminClient();
  const rows = orderedPlayerIds.map((playerId, i) => ({
    pick_number: i + 1,
    player_id: playerId,
  }));

  const { error } = await supabase.from("draft_results").upsert(rows, {
    onConflict: "pick_number",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
