import React, { useEffect, useRef, useState } from 'react';
import ContextMenu from '@/shared/components/ContextMenu';
import type { MenuComponent, SubMenuItem } from '@/shared/components/ContextMenu';
import {
  assignEtiquetaPersonalizada,
  removeEtiquetaPersonalizada,
  assignEtiquetaPredeterminada,
  removeEtiquetaPredeterminada,
} from '../../services/projectConfig.service';
import type {
  EtiquetaPersonalizadaRecord,
  EtiquetaPredeterminadaRecord,
  MemberEtiquetaRecord,
  MemberEtiquetaPredeterminadaRecord,
} from '../../types/projectConfig.types';
import styles from './UserContextMenu.module.css';

interface UserContextMenuProps {
  userId: number;
  projectId: number;
  userName: string;
  asignadorId: number;
  etiquetas: EtiquetaPersonalizadaRecord[];
  memberEtiquetas: MemberEtiquetaRecord[];
  etiquetasPredeterminadas: EtiquetaPredeterminadaRecord[];
  memberEtiquetasPred: MemberEtiquetaPredeterminadaRecord[];
  position: { x: number; y: number };
  onClose: () => void;
  onChanged: () => void;
  onError: (msg: string) => void;
  onRemoveUser: (userId: number, userName: string) => void;
  onCreateEtiqueta: () => void;
  onEditEtiqueta: (etiqueta: EtiquetaPersonalizadaRecord) => void;
}

function toCustomSet(memberEtiquetas: MemberEtiquetaRecord[], userId: number): Set<number> {
  return new Set(
    memberEtiquetas
      .filter(me => me.id_usuario === userId)
      .map(me => me.id_etiqueta_proyecto_personalizada),
  );
}

function toPredSet(memberEtiquetasPred: MemberEtiquetaPredeterminadaRecord[], userId: number): Set<number> {
  return new Set(
    memberEtiquetasPred
      .filter(me => me.id_usuario === userId)
      .map(me => me.id_etiqueta_proyecto_predeterminada),
  );
}

const UserContextMenu: React.FC<UserContextMenuProps> = ({
  userId,
  projectId,
  userName,
  asignadorId,
  etiquetas,
  memberEtiquetas,
  etiquetasPredeterminadas,
  memberEtiquetasPred,
  position,
  onClose,
  onChanged,
  onError,
  onRemoveUser,
  onCreateEtiqueta,
  onEditEtiqueta,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [localCustomIds, setLocalCustomIds] = useState<Set<number>>(
    () => toCustomSet(memberEtiquetas, userId),
  );
  const [localPredIds, setLocalPredIds] = useState<Set<number>>(
    () => toPredSet(memberEtiquetasPred, userId),
  );

  useEffect(() => {
    setLocalCustomIds(toCustomSet(memberEtiquetas, userId));
  }, [memberEtiquetas, userId]);

  useEffect(() => {
    setLocalPredIds(toPredSet(memberEtiquetasPred, userId));
  }, [memberEtiquetasPred, userId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleToggleCustom = async (etiqueta: EtiquetaPersonalizadaRecord) => {
    const wasAssigned = localCustomIds.has(etiqueta.id);
    setLocalCustomIds(prev => {
      const next = new Set(prev);
      if (wasAssigned) next.delete(etiqueta.id); else next.add(etiqueta.id);
      return next;
    });
    try {
      if (wasAssigned) {
        await removeEtiquetaPersonalizada(userId, etiqueta.id);
      } else {
        await assignEtiquetaPersonalizada(userId, etiqueta.id, asignadorId);
      }
      onChanged();
    } catch (err) {
      setLocalCustomIds(prev => {
        const next = new Set(prev);
        if (wasAssigned) next.add(etiqueta.id); else next.delete(etiqueta.id);
        return next;
      });
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleTogglePred = async (etiqueta: EtiquetaPredeterminadaRecord) => {
    const wasAssigned = localPredIds.has(etiqueta.id);
    setLocalPredIds(prev => {
      const next = new Set(prev);
      if (wasAssigned) next.delete(etiqueta.id); else next.add(etiqueta.id);
      return next;
    });
    try {
      if (wasAssigned) {
        await removeEtiquetaPredeterminada(userId, etiqueta.id, projectId);
      } else {
        await assignEtiquetaPredeterminada(userId, etiqueta.id, projectId, asignadorId);
      }
      onChanged();
    } catch (err) {
      setLocalPredIds(prev => {
        const next = new Set(prev);
        if (wasAssigned) next.add(etiqueta.id); else next.delete(etiqueta.id);
        return next;
      });
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  // Build submenus
  const etiquetasSubMenu: SubMenuItem[] = [
    ...etiquetasPredeterminadas.map(et => ({
      text: localPredIds.has(et.id) ? `✓  ${et.nombre}` : `    ${et.nombre}`,
      onClick: () => handleTogglePred(et),
    })),
    ...etiquetas.map(et => ({
      text: localCustomIds.has(et.id) ? `✓  ${et.nombre}` : `    ${et.nombre}`,
      onClick: () => handleToggleCustom(et),
    })),
  ];

  const editarSubMenu: SubMenuItem[] = etiquetas.map(et => ({
    text: et.nombre,
    onClick: () => { onEditEtiqueta(et); onClose(); },
  }));

  const menuItems: MenuComponent[] = [
    {
      text: 'Eliminar del proyecto',
      onClick: () => { onRemoveUser(userId, userName); onClose(); },
    },
    ...(etiquetasSubMenu.length > 0 ? [{
      text: 'Gestionar etiquetas',
      onClick: () => {},
      subMenu: etiquetasSubMenu,
    }] : []),
    {
      text: 'Nueva etiqueta',
      onClick: () => { onCreateEtiqueta(); onClose(); },
    },
    ...(editarSubMenu.length > 0 ? [{
      text: 'Editar etiqueta',
      onClick: () => {},
      subMenu: editarSubMenu,
    }] : []),
  ];

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      style={{
        top: position.y + 4,
        right: window.innerWidth - position.x,
      }}
    >
      <ContextMenu elements={menuItems} />
    </div>
  );
};

export default UserContextMenu;
