import { logoutAdmin } from "@/app/actions/admin";
import { isAdminSession } from "@/lib/admin-session";
import { AdminResultsForm } from "@/components/AdminResultsForm";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminSubmissionsPanel } from "@/components/AdminSubmissionsPanel";
import { getAdminSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubmissionWithPicks } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const configured = Boolean(getAdminSecret());
  const isAdmin = await isAdminSession();
  let submissions: SubmissionWithPicks[] = [];
  let error: string | null = null;

  if (isAdmin) {
    try {
      const supabase = createAdminClient();
      const { data: subsData, error: subsErr } = await supabase
        .from("submissions")
        .select("id, username, created_at, picks (player_id, is_first_round, is_top_10, players (name, position))")
        .order("created_at", { ascending: false });
      if (subsErr && !error) error = subsErr.message;
      else submissions = (subsData ?? []) as unknown as SubmissionWithPicks[];
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error";
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Admin — actual first round</h1>
        <p className="mt-2 text-[var(--muted)]">
          Admins can enter real results, review all submissions, and delete entries.
        </p>
      </div>

      {!configured && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Set <code className="rounded bg-black/30 px-1">ADMIN_SECRET</code> to enable admin login.
        </p>
      )}

      {configured && !isAdmin && <AdminLoginForm />}

      {configured && isAdmin && (
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:text-white"
          >
            Log out
          </button>
        </form>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      )}

      {!error && configured && isAdmin && (
        <>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Draft results entry</h2>
            <AdminResultsForm configured={configured} />
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Submissions</h2>
            <AdminSubmissionsPanel submissions={submissions} />
          </section>
        </>
      )}
    </div>
  );
}
