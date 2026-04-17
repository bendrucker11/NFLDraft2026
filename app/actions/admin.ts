"use server";

import { revalidatePath } from "next/cache";
import { clearAdminSession, isAdminSession, setAdminSession } from "@/lib/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSecret } from "@/lib/env";

export type SaveResultsState = { ok: boolean; error?: string };
export type AdminAuthState = { ok: boolean; error?: string };
export type DeleteSubmissionState = { ok: boolean; error?: string };

export async function loginAdmin(secret: string): Promise<AdminAuthState> {
  const expected = getAdminSecret();
  if (!expected) {
    return { ok: false, error: "Admin is not configured (set ADMIN_SECRET)." };
  }
  if (secret !== expected) {
    return { ok: false, error: "Invalid admin secret." };
  }
  await setAdminSession();
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return { ok: true };
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSession();
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

/** Ordered list of 32 player names: index 0 = pick #1 */
export async function saveDraftResults(orderedPlayerNames: string[]): Promise<SaveResultsState> {
  const authed = await isAdminSession();
  if (!authed) return { ok: false, error: "Admin login required." };

  if (orderedPlayerNames.length !== 32) {
    return { ok: false, error: "Provide exactly 32 picks (full first round)." };
  }

  const normalized = orderedPlayerNames.map((n) => n.trim());
  if (normalized.some((n) => n.length === 0)) {
    return { ok: false, error: "Every pick must have a player name." };
  }

  const unique = new Set(normalized.map((n) => n.toLowerCase()));
  if (unique.size !== 32) {
    return { ok: false, error: "Each pick must be a different player." };
  }

  const supabase = createAdminClient();
  const { data: players, error: playersErr } = await supabase
    .from("players")
    .select("id, name")
    .in("name", normalized);
  if (playersErr) return { ok: false, error: playersErr.message };

  const byName = new Map((players ?? []).map((p) => [p.name.toLowerCase(), p.id as string]));
  const missing = normalized.filter((name) => !byName.has(name.toLowerCase()));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Player not found: ${missing[0]}. Check spelling against the players list.`,
    };
  }

  const rows = normalized.map((name, i) => ({
    pick_number: i + 1,
    player_id: byName.get(name.toLowerCase())!,
  }));

  const { error } = await supabase.from("draft_results").upsert(rows, {
    onConflict: "pick_number",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/leaderboard");
  return { ok: true };
}

export async function deleteSubmission(submissionId: string): Promise<DeleteSubmissionState> {
  const authed = await isAdminSession();
  if (!authed) return { ok: false, error: "Admin login required." };
  if (!submissionId) return { ok: false, error: "Missing submission id." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("submissions").delete().eq("id", submissionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return { ok: true };
}
