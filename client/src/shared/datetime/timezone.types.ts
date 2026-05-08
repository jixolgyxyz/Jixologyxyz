export type TimeZoneName = string;

export type FormatDateTimeOptions = {
  timeZone: TimeZoneName;
  locale?: string;
  dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
  timeStyle?: Intl.DateTimeFormatOptions['timeStyle'];
};