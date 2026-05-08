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
import type { ComplexityBar } from '../hooks/useUserDashboardData';
import styles from './ChartCard.module.css';

interface Props {
  data: ComplexityBar[];
}

// Colour ramp: low complexity = muted blue, high = deep navy
const COMPLEXITY_COLORS = ['#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8', '#0A0838'];

const ComplexityScatter: FC<Props> = ({ data }) => {
  const hasData = data.some(d => d.count > 0);

  if (!hasData) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Horas por complejidad</h3>
        <p className={styles.empty}>Sin datos — asigna complejidad a tus ítems</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Horas por complejidad</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
          <XAxis
            dataKey="complejidad"
            tick={{ fontSize: 11, fontFamily: 'Poppins, sans-serif' }}
            ticks={[1, 2, 3, 4, 5]}
          />
          <YAxis
            unit="h"
            tick={{ fontSize: 11, fontFamily: 'Poppins, sans-serif' }}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value, _name, entry) => {
              const bar = entry.payload as ComplexityBar;
              return [`${value}h (${bar.count} ítem${bar.count !== 1 ? 's' : ''})`, 'Tiempo'];
            }}
            labelFormatter={(label) => `Complejidad ${label}`}
            contentStyle={{ fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' }}
          />
          <Bar dataKey="horas" radius={[4, 4, 0, 0]}>
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COMPLEXITY_COLORS[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComplexityScatter;
