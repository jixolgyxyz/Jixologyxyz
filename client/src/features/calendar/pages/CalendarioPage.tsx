import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import styles from './CalendarioPage.module.css';
import { useUser } from '@/core/auth/userContext';
import { useCalendarData } from '../hooks/useCalendarData';
import ProjectFilter from '../components/ProjectFilter';
import CalendarGrid from '../components/CalendarGrid';
import LoadingState from '@/shared/components/LoadingState/LoadingState';
import EmptyState from '@/shared/components/EmptyState/EmptyState';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CALENDAR_COLORS = [
  '#6A8FB5', // muted blue
  '#5A9E78', // muted green
  '#ba861e', // muted amber
  '#B86A6A', // muted red
  '#8E72A8', // muted purple
  '#4E9BAA', // muted teal
  '#B87858', // muted orange
  '#5A9E8E', // muted cyan-green
  '#A8627E', // muted rose
  '#6A72A8', // muted indigo
];

const CalendarioPage: React.FC = () => {
  const { user, loading: userLoading } = useUser();
  const { sprints, projects, loading, error } = useCalendarData(
    user?.idRolGlobal,
    user?.id,
  );

  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [visibleProjectIds, setVisibleProjectIds] = useState<Set<number>>(new Set());

  // Show all projects by default once they load
  useEffect(() => {
    setVisibleProjectIds(new Set(projects.map(p => p.id)));
  }, [projects]);

  const projectColors = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((p, i) => {
      map.set(p.id, CALENDAR_COLORS[i % CALENDAR_COLORS.length]);
    });
    return map;
  }, [projects]);

  // Filter sprints here so CalendarGrid always receives a ready-to-render list
  const visibleSprints = useMemo(
    () => sprints.filter(s => visibleProjectIds.has(s.id_proyecto)),
    [sprints, visibleProjectIds],
  );

  const handleToggle = (projectId: number) => {
    setVisibleProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleToggleAll = (visible: boolean) => {
    if (visible) {
      setVisibleProjectIds(new Set(projects.map(p => p.id)));
    } else {
      setVisibleProjectIds(new Set());
    }
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(y => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(y => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const isCurrentMonth =
    currentYear === today.getFullYear() && currentMonth === today.getMonth();

  const isLoading = userLoading || loading;

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <ProjectFilter
          projects={projects}
          visibleProjectIds={visibleProjectIds}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          projectColors={projectColors}
        />
      </aside>

      <main className={styles.main}>
        <div className={styles.calendarHeader}>
          <div className={styles.navGroup}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={goToPrevMonth}
              aria-label="Mes anterior"
            >
              <ChevronLeftIcon style={{ width: 18, height: 18, fill: '#ffffff' }} />
            </button>
            <button
              type="button"
              className={styles.navBtn}
              onClick={goToNextMonth}
              aria-label="Mes siguiente"
            >
              <ChevronRightIcon style={{ width: 18, height: 18, fill: '#ffffff' }} />
            </button>
            <h2 className={styles.monthTitle}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
          </div>

          {!isCurrentMonth && (
            <button type="button" className={styles.todayBtn} onClick={goToToday}>
              Hoy
            </button>
          )}
        </div>

        {isLoading ? (
          <LoadingState message="Cargando calendario..." />
        ) : error ? (
          <EmptyState
            title="Error al cargar el calendario"
            subtitle={error}
          />
        ) : (
          <CalendarGrid
            year={currentYear}
            month={currentMonth}
            sprints={visibleSprints}
            projectColors={projectColors}
            today={today}
          />
        )}
      </main>
    </div>
  );
};

export default CalendarioPage;
