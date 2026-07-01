const REAPPEAR_GAP_DAYS = 7;
const STALE_AGE_DAYS = 45;

export function ghostFlag(
  existing: { first_seen: string; last_seen: string } | null,
  now: Date = new Date(),
): boolean {
  if (!existing) return false;
  const days = (t: string) => (now.getTime() - new Date(t).getTime()) / 86_400_000;
  return days(existing.last_seen) >= REAPPEAR_GAP_DAYS || days(existing.first_seen) >= STALE_AGE_DAYS;
}
