import type { FC } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SprintHoursData } from '../hooks/useUserDashboardData';
import styles from './ChartCard.module.css';

const TICK_PROPS = { fontSize: 11, fontFamily: 'Poppins, sans-serif' };

interface Props {
  data: SprintHoursData;
}

const HoursBySprintBar: FC<Props> = ({ data }) => {
  if (data.rows.length === 0) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Horas por sprint</h3>
        <p className={styles.empty}>Sin datos</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Horas por sprint</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data.rows}
          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          barCategoryGap="20%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
          <XAxis
            dataKey="sprint"
            tick={TICK_PROPS}
          />
          <YAxis
            tick={TICK_PROPS}
            unit="h"
          />
          <Tooltip
            formatter={(value, name) => [`${value}h`, name]}
            contentStyle={{ fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' }}
          />
          {data.projects.map(p => (
            <Bar
              key={p.name}
              dataKey={p.name}
              fill={p.color}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className={styles.legend}>
        {data.projects.map(p => (
          <span key={p.name} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: p.color }} />
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
};

export default HoursBySprintBar;
