import type { FC } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SprintHoursData } from '../hooks/useUserDashboardData';
import styles from './ChartCard.module.css';

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
            tick={{ fontSize: 11, fontFamily: 'Poppins, sans-serif' }}
          />
          <YAxis
            tick={{ fontSize: 11, fontFamily: 'Poppins, sans-serif' }}
            unit="h"
          />
          <Tooltip
            formatter={(value, name) => [`${value}h`, name]}
            contentStyle={{ fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '0.72rem', fontFamily: 'Poppins, sans-serif' }}
          />
          {data.projects.map(p => (
            <Bar
              key={p.name}
              dataKey={p.name}
              fill={p.color}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HoursBySprintBar;
