import React, { useMemo } from 'react';
import styles from './CalendarGrid.module.css';
import SprintBar from '../SprintBar';
import type { CalendarSprintRecord } from '../../types/calendar.types';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MAX_VISIBLE_LANES = 3;

interface CalendarGridProps {
  year: number;
  month: number;
  sprints: CalendarSprintRecord[];
  projectColors: Map<number, string>;
  today: Date;
}

interface WeekBar {
  sprint: CalendarSprintRecord;
  colStart: number;
  colEnd: number;
  lane: number;
  isStart: boolean;
  isEnd: boolean;
}

function toDateOnly(dateStr: string): Date {
  // Strip any time component so both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:...' work
  const datePart = dateStr.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getCalendarWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const cursor = new Date(firstDay);
  cursor.setDate(firstDay.getDate() - firstDay.getDay());

  const weeks: Date[][] = [];

  while (true) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (week[6] >= lastDay) break;
  }

  return weeks;
}

function computeWeekBars(week: Date[], sprints: CalendarSprintRecord[]): WeekBar[] {
  const weekStart = week[0];
  const weekEnd = week[6];

  const overlapping = sprints
    .filter(s => {
      if (!s.fecha_inicio || !s.fecha_final) return false;
      const start = toDateOnly(s.fecha_inicio);
      const end = toDateOnly(s.fecha_final);
      return start <= weekEnd && end >= weekStart;
    })
    .sort((a, b) => toDateOnly(a.fecha_inicio!).getTime() - toDateOnly(b.fecha_inicio!).getTime());

  // Lane assignment: greedy — stores last end date of sprint in each lane
  const laneEnds: Date[] = [];

  return overlapping.map(sprint => {
    const sprintStart = toDateOnly(sprint.fecha_inicio!);
    const sprintEnd = toDateOnly(sprint.fecha_final!);

    const clippedStart = sprintStart < weekStart ? weekStart : sprintStart;
    const clippedEnd = sprintEnd > weekEnd ? weekEnd : sprintEnd;

    const colStartIdx = week.findIndex(d => d.getTime() === clippedStart.getTime());
    const colEndIdx = week.findIndex(d => d.getTime() === clippedEnd.getTime());
    const colStart = colStartIdx >= 0 ? colStartIdx + 1 : 1;
    const colEnd = colEndIdx >= 0 ? colEndIdx + 1 : 7;

    const isStart = sprintStart >= weekStart;
    const isEnd = sprintEnd <= weekEnd;

    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] >= clippedStart) {
      lane++;
    }
    laneEnds[lane] = clippedEnd;

    return { sprint, colStart, colEnd, lane, isStart, isEnd };
  });
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  sprints,
  projectColors,
  today,
}) => {
  const weeks = useMemo(() => getCalendarWeeks(year, month), [year, month]);

  const weekBarsPerWeek = useMemo(
    () => weeks.map(week => computeWeekBars(week, sprints)),
    [weeks, sprints],
  );

  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return (
    <div className={styles.grid}>
      <div className={styles.dayHeaders}>
        {DAY_LABELS.map(label => (
          <div key={label} className={styles.dayHeader}>{label}</div>
        ))}
      </div>

      {weeks.map((week, weekIndex) => {
        const allBars = weekBarsPerWeek[weekIndex];
        const visibleBars = allBars.filter(b => b.lane < MAX_VISIBLE_LANES);
        const maxLane = visibleBars.length > 0 ? Math.max(...visibleBars.map(b => b.lane)) : -1;
        const barsAreaRows = maxLane >= 0 ? maxLane + 1 : 0;

        return (
          <div key={weekIndex} className={styles.weekSection}>
            <div className={styles.dayCellsRow}>
              {week.map((day, dayIndex) => {
                const isToday = day.getTime() === todayTime;
                const isCurrentMonth = day.getMonth() === month;

                const overflowCount = allBars.filter(
                  b =>
                    b.lane >= MAX_VISIBLE_LANES &&
                    b.colStart <= dayIndex + 1 &&
                    b.colEnd >= dayIndex + 1,
                ).length;

                return (
                  <div
                    key={dayIndex}
                    className={`${styles.dayCell} ${!isCurrentMonth ? styles.otherMonth : ''}`}
                  >
                    <span className={`${styles.dayNumber} ${isToday ? styles.today : ''}`}>
                      {day.getDate()}
                    </span>
                    {overflowCount > 0 && (
                      <span className={styles.overflow}>+{overflowCount}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {barsAreaRows > 0 && (
              <div
                className={styles.barsArea}
                style={{ gridTemplateRows: `repeat(${barsAreaRows}, 24px)` }}
              >
                {visibleBars.map(bar => (
                  <SprintBar
                    key={`${bar.sprint.id}-w${weekIndex}`}
                    sprint={bar.sprint}
                    colStart={bar.colStart}
                    colEnd={bar.colEnd}
                    lane={bar.lane}
                    isStart={bar.isStart}
                    isEnd={bar.isEnd}
                    color={projectColors.get(bar.sprint.id_proyecto) ?? '#9e9e9e'}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CalendarGrid;
