export interface StatusInfo {
  cssClass: string;
  nombre: string;
  isTerminal: boolean;
}

export const statusClassMap: Record<number, StatusInfo> = {
  1: { cssClass: 'status-completed',  nombre: 'Completado',  isTerminal: true  },
  2: { cssClass: 'status-onTrack',    nombre: 'En Progreso', isTerminal: false },
  3: { cssClass: 'status-delayed',    nombre: 'Retrasado',   isTerminal: false },
  4: { cssClass: 'status-unassigned', nombre: 'Sin Asignar', isTerminal: false },
  5: { cssClass: 'status-archived', nombre: 'Archivado', isTerminal: true},
};
