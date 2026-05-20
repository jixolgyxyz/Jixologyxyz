import type { FC } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { PriorityCount } from '../hooks/useUserDashboardData';
import ChartEmpty from './ChartEmpty';
import styles from './ChartCard.module.css';

interface Props {
  data: PriorityCount[];
}

const TICK_PROPS = { fontSize: 11, fontFamily: 'Poppins, sans-serif' };

const PriorityBar: FC<Props> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Distribución por prioridad</h3>
        <ChartEmpty hint="Asigna prioridad a tus ítems para ver su distribución." />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Distribución por prioridad</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
          <XAxis
            dataKey="prioridad"
            tick={TICK_PROPS}
          />
          <YAxis
            allowDecimals={false}
            tick={TICK_PROPS}
          />
          <Tooltip
            formatter={(value) => [value, 'Ítems']}
            contentStyle={{ fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriorityBar;
