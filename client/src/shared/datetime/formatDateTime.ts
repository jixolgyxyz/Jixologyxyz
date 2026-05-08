import type { FormatDateTimeOptions } from './timezone.types';

export function formatDateTime(
  value: string | null,
  {
    timeZone,
    locale = 'es-MX',
    dateStyle = 'medium',
    timeStyle = 'short',
  }: FormatDateTimeOptions,
): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle,
    timeStyle,
    timeZone,
  }).format(date);
}