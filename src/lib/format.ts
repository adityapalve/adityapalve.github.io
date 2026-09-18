const longDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const monthYear = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' });

export function formatDate(date: Date): string {
  return longDate.format(date);
}

export function formatMonthYear(date: Date): string {
  return monthYear.format(date);
}

/** ISO calendar date (YYYY-MM-DD) for `datetime` attributes. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
