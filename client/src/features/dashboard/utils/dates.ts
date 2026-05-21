// Shared date helpers for the dashboard.
//
// Centralised so "today" and the current work-week are computed the same way
// everywhere — and in the user's LOCAL timezone, not UTC. Using UTC (e.g.
// `new Date().toISOString()`) can classify an item as overdue a day early or
// late for users far from UTC.

/** Formats a Date as 'YYYY-MM-DD' using its LOCAL calendar date. */
export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today as a 'YYYY-MM-DD' string in the user's local timezone. */
export function localToday(): string {
  return localDateString(new Date());
}

/** Monday 00:00:00 and Friday 23:59:59.999 of the current local week. */
export function currentWorkWeek(): { monday: Date; friday: Date } {
  const now = new Date();
  const day = now.getDay();               // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;  // shift back to this week's Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return { monday, friday };
}
