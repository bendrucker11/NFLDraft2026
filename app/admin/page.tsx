import { AdminResultsForm } from "@/components/AdminResultsForm";
import { getAdminSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlayerRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const configured = Boolean(getAdminSecret());
  let players: PlayerRow[] = [];
  let error: string | null = null;

  try {
    const supabase = createAdminClient();
    const { data, error: qErr } = await supabase
      .from("players")
      .select("id, name, position")
      .order("position")
      .order("name");
    if (qErr) error = qErr.message;
    else players = (data ?? []) as PlayerRow[];
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Admin — actual first round</h1>
        <p className="mt-2 text-[var(--muted)]">
          Enter the real draft order (picks 1–32). Leaderboard scoring compares these to each
          submission.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      )}

      {!error && <AdminResultsForm players={players} configured={configured} />}
    </div>
  );
}
