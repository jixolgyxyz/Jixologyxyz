import React from 'react';
import styles from './SprintBar.module.css';
import type { CalendarSprintRecord } from '../../types/calendar.types';

interface SprintBarProps {
  sprint: CalendarSprintRecord;
  colStart: number;
  colEnd: number;
  lane: number;
  isStart: boolean;
  isEnd: boolean;
  color: string;
}

const SprintBar: React.FC<SprintBarProps> = ({
  sprint,
  colStart,
  colEnd,
  lane,
  isStart,
  isEnd,
  color,
}) => {
  const wrapperClass = [
    styles.wrapper,
    isStart ? styles.roundedLeft : styles.flatLeft,
    isEnd   ? styles.roundedRight : styles.flatRight,
  ].join(' ');

  return (
    <div
      className={wrapperClass}
      style={{
        gridColumn: `${colStart} / ${colEnd + 1}`,
        gridRow: lane + 1,
        backgroundColor: color,
      }}
      title={`${sprint.nombre} — ${sprint.project_nombre}`}
    >
      {isStart && (
        <span className={styles.label}>
          {sprint.nombre}
          <span className={styles.projectLabel}> · {sprint.project_nombre}</span>
        </span>
      )}
    </div>
  );
};

export default SprintBar;
