import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import styles from './Select.module.css';

// ── Types ─────────────────────────────────────────────────────────
export interface SelectOption {
  value: string;
  label: string;
  /** Optional leading icon rendered at 16×16 */
  icon?: React.ReactNode;
  /** Optional colour applied to both trigger text and icon when this option is selected */
  color?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Shown when nothing is selected */
  placeholder?: string;
  /** Label for the blank / "none" item in the dropdown. Omit to hide it. */
  emptyLabel?: string;
  /** When true the blank option is not rendered */
  required?: boolean;
  hasError?: boolean;
  onBlur?: () => void;
  disabled?: boolean;
  /** Smaller font + tighter padding — useful for dense / long-label dropdowns */
  small?: boolean;
  /** Adds a search bar + "Ninguno" button inside the popup */
  searchable?: boolean;
  /** Extra class applied to the trigger button */
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────
export function Select({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar…',
  emptyLabel,
  required = false,
  hasError = false,
  onBlur,
  disabled = false,
  small = false,
  searchable = false,
  className,
}: SelectProps) {
  const [open,       setOpen]       = useState(false);
  const [query,      setQuery]      = useState('');
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);

  // Close helper — resets query so it's never set inside an effect
  function close() {
    setOpen(false);
    setQuery('');
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close when a scroll happens OUTSIDE this component (e.g. page or modal body)
  // but NOT when the user scrolls inside the popup's own option list.
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      if (wrapperRef.current?.contains(e.target as Node)) return;
      close();
    };
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open]);

  // Focus search input when popup opens — no setState here
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 30);
    }
  }, [open, searchable]);

  function toggle() {
    if (disabled) return;
    if (open) { close(); return; }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) { setOpen(true); return; }

    const POPUP_H = 300;
    const POPUP_W = Math.max(rect.width, small ? 240 : 200);
    const GAP     = 6;

    const spaceBelow = window.innerHeight - rect.bottom;
    const above      = spaceBelow < POPUP_H && rect.top > POPUP_H;

    let left = rect.left;
    if (left + POPUP_W > window.innerWidth - 8) left = window.innerWidth - POPUP_W - 8;
    if (left < 8) left = 8;

    const style: React.CSSProperties = { position: 'fixed', width: POPUP_W, left, zIndex: 9999 };
    if (above) style.bottom = window.innerHeight - rect.top + GAP;
    else       style.top    = rect.bottom + GAP;

    setPopupStyle(style);
    setOpen(true);
  }

  const selected  = options.find(o => o.value === value);
  const filtered  = searchable
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const triggerCls = [
    styles.trigger,
    small    ? styles.triggerSmall    : '',
    open     ? styles.triggerOpen     : '',
    hasError ? styles.triggerError    : '',
    disabled ? styles.triggerDisabled : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  const popupCls = [styles.popup, small ? styles.popupSmall : ''].join(' ');

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        ref={triggerRef}
        className={triggerCls}
        onClick={toggle}
        onBlur={onBlur}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected?.icon && (
          <span className={styles.triggerIcon} style={selected.color ? { color: selected.color } : undefined}>
            {selected.icon}
          </span>
        )}
        <span
          className={`${styles.triggerLabel} ${!selected ? styles.triggerPlaceholder : ''}`}
          style={selected?.color ? { color: selected.color } : undefined}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          width={13} height={13}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </button>

      {open && (
        <div className={popupCls} style={popupStyle} role="listbox">

          {/* ── Search bar + Ninguno ─── */}
          {searchable && (
            <div className={styles.searchRow}>
              <div className={styles.searchBox}>
                <MagnifyingGlassIcon width={14} height={14} className={styles.searchIcon} />
                <input
                  ref={searchRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder="Buscar…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              {!required && (
                <button
                  type="button"
                  className={styles.ningunoBtn}
                  onClick={() => { onChange(''); close(); }}
                >
                  Ninguno
                </button>
              )}
            </div>
          )}

          {/* ── Option list ─── */}
          <div className={styles.optionList}>
            {/* Blank option when not searchable */}
            {!searchable && !required && (
              <button
                type="button"
                role="option"
                aria-selected={value === ''}
                className={[styles.option, small ? styles.optionSmall : '', value === '' ? styles.optionActive : ''].filter(Boolean).join(' ')}
                onClick={() => { onChange(''); close(); }}
              >
                <span className={`${styles.optionLabelEmpty} ${small ? styles.optionLabelSmall : ''}`}>
                  {emptyLabel ?? placeholder}
                </span>
              </button>
            )}

            {filtered.length === 0 && (
              <span className={styles.noResults}>Sin resultados</span>
            )}

            {filtered.map(opt => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={[
                  styles.option,
                  small ? styles.optionSmall : '',
                  opt.value === value ? styles.optionActive : '',
                ].filter(Boolean).join(' ')}
                onClick={() => { onChange(opt.value); close(); }}
              >
                {opt.icon && (
                  <span className={styles.optionIcon} style={opt.color ? { color: opt.color } : undefined}>
                    {opt.icon}
                  </span>
                )}
                <span
                  className={small ? styles.optionLabelSmall : ''}
                  style={opt.color ? { color: opt.color } : undefined}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Select;
