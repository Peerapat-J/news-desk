import type { DigestPeriod } from "../types";

export const DIGEST_HOURS: Record<DigestPeriod, number> = {
  morning: 9,
  evening: 20,
};

export function periodForDate(date = new Date()): DigestPeriod {
  return date.getHours() < DIGEST_HOURS.evening ? "morning" : "evening";
}

export function nextDigestRun(from = new Date()) {
  const next = new Date(from);
  const hour = from.getHours();

  if (hour < DIGEST_HOURS.morning) {
    next.setHours(DIGEST_HOURS.morning, 0, 0, 0);
    return { period: "morning" as const, date: next };
  }

  if (hour < DIGEST_HOURS.evening) {
    next.setHours(DIGEST_HOURS.evening, 0, 0, 0);
    return { period: "evening" as const, date: next };
  }

  next.setDate(next.getDate() + 1);
  next.setHours(DIGEST_HOURS.morning, 0, 0, 0);
  return { period: "morning" as const, date: next };
}

