export function getSubmissionLockDate(): Date | null {
  const raw = process.env.SUBMISSIONS_LOCK_AT?.trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function submissionsAreLocked(): boolean {
  const lock = getSubmissionLockDate();
  if (!lock) return false;
  return Date.now() >= lock.getTime();
}

export function getAdminSecret(): string | null {
  const s = process.env.ADMIN_SECRET?.trim();
  return s && s.length > 0 ? s : null;
}
