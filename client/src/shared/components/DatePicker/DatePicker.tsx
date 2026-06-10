import { useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import styles from './DatePicker.module.css';

// ── Locale constants ──────────────────────────────────────────────
const WEEKDAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ── Helpers ───────────────────────────────────────────────────────
function parseDate(val: string): Date | null {
  if (!val) return null;
  // Strip time/timezone portion if present (e.g. Supabase returns "2026-05-27T00:00:00+00:00")
  const datePart = val.includes('T') ? val.split('T')[0] : val;
  const d = new Date(datePart + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDisplay(val: string): string {
  const d = parseDate(val);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Component ─────────────────────────────────────────────────────
interface DatePickerProps {
  value: string;            // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  minDate?: string;         // YYYY-MM-DD - earliest selectable date
  maxDate?: string;         // YYYY-MM-DD - latest selectable date
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  name,
  minDate,
  maxDate,
}: DatePickerProps) {
  const selected = parseDate(value);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const minDateParsed = minDate ? parseDate(minDate) : null;
  const maxDateParsed = maxDate ? parseDate(maxDate) : null;

  const [open,         setOpen]         = useState(false);
  const [popupStyle,   setPopupStyle]   = useState<React.CSSProperties>({});
  const [viewYear,     setViewYear]     = useState(() => selected?.getFullYear()  ?? todayDate.getFullYear());
  const [viewMonth,    setViewMonth]    = useState(() => selected?.getMonth()     ?? todayDate.getMonth());
  const [yearPicker,   setYearPicker]   = useState(false);
  const [decadeStart,  setDecadeStart]  = useState(() => {
    const y = selected?.getFullYear() ?? todayDate.getFullYear();
    return Math.floor(y / 12) * 12;
  });
  const ref        = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on outside scroll/resize so fixed popup doesn't drift
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const minYear = minDateParsed?.getFullYear() ?? null;
  const maxYear = maxDateParsed?.getFullYear() ?? null;

  const isYearInRange = (yr: number) =>
    (minYear === null || yr >= minYear) && (maxYear === null || yr <= maxYear);

  const canGoPrevDecade = () => {
    if (minYear === null) return true;
    return decadeStart - 1 >= minYear;
  };

  const canGoNextDecade = () => {
    if (maxYear === null) return true;
    return decadeStart + 12 <= maxYear;
  };

  const canGoPrevMonth = () => {
    if (!minDateParsed) return true;
    if (viewYear > minDateParsed.getFullYear()) return true;
    return viewMonth > minDateParsed.getMonth();
  };

  const canGoNextMonth = () => {
    if (!maxDateParsed) return true;
    if (viewYear < maxDateParsed.getFullYear()) return true;
    return viewMonth < maxDateParsed.getMonth();
  };

  // Compute fixed position at open time
  function toggleOpen() {
    if (open) { setOpen(false); setYearPicker(false); return; }

    // Sync calendar view to the selected date, or fall back to maxDate/minDate anchor
    const d = parseDate(value);
    const anchor = d ?? maxDateParsed ?? minDateParsed ?? null;
    if (anchor) {
      setViewYear(anchor.getFullYear());
      setViewMonth(anchor.getMonth());
      setDecadeStart(Math.floor(anchor.getFullYear() / 12) * 12);
    }
    setYearPicker(false);

    const POPUP_H = 320;
    const POPUP_W = 268;
    const GAP     = 6;
    const rect    = triggerRef.current?.getBoundingClientRect();
    if (!rect) { setOpen(true); return; }

    // Vertical: prefer below, flip above if not enough room
    const spaceBelow = window.innerHeight - rect.bottom;
    const above      = spaceBelow < POPUP_H && rect.top > POPUP_H;

    // Horizontal: align left edge with trigger; clamp so popup stays on screen
    let left = rect.left;
    if (left + POPUP_W > window.innerWidth - 8) left = window.innerWidth - POPUP_W - 8;
    if (left < 8) left = 8;

    const style: React.CSSProperties = { position: 'fixed', width: POPUP_W, left, zIndex: 9999 };
    if (above) style.bottom = window.innerHeight - rect.top + GAP;
    else       style.top    = rect.bottom + GAP;

    setPopupStyle(style);
    setOpen(true);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build 6-row grid (padded with nulls)
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelected = (day: number) =>
    !!selected &&
    selected.getFullYear() === viewYear &&
    selected.getMonth()    === viewMonth &&
    selected.getDate()     === day;

  const isToday = (day: number) =>
    todayDate.getFullYear() === viewYear &&
    todayDate.getMonth()    === viewMonth &&
    todayDate.getDate()     === day;

  function selectDay(day: number) {
    onChange(toISO(new Date(viewYear, viewMonth, day)));
    setOpen(false);
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger */}
      <button
        type="button"
        ref={triggerRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={toggleOpen}
      >
        <CalendarDaysIcon width={15} height={15} className={styles.calIcon} />
        <span className={value ? styles.triggerValue : styles.triggerPlaceholder}>
          {value ? formatDisplay(value) : placeholder}
        </span>
      </button>

      {/* Calendar popup — position set inline via fixed coords */}
      {open && (
        <div className={styles.popup} style={popupStyle}>

          {yearPicker ? (
            <>
              {/* Year picker header */}
              <div className={styles.header}>
                <button type="button" className={styles.navBtn} onClick={() => setDecadeStart(d => d - 12)} aria-label="Década anterior" disabled={!canGoPrevDecade()}>
                  <ChevronLeftIcon width={15} height={15} />
                </button>
                <span className={styles.monthLabel}>{decadeStart} – {decadeStart + 11}</span>
                <button type="button" className={styles.navBtn} onClick={() => setDecadeStart(d => d + 12)} aria-label="Década siguiente" disabled={!canGoNextDecade()}>
                  <ChevronRightIcon width={15} height={15} />
                </button>
              </div>

              {/* Year grid — only show years within the valid range */}
              <div className={styles.yearGrid}>
                {Array.from({ length: 12 }, (_, i) => decadeStart + i)
                  .filter(yr => isYearInRange(yr))
                  .map(yr => (
                    <button
                      key={yr}
                      type="button"
                      className={[
                        styles.yearBtn,
                        yr === viewYear ? styles.yearBtnActive : '',
                        yr === todayDate.getFullYear() && yr !== viewYear ? styles.yearBtnToday : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => { setViewYear(yr); setYearPicker(false); }}
                    >
                      {yr}
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <>
              {/* Month / year header */}
              <div className={styles.header}>
                <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label="Mes anterior" disabled={!canGoPrevMonth()}>
                  <ChevronLeftIcon width={15} height={15} />
                </button>
                <button
                  type="button"
                  className={styles.monthYearLabel}
                  onClick={() => { setDecadeStart(Math.floor(viewYear / 12) * 12); setYearPicker(true); }}
                >
                  {MONTHS[viewMonth]} <span className={styles.yearChip}>{viewYear}</span>
                </button>
                <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label="Mes siguiente" disabled={!canGoNextMonth()}>
                  <ChevronRightIcon width={15} height={15} />
                </button>
              </div>

              {/* Weekday row */}
              <div className={styles.weekdays}>
                {WEEKDAYS.map(d => <span key={d} className={styles.weekday}>{d}</span>)}
              </div>

              {/* Day grid */}
              <div className={styles.grid}>
                {cells.map((day, i) =>
                  day === null
                    ? <span key={`pad-${i}`} />
                    : (
                      <button
                        key={day}
                        type="button"
                        className={[
                          styles.day,
                          isSelected(day) ? styles.daySelected : '',
                          isToday(day) && !isSelected(day) ? styles.dayToday : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => selectDay(day)}
                      >
                        {day}
                      </button>
                    )
                )}
              </div>

              {/* Footer */}
              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.footerBtn}
                  onClick={() => { onChange(''); setOpen(false); setYearPicker(false); }}
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  className={styles.footerBtn}
                  onClick={() => { onChange(toISO(todayDate)); setOpen(false); setYearPicker(false); }}
                >
                  Hoy
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default DatePicker;
