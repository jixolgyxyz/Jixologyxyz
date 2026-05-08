import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import type { BacklogItemRecord } from '@/features/project/Backlog/types/backlog.types';
import styles from './ChartCard.module.css';
import upStyles from './UpcomingCard.module.css';

interface Props {
  items: BacklogItemRecord[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const UpcomingCard: FC<Props> = ({ items }) => {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Próximos vencimientos</h3>

      <div className={styles.overdueCount}>
        <CalendarDaysIcon width={28} height={28} className={upStyles.iconBlue} />
        <span className={upStyles.countBlue}>{items.length}</span>
        <span className={styles.countLabel}>
          {items.length === 1 ? 'ítem próximo' : 'ítems próximos'}
        </span>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Sin vencimientos próximos</p>
      ) : (
        <ul className={styles.overdueList}>
          {items.slice(0, 6).map(item => {
            const days = daysUntil(item.fecha_vencimiento!);
            const urgent = days <= 3;
            return (
              <li key={item.id} className={styles.overdueItem}>
                <CalendarDaysIcon
                  width={14}
                  height={14}
                  className={urgent ? styles.iconRed : upStyles.iconBlue}
                />
                <Link
                  to={`/proyectos/${item.id_proyecto}/backlog?item=${item.id}`}
                  className={styles.overdueItemName}
                >
                  {item.nombre}
                </Link>
                <span className={urgent ? styles.overdueItemDate : upStyles.dateNormal}>
                  {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : formatDate(item.fecha_vencimiento!)}
                </span>
              </li>
            );
          })}
          {items.length > 6 && (
            <li className={styles.overdueMore}>+{items.length - 6} más</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default UpcomingCard;
