import type { FC } from 'react';
import type { UserJornadaFte } from '../services/dashboard.service';
import styles from './JornadaFteCard.module.css';

interface Props {
  data: UserJornadaFte;
}

const JornadaFteCard: FC<Props> = ({ data }) => {
  const { jornada, rows } = data;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Jornada y FTE por proyecto</h3>
        {jornada != null && (
          <span className={styles.jornadaBadge}>{jornada}h / semana</span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>Sin asignaciones FTE registradas</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Proyecto</th>
              <th className={styles.th + ' ' + styles.thRight}>Horas</th>
              <th className={styles.th + ' ' + styles.thRight}>FTE</th>
              <th className={styles.th}>Carga</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const fte = row.fte ?? (jornada != null && jornada > 0
                ? Math.round((row.cantidad_horas / jornada) * 100) / 100
                : null);

              const pct = jornada != null && jornada > 0
                ? Math.min(100, Math.round((row.cantidad_horas / jornada) * 100))
                : null;

              return (
                <tr key={row.id_proyecto} className={styles.row}>
                  <td className={styles.td}>{row.projectName}</td>
                  <td className={styles.td + ' ' + styles.tdRight}>{row.cantidad_horas}h</td>
                  <td className={styles.td + ' ' + styles.tdRight}>
                    {fte != null ? fte.toFixed(2) : '—'}
                  </td>
                  <td className={styles.td + ' ' + styles.tdBar}>
                    {pct != null && (
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${pct}%` }}
                        />
                        <span className={styles.barLabel}>{pct}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default JornadaFteCard;
