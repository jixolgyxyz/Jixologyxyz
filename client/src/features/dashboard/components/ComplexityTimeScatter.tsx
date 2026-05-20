import { type FC, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ComplexityTimePoint } from '../hooks/useUserDashboardData';
import styles from './ChartCard.module.css';

interface Props {
  data: ComplexityTimePoint[];
}

const TICK_PROPS = { fontSize: 11, fontFamily: 'Poppins, sans-serif' };
const COMPLEXITY_TICKS = [1, 2, 3, 4, 5];

const COMPLEXITY_COLORS = ['', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8', '#0A0838'];

const CustomDot = (props: { cx?: number; cy?: number; payload?: ComplexityTimePoint }) => {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return null;
  const fill = COMPLEXITY_COLORS[Math.max(1, Math.min(5, payload.complejidad))];
  return <circle cx={cx} cy={cy} r={5} fill={fill} opacity={0.8} stroke="#fff" strokeWidth={1} />;
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ComplexityTimePoint }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif', maxWidth: 220 }}>
      <p style={{ fontWeight: 600, margin: '0 0 4px', color: '#0A0838', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre}</p>
      <p style={{ margin: '2px 0' }}>Complejidad: <b>{d.complejidad}</b></p>
      <p style={{ margin: '2px 0' }}>Horas estimadas: <b>{d.horas}h</b></p>
    </div>
  );
};

const ComplexityTimeScatter: FC<Props> = ({ data }) => {
  const yMax = useMemo(
    () => (data.length ? Math.ceil(Math.max(...data.map(d => d.horas)) * 1.15) : 10),
    [data],
  );

  if (data.length === 0) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Estimación vs. complejidad</h3>
        <p className={styles.empty}>Sin datos — asigna complejidad y tiempo estimado a tus ítems</p>
      </div>
    );
  }

  const avgHours = Math.round((data.reduce((s, d) => s + d.horas, 0) / data.length) * 10) / 10;
  const avgComplexity = Math.round((data.reduce((s, d) => s + d.complejidad, 0) / data.length) * 10) / 10;

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Estimación vs. complejidad</h3>
      <p style={{ fontSize: '0.7rem', fontFamily: 'Poppins, sans-serif', color: 'var(--color-anchor-gray-1)', margin: '0 0 4px' }}>
        X = complejidad · Y = horas estimadas · cada punto = 1 ítem
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 12, right: 20, bottom: 28, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
          <XAxis
            dataKey="complejidad"
            type="number"
            name="Complejidad"
            tick={TICK_PROPS}
            domain={[0.5, 5.5]}
            ticks={COMPLEXITY_TICKS}
          />
          <YAxis
            dataKey="horas"
            type="number"
            name="Horas"
            tick={TICK_PROPS}
            unit="h"
            domain={[0, yMax]}
          />
          <ReferenceLine x={avgComplexity} stroke="#94a3b8" strokeDasharray="4 3"
            label={{ value: `x̄ comp ${avgComplexity}`, position: 'insideTopRight', fontSize: 9, fill: '#94a3b8', fontFamily: 'Poppins, sans-serif' }}
          />
          <ReferenceLine y={avgHours} stroke="#94a3b8" strokeDasharray="4 3"
            label={{ value: `x̄ ${avgHours}h`, position: 'insideTopRight', fontSize: 9, fill: '#94a3b8', fontFamily: 'Poppins, sans-serif' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter
            data={data}
            isAnimationActive={false}
            shape={(p: { cx?: number; cy?: number; payload?: ComplexityTimePoint }) => <CustomDot {...p} />}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
        {[1, 2, 3, 4, 5].map(c => (
          <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontFamily: 'Poppins, sans-serif', color: 'var(--color-anchor-gray-1)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: COMPLEXITY_COLORS[c], display: 'inline-block' }} />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ComplexityTimeScatter;
