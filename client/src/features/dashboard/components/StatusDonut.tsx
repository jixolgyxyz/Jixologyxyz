import type { FC } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { StatusSlice } from '../hooks/useUserDashboardData';
import ChartEmpty from './ChartEmpty';
import styles from './ChartCard.module.css';

interface Props {
  data: StatusSlice[];
}

const StatusDonut: FC<Props> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Estado de ítems</h3>
        <ChartEmpty hint="Tus ítems asignados aparecerán aquí agrupados por estado." />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Estado de ítems</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [value, name]}
            contentStyle={{ fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className={styles.legend}>
        {data.map((s, i) => (
          <span key={i} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
};

export default StatusDonut;
