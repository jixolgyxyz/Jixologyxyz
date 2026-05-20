import type { FC } from 'react';
import styles from './ChartCard.module.css';

interface Props {
  /** Main line — defaults to a generic "no data yet" message. */
  title?: string;
  /** Optional secondary line guiding the user on how to populate the chart. */
  hint?: string;
  /**
   * 'data'     → chart has nothing to plot yet (faded bar-chart icon).
   * 'positive' → empty is a good outcome, e.g. no overdue items (green check).
   */
  variant?: 'data' | 'positive';
}

const DataIcon = (
  <>
    <path d="M3 3v18h18" />
    <rect x="7" y="11" width="3" height="7" rx="0.6" />
    <rect x="12" y="7" width="3" height="11" rx="0.6" />
    <rect x="17" y="14" width="3" height="4" rx="0.6" />
  </>
);

const PositiveIcon = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.25 12.25l2.5 2.5 5-5.5" />
  </>
);

/**
 * Friendly empty state shown inside a dashboard chart card when it has no
 * data. Replaces the bare "Sin datos" text with an icon + heading + hint.
 */
const ChartEmpty: FC<Props> = ({ title = 'Aún no hay datos', hint, variant = 'data' }) => {
  const positive = variant === 'positive';
  return (
    <div className={styles.emptyState}>
      <svg
        className={`${styles.emptyIcon} ${positive ? styles.emptyIconPositive : ''}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {positive ? PositiveIcon : DataIcon}
      </svg>
      <p className={styles.emptyTitle}>{title}</p>
      {hint && <p className={styles.emptyHint}>{hint}</p>}
    </div>
  );
};

export default ChartEmpty;
