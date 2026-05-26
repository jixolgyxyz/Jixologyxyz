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
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  name,
}: DatePickerProps) {
  const selected = parseDate(value);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const [open,       setOpen]       = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const [viewYear,   setViewYear]   = useState(() => selected?.getFullYear()  ?? todayDate.getFullYear());
  const [viewMonth,  setViewMonth]  = useState(() => selected?.getMonth()     ?? todayDate.getMonth());
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

  // Compute fixed position at open time
  function toggleOpen() {
    if (open) { setOpen(false); return; }

    // Sync calendar view to the selected date each time the picker opens
    const d = parseDate(value);
    if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }

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

          {/* Month / year header */}
          <div className={styles.header}>
            <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label="Mes anterior">
              <ChevronLeftIcon width={15} height={15} />
            </button>
            <span className={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label="Mes siguiente">
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
                    ].join(' ')}
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
              onClick={() => { onChange(''); setOpen(false); }}
            >
              Limpiar
            </button>
            <button
              type="button"
              className={styles.footerBtn}
              onClick={() => { onChange(toISO(todayDate)); setOpen(false); }}
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatePicker;
