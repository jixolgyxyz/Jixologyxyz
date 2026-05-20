import type { FC } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { TimeAccuracyBar } from '../hooks/useUserDashboardData';
import styles from './ChartCard.module.css';

interface Props {
  data: TimeAccuracyBar[];
}

const TICK_PROPS   = { fontSize: 11, fontFamily: 'Poppins, sans-serif' };
const TOOLTIP_STYLE = { fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' };

// Bar fill for actual time: green if on-time/under, red if overrun
function actualFill(estimated: number, actual: number): string {
  if (estimated === 0) return '#6b7280';
  return actual <= estimated ? '#10b981' : '#E31837';
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; payload: TimeAccuracyBar }[];
  label?: number;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.count === 0) return null;

  const diff    = Math.round((d.avgActual - d.avgEstimated) * 10) / 10;
  const pct     = d.avgEstimated > 0
    ? Math.round(((d.avgActual - d.avgEstimated) / d.avgEstimated) * 100)
    : 0;
  const overrun = diff > 0;

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', ...TOOLTIP_STYLE }}>
      <p style={{ fontWeight: 600, margin: '0 0 4px', color: '#0A0838' }}>Complejidad {label}</p>
      <p style={{ margin: '2px 0' }}>Estimado promedio: <b>{d.avgEstimated}h</b></p>
      <p style={{ margin: '2px 0' }}>Real promedio: <b>{d.avgActual}h</b></p>
      <p style={{ margin: '2px 0', color: overrun ? '#E31837' : '#10b981', fontWeight: 600 }}>
        {overrun ? `+${diff}h sobreestimado (${pct}%)` : diff < 0 ? `${diff}h bajo estimado (${pct}%)` : 'Estimación exacta'}
      </p>
      <p style={{ margin: '4px 0 0', color: '#6b7280' }}>{d.count} ítem{d.count !== 1 ? 's' : ''} completado{d.count !== 1 ? 's' : ''}</p>
    </div>
  );
};

const TimeAccuracyChart: FC<Props> = ({ data }) => {
  const hasData = data.some(d => d.count > 0);

  if (!hasData) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Precisión de estimación</h3>
        <p className={styles.empty}>Sin ítems completados con estimación y tiempo real registrados</p>
      </div>
    );
  }

  // Only show complexity levels that have data
  const rows = data.filter(d => d.count > 0);

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Precisión de estimación por complejidad</h3>
      <p style={{ fontSize: '0.7rem', fontFamily: 'Poppins, sans-serif', color: 'var(--color-anchor-gray-1)', margin: '0 0 4px' }}>
        Solo ítems completados · verde = dentro del estimado · rojo = sobreestimado
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 16, right: 16, left: 20, bottom: 4 }} barCategoryGap="30%" barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
          <XAxis
            dataKey="complejidad"
            tick={TICK_PROPS}
            tickFormatter={v => `Comp. ${v}`}
          />
          <YAxis tick={TICK_PROPS} unit="h" />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#e5e7eb" />
          <Bar dataKey="avgEstimated" name="Estimado" fill="#3b82f6" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="avgActual" name="Real" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {rows.map((entry, i) => (
              <Cell key={i} fill={actualFill(entry.avgEstimated, entry.avgActual)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#3b82f6' }} />
          Estimado
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ background: 'linear-gradient(90deg, #10b981 50%, #E31837 50%)' }}
          />
          Real
        </span>
      </div>
    </div>
  );
};

export default TimeAccuracyChart;
