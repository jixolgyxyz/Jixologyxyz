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
import type { TypeCount } from '../hooks/useUserDashboardData';
import styles from './ChartCard.module.css';

const TYPE_COLORS = ['#E31837', '#0A0838', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

interface Props {
  data: TypeCount[];
}

const ItemsByTypeBar: FC<Props> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Ítems por tipo</h3>
        <p className={styles.empty}>Sin datos</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Ítems por tipo</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fontFamily: 'Poppins, sans-serif' }}
          />
          <YAxis
            dataKey="tipo"
            type="category"
            width={110}
            tick={{ fontSize: 11, fontFamily: 'Poppins, sans-serif' }}
          />
          <Tooltip
            formatter={(value) => [value, 'Ítems']}
            contentStyle={{ fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ItemsByTypeBar;
