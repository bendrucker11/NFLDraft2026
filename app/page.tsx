import { DraftForm } from "@/components/DraftForm";
import { getSubmissionLockDate, submissionsAreLocked } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlayerRow } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadPlayers(): Promise<{ players: PlayerRow[]; error: string | null }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("players")
      .select("id, name, position")
      .order("position")
      .order("name");
    if (error) return { players: [], error: error.message };
    return { players: (data ?? []) as PlayerRow[], error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { players: [], error: msg };
  }
}

export default async function HomePage() {
  const { players, error } = await loadPlayers();
  const locked = submissionsAreLocked();
  const lockAt = getSubmissionLockDate();
  const lockMessage = locked
    ? lockAt
      ? `Submissions closed after ${lockAt.toLocaleString()}.`
      : "Submissions are closed."
    : lockAt
      ? `Submissions close ${lockAt.toLocaleString()}.`
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">First-round predictions</h1>
        <p className="mt-2 text-[var(--muted)]">
          Mark up to 32 players for the first round and up to 10 for the top 10. Checking Top 10
          automatically counts as first round.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <p className="font-medium">Could not load players</p>
          <p className="mt-1 text-red-200/90">{error}</p>
          <p className="mt-2 text-xs text-red-200/70">
            Add <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-black/30 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
            <code className="rounded bg-black/30 px-1">.env.local</code>, run{" "}
            <code className="rounded bg-black/30 px-1">supabase/schema.sql</code>, then restart{" "}
            <code className="rounded bg-black/30 px-1">npm run dev</code>.
          </p>
        </div>
      )}

      {!error && (
        <DraftForm players={players} locked={locked} lockMessage={lockMessage} />
      )}
    </div>
  );
}
