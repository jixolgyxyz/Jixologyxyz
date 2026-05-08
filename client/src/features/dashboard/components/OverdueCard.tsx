import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { BacklogItemRecord } from '@/features/project/Backlog/types/backlog.types';
import styles from './ChartCard.module.css';

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

const OverdueCard: FC<Props> = ({ items }) => {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Ítems vencidos</h3>

      <div className={styles.overdueCount}>
        <ExclamationTriangleIcon
          width={28}
          height={28}
          className={items.length > 0 ? styles.iconRed : styles.iconGreen}
        />
        <span className={items.length > 0 ? styles.countRed : styles.countGreen}>
          {items.length}
        </span>
        <span className={styles.countLabel}>
          {items.length === 1 ? 'ítem vencido' : 'ítems vencidos'}
        </span>
      </div>

      {items.length > 0 && (
        <ul className={styles.overdueList}>
          {items.slice(0, 6).map(item => (
            <li key={item.id} className={styles.overdueItem}>
              <ClockIcon width={14} height={14} className={styles.iconRed} />
              <Link
                to={`/proyectos/${item.id_proyecto}/backlog?item=${item.id}`}
                className={styles.overdueItemName}
              >
                {item.nombre}
              </Link>
              <span className={styles.overdueItemDate}>
                {item.fecha_vencimiento ? formatDate(item.fecha_vencimiento) : ''}
              </span>
            </li>
          ))}
          {items.length > 6 && (
            <li className={styles.overdueMore}>+{items.length - 6} más</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default OverdueCard;
