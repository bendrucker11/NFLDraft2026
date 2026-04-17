const DEFAULT_SUBMISSION_LOCK_AT = "2026-04-23T19:30:00-04:00";
const DEFAULT_LEADERBOARD_REVEAL_AT = "2026-04-23T20:00:00-04:00";

function parseDate(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getSubmissionLockDate(): Date | null {
  const raw = process.env.SUBMISSIONS_LOCK_AT?.trim() || DEFAULT_SUBMISSION_LOCK_AT;
  return parseDate(raw);
}

export function submissionsAreLocked(): boolean {
  const lock = getSubmissionLockDate();
  if (!lock) return false;
  return Date.now() >= lock.getTime();
}

export function getLeaderboardRevealDate(): Date | null {
  const raw = process.env.LEADERBOARD_REVEAL_AT?.trim() || DEFAULT_LEADERBOARD_REVEAL_AT;
  return parseDate(raw);
}

export function leaderboardIsPublic(): boolean {
  const reveal = getLeaderboardRevealDate();
  if (!reveal) return true;
  return Date.now() >= reveal.getTime();
}

export function getAdminSecret(): string | null {
  const s = process.env.ADMIN_SECRET?.trim();
  return s && s.length > 0 ? s : null;
}
