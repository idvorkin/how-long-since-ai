export interface TimeSince {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parse a `YYYY-MM-DD` release date as LOCAL midnight.
 *
 * `new Date('2026-07-24')` is UTC midnight, which is the *previous evening*
 * anywhere west of Greenwich. That one-day skew made the calendar arithmetic
 * below fire a day early: viewed from Seattle on 2026-08-27, a release dated
 * 2026-07-28 — 30 days back, not yet a month — decomposed into a whole month
 * and rendered "1m".
 */
export function parseEventDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return new Date(dateStr);
  return new Date(year, month - 1, day);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole days between two local midnights. Rounds away DST's 23- and 25-hour days. */
const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS);

/**
 * `d` plus `n` months, clamped to the last day of the target month — so
 * Jan 31 + 1 month is Feb 28, not Mar 3 (which is what JS Date rollover gives).
 */
function addMonths(d: Date, n: number): Date {
  const year = d.getFullYear();
  const month = d.getMonth() + n;
  const lastDayOfTarget = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(d.getDate(), lastDayOfTarget));
}

/**
 * Elapsed time as whole calendar months plus leftover days.
 *
 * A month is only counted once its day-of-month anniversary has actually
 * landed, so nothing reads "1m" until it is genuinely a month old. `now` is
 * injectable so the boundary can be exercised without mocking the clock.
 */
export function calculateTimeSince(eventDate: Date, now: Date = new Date()): TimeSince {
  const from = startOfDay(eventDate);
  const to = startOfDay(now);
  const totalDays = Math.max(daysBetween(from, to), 0);

  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (months > 0 && addMonths(from, months) > to) months--;
  if (months < 0) months = 0;

  const days = Math.max(daysBetween(addMonths(from, months), to), 0);

  return { years: Math.floor(months / 12), months: months % 12, days, totalDays };
}
