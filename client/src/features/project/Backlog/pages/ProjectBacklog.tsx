import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChevronDownIcon, PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import BacklogListItem from '@/features/project/Backlog/components/BacklogListItem';
import type { BacklogStatus, Priority, BacklogItemType } from '@/features/project/Backlog/components/BacklogListItem';
import CreateBacklogItemForm from '@/features/project/Backlog/components/CreateBacklogItemForm';
import CreateSprintForm from '@/features/project/Backlog/components/CreateSprintForm';
import ViewItemDetail from '@/shared/components/ViewItemDetail/ViewItemDetail';
import SkeletonBacklogItem from '@/features/project/Backlog/components/SkeletonBacklogItem/SkeletonBacklogItem';
import FilterBar from '@/shared/components/FilterBar';
import ContextMenu from '@/shared/components/ContextMenu';
import type { MenuComponent } from '@/shared/components/ContextMenu';
import { useBacklogItems } from '@/features/project/Backlog/hooks/useBacklogItems';
import { useBacklogMeta } from '@/features/project/Backlog/hooks/useBacklogMeta';
import { updateBacklogItem, deleteBacklogItem } from '@/features/project/Backlog/services/backlog.service';
import {
  acceptBacklogItemSuggestion,
  getBacklogItemSuggestionNotificationId,
  rejectBacklogItemSuggestion,
} from '@/features/notifications/services/notificationsService';
import { useUser } from '@/core/auth/userContext';
import type { BacklogItemRecord, BacklogStatusRecord, BacklogPriorityRecord, SprintRecord } from '@/features/project/Backlog/types/backlog.types';
import styles from './ProjectBacklog.module.css';

const STATUS_COLORS: Record<number, { color: string; textColor: string }> = {
  1: { color: '#F3F4F6', textColor: '#6B7280' },
  2: { color: '#DBEAFE', textColor: '#1D4ED8' },
  3: { color: '#FEF3C7', textColor: '#D97706' },
  4: { color: '#D1FAE5', textColor: '#065F46' },
};

const TYPE_PREFIX: Record<string, string> = {
  'Historia de Usuario': 'HU',
  'Tarea':               'TA',
  'Bug':                 'BG',
  'Épica':               'EP',
  'Subtarea':            'ST',
};

const PRIORITY_MAP: Record<string, Priority> = {
  'Crítica': 'critical',
  'Alta':    'high',
  'Media':   'medium',
  'Baja':    'low',
  'Mínima':  'minimal',
};

function toBacklogStatus(record: BacklogStatusRecord): BacklogStatus {
  const colors = STATUS_COLORS[record.orden] ?? { color: '#F3F4F6', textColor: '#6B7280' };
  return { label: record.nombre, ...colors };
}

function toPriority(record: BacklogPriorityRecord | undefined): Priority {
  if (!record) return 'medium';
  return PRIORITY_MAP[record.nombre] ?? 'medium';
}

// ── FilterBubble ──────────────────────────────────────────────────
interface FilterBubbleProps {
  label: string;
  selectedLabel?: string;
  elements: MenuComponent[];
}

function FilterBubble({ label, selectedLabel, elements }: FilterBubbleProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isActive = !!selectedLabel;

  return (
    <div ref={ref} className={styles.bubble}>
      <button
        type="button"
        className={`${styles.bubbleBtn} ${isActive ? styles.bubbleBtnActive : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{isActive ? selectedLabel : label}</span>
        <ChevronDownIcon width={12} height={12} />
      </button>
      {open && (
        <div className={styles.bubbleMenu} onClick={() => setOpen(false)}>
          <ContextMenu elements={elements} />
        </div>
      )}
    </div>
  );
}

function formatSprintDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'UTC',
  });
}

// ── Main component ────────────────────────────────────────────────
const ProjectBacklog: React.FC = () => {
  const { id } = useParams();
  const PROJECT_ID = Number(id);
  const { user } = useUser();
  const { items, loading: itemsLoading, refresh } = useBacklogItems(PROJECT_ID);
  const { meta, loading: metaLoading, refresh: refreshMeta } = useBacklogMeta(PROJECT_ID);
  const isPM = user != null && meta.etiquetas.some(
    e => e.id_usuario === user.id && e.id_etiqueta_proyecto_predeterminada === 1,
  );
  const isAdmin = (user?.idRolGlobal ?? 99) <= 2;
  const canManageSprints = isPM || isAdmin;
  const refreshAll = () => { refresh(); refreshMeta(); };
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateSprintForm, setShowCreateSprintForm] = useState(false);
  const [editingSprint, setEditingSprint] = useState<SprintRecord | null>(null);
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const newDropdownRef = useRef<HTMLDivElement>(null);
  const [expandedItems, setExpandedItems]   = useState<Set<number>>(new Set());
  const [openInEditMode, setOpenInEditMode] = useState(false);

  useEffect(() => {
    if (!showNewDropdown) return;
    const handler = (e: MouseEvent) => {
      if (newDropdownRef.current && !newDropdownRef.current.contains(e.target as Node))
        setShowNewDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNewDropdown]);

  const toggleExpanded = (itemId: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  // Build parent→children map from ALL items (unfiltered)
  const childrenMap = useMemo(() => {
    const map = new Map<number, BacklogItemRecord[]>();
    for (const item of items) {
      if (item.id_backlog_item_padre != null) {
        if (!map.has(item.id_backlog_item_padre)) map.set(item.id_backlog_item_padre, []);
        map.get(item.id_backlog_item_padre)!.push(item);
      }
    }
    return map;
  }, [items]);
  const [searchParams, setSearchParams] = useSearchParams();

  const search       = searchParams.get('q')      ?? '';
  const filterStatus = searchParams.get('status') ? Number(searchParams.get('status')) : null;
  const filterType   = searchParams.get('type')   ? Number(searchParams.get('type'))   : null;
  const filterUser   = searchParams.get('user')   ? Number(searchParams.get('user'))   : null;
  const filterSprint = searchParams.get('sprint') ? Number(searchParams.get('sprint')) : null;
  const viewingId    = searchParams.get('item')   ? Number(searchParams.get('item'))   : null;

  // Derive viewingItem from URL + items list (works across tab switches / refreshes)
  const viewingItem  = viewingId != null ? (meta.items.find(i => i.id === viewingId) ?? null) : null;

  const setViewingItem = useCallback((item: BacklogItemRecord | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (item) next.set('item', String(item.id));
      else next.delete('item');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setParam = (key: string, value: number | string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') next.delete(key);
      else next.set(key, String(value));
      return next;
    }, { replace: true });
  };

  const setSearch       = (v: string)         => setParam('q',      v || null);
  const setFilterStatus = (v: number | null)  => setParam('status', v);
  const setFilterType   = (v: number | null)  => setParam('type',   v);
  const setFilterUser   = (v: number | null)  => setParam('user',   v);
  const setFilterSprint = (v: number | null)  => setParam('sprint', v);

  const loading = itemsLoading || metaLoading;
  const allStatuses = meta.statuses.map(toBacklogStatus);

  const resolveSuggestionNotificationId = async (itemId: number) => {
    const notificationId = await getBacklogItemSuggestionNotificationId(itemId);

    if (notificationId == null) {
      throw new Error(
        'No se encontró una notificación pendiente para responder esta sugerencia. Se necesita una RPC segura por id_backlog_item para resolverla desde el proyecto.',
      );
    }

    return notificationId;
  };

  const handleAcceptProjectSuggestion = async (item: BacklogItemRecord) => {
    const notificationId = await resolveSuggestionNotificationId(item.id);
    await acceptBacklogItemSuggestion(notificationId);
    refreshAll();
  };

  const handleRejectProjectSuggestion = async (item: BacklogItemRecord) => {
    const notificationId = await resolveSuggestionNotificationId(item.id);
    await rejectBacklogItemSuggestion(notificationId);
    if (viewingId === item.id) {
      setViewingItem(null);
      setOpenInEditMode(false);
    }
    refreshAll();
  };

  const filteredItems = useMemo(() => {
    const suggestionIds = new Set(
      meta.sugerencias.filter(s => !s.aceptada).map(s => s.id),
    );
    return items
      .filter(item => isPM || !suggestionIds.has(item.id))
      .filter(item => filterStatus === null || item.id_estatus             === filterStatus)
      .filter(item => filterType   === null || item.id_tipo                === filterType)
      .filter(item => filterUser   === null || item.id_usuario_responsable === filterUser)
      .filter(item => filterSprint === null || item.id_sprint              === filterSprint)
      .filter(item => item.nombre.toLowerCase().includes(search.toLowerCase()));
  }, [items, meta.sugerencias, isPM, search, filterStatus, filterType, filterUser, filterSprint]);

  const sprintGroups = useMemo<{ sprint: SprintRecord | null; items: BacklogItemRecord[] }[]>(() => {
    const map = new Map<number | null, BacklogItemRecord[]>();
    for (const item of filteredItems) {
      const key = item.id_sprint ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    const groups: { sprint: SprintRecord | null; items: BacklogItemRecord[] }[] = [];
    for (const sprint of meta.sprints) {
      groups.push({ sprint, items: map.get(sprint.id) ?? [] });
    }
    if (map.has(null)) groups.push({ sprint: null, items: map.get(null)! });
    return groups;
  }, [filteredItems, meta.sprints]);

  // ── Bubble menu options ───────────────────────────────────────────
  const statusOptions: MenuComponent[] = [
    { text: 'Todos', onClick: () => setFilterStatus(null) },
    ...meta.statuses.map(s => ({ text: s.nombre, onClick: () => setFilterStatus(s.id) })),
  ];

  const typeOptions: MenuComponent[] = [
    { text: 'Todos', onClick: () => setFilterType(null) },
    ...meta.types.map(t => ({ text: t.nombre, onClick: () => setFilterType(t.id) })),
  ];

  const userOptions: MenuComponent[] = [
    { text: 'Todos', onClick: () => setFilterUser(null) },
    ...meta.users.map(u => ({
      text: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.email,
      onClick: () => setFilterUser(u.id),
    })),
  ];

  const sprintOptions: MenuComponent[] = [
    { text: 'Todos', onClick: () => setFilterSprint(null) },
    ...meta.sprints.map(s => ({ text: s.nombre, onClick: () => setFilterSprint(s.id) })),
  ];

  // ── Selected labels ───────────────────────────────────────────────
  const selectedStatusLabel = filterStatus !== null
    ? meta.statuses.find(s => s.id === filterStatus)?.nombre
    : undefined;

  const selectedTypeLabel = filterType !== null
    ? meta.types.find(t => t.id === filterType)?.nombre
    : undefined;

  const selectedUserLabel = filterUser !== null ? (() => {
    const u = meta.users.find(u => u.id === filterUser);
    return u ? ([u.nombre, u.apellido].filter(Boolean).join(' ') || u.email) : undefined;
  })() : undefined;

  const selectedSprintLabel = filterSprint !== null
    ? meta.sprints.find(s => s.id === filterSprint)?.nombre
    : undefined;

  const renderItem = (item: BacklogItemRecord, depth = 0): React.ReactNode => {
    const statusRecord   = meta.statuses.find(s => s.id === item.id_estatus);
    const priorityRecord = meta.priorities.find(p => p.id === item.id_prioridad);
    const typeRecord     = meta.types.find(t => t.id === item.id_tipo);
    const status: BacklogStatus = statusRecord
      ? toBacklogStatus(statusRecord)
      : { label: 'Sin estatus', color: '#F3F4F6', textColor: '#6B7280' };
    const sugerencia   = meta.sugerencias.find(s => s.id === item.id);
    const isSuggestion = !!sugerencia && !sugerencia.aceptada;
    const children     = childrenMap.get(item.id) ?? [];
    const isExpanded   = expandedItems.has(item.id);

    return (
      <React.Fragment key={item.id}>
        <div style={depth > 0 ? { paddingLeft: depth * 24 } : undefined}>
          <BacklogListItem
            itemId={item.id}
            code={`${TYPE_PREFIX[typeRecord?.nombre ?? ''] ?? 'IT'}-${String(item.id).padStart(2, '0')}`}
            title={item.nombre}
            status={status}
            statuses={allStatuses}
            priority={toPriority(priorityRecord)}
            itemType={typeRecord?.nombre as BacklogItemType | undefined}
            responsibleUserId={item.id_usuario_responsable ?? undefined}
            users={meta.users}
            onAssigneeChange={async (userId) => {
              try {
                await updateBacklogItem(item.id, {
                  nombre:                 item.nombre,
                  descripcion:            item.descripcion,
                  id_tipo:                item.id_tipo,
                  id_estatus:             item.id_estatus,
                  id_prioridad:           item.id_prioridad,
                  id_sprint:              item.id_sprint,
                  fecha_inicio:           item.fecha_inicio,
                  fecha_vencimiento:      item.fecha_vencimiento,
                  id_backlog_item_padre:  item.id_backlog_item_padre,
                  id_usuario_responsable: userId,
                  complejidad:            item.complejidad,
                });
                refreshAll();
              } catch (err) {
                console.error('Error actualizando responsable:', err);
              }
            }}
            isSuggestion={isSuggestion && isPM}
            hasChildren={filterType !== null && children.length > 0}
            isExpanded={isExpanded}
            onToggle={() => toggleExpanded(item.id)}
            onStatusChange={async (newStatus) => {
              const statusRecord = meta.statuses.find(s => s.nombre === newStatus.label);
              if (!statusRecord) return;
              try {
                await updateBacklogItem(item.id, {
                  nombre:                 item.nombre,
                  descripcion:            item.descripcion,
                  id_tipo:                item.id_tipo,
                  id_estatus:             statusRecord.id,
                  id_prioridad:           item.id_prioridad,
                  id_sprint:              item.id_sprint,
                  fecha_inicio:           item.fecha_inicio,
                  fecha_vencimiento:      item.fecha_vencimiento,
                  id_backlog_item_padre:  item.id_backlog_item_padre,
                  id_usuario_responsable: item.id_usuario_responsable,
                  complejidad:            item.complejidad,
                });
                refreshAll();
              } catch (err) {
                console.error('Error actualizando estado:', err);
              }
            }}
            onViewDetails={() => { setOpenInEditMode(false); setViewingItem(item); }}
            onEdit={() => { setOpenInEditMode(true); setViewingItem(item); }}
            onDelete={async () => {
              if (!window.confirm(`¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`)) return;
              try {
                await deleteBacklogItem(item.id);
                if (viewingId === item.id) { setViewingItem(null); setOpenInEditMode(false); }
                refreshAll();
              } catch (err) {
                console.error('Error eliminando ítem:', err);
              }
            }}
            onAcceptSuggestion={isPM && isSuggestion ? () => {
              void handleAcceptProjectSuggestion(item).catch(err => {
                console.error('Error aceptando sugerencia:', err);
              });
            } : undefined}
          />
        </div>
        {isExpanded && children.map(child => renderItem(child, depth + 1))}
      </React.Fragment>
    );
  };

  const detailPanel = viewingItem && (() => {
    const sugerencia   = meta.sugerencias.find(s => s.id === viewingItem.id);
    const isSuggestion = !!sugerencia && !sugerencia.aceptada;
    return (
      <ViewItemDetail
        inline
        item={viewingItem}
        meta={meta}
        isSuggestion={isSuggestion && isPM}
        initialEditing={openInEditMode}
        onClose={() => { setViewingItem(null); setOpenInEditMode(false); }}
        onUpdated={() => refreshAll()}
        onNavigate={i => { setOpenInEditMode(false); setViewingItem(i); }}
        onAcceptSuggestion={isPM && isSuggestion ? async () => {
          await handleAcceptProjectSuggestion(viewingItem);
        } : undefined}
        onRejectSuggestion={isPM && isSuggestion ? async () => {
          await handleRejectProjectSuggestion(viewingItem);
        } : undefined}
      />
    );
  })();

  return (
    <div className={`${styles.pageLayout} ${detailPanel ? styles.pageLayoutSplit : ''}`}>

      {/* ── Left: list ── */}
      <div className={styles.contentArea}>
        <div className={styles.toolbar}>
          <FilterBar
            searchPlaceholder="Buscar ítems..."
            onSearchChange={setSearch}
            filters={[]}
            activeFilter={null}
            onFilterChange={() => {}}
          >
            <div ref={newDropdownRef} className={styles.newDropdownWrapper}>
              <button
                type="button"
                className={styles.newItemBtn}
                onClick={() => setShowNewDropdown(o => !o)}
              >
                <PlusIcon width={16} height={16} />
                Nuevo
                <ChevronDownIcon width={12} height={12} />
              </button>
              {showNewDropdown && (
                <div className={styles.newDropdownMenu}>
                  <button
                    type="button"
                    className={styles.newDropdownOption}
                    onClick={() => { setShowNewDropdown(false); setShowCreateForm(true); }}
                  >
                    Ítem
                  </button>
                  {canManageSprints && (
                    <button
                      type="button"
                      className={styles.newDropdownOption}
                      onClick={() => { setShowNewDropdown(false); setShowCreateSprintForm(true); }}
                    >
                      Sprint
                    </button>
                  )}
                </div>
              )}
            </div>
          </FilterBar>
        </div>

        <div className={styles.bubbles}>
          <FilterBubble label="Estatus"     selectedLabel={selectedStatusLabel} elements={statusOptions} />
          <FilterBubble label="Tipo"        selectedLabel={selectedTypeLabel}   elements={typeOptions} />
          <FilterBubble label="Responsable" selectedLabel={selectedUserLabel}   elements={userOptions} />
          <FilterBubble label="Sprint"      selectedLabel={selectedSprintLabel} elements={sprintOptions} />
        </div>

        <div className={styles.groups}>
          {loading ? (
            <div className={styles.list}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonBacklogItem key={i} />)}
            </div>
          ) : sprintGroups.length === 0 ? (
            <p className={styles.empty}>No hay ítems en el backlog.</p>
          ) : (
            sprintGroups.map(({ sprint, items: groupItems }) => (
              <div key={sprint?.id ?? 'no-sprint'} className={styles.sprintGroup}>
                <div className={styles.sprintHeader}>
                  <span className={styles.sprintName}>
                    {sprint ? sprint.nombre : 'Sin sprint'}
                  </span>
                  <span className={styles.sprintCount}>
                    {groupItems.length} {groupItems.length === 1 ? 'ítem' : 'ítems'}
                  </span>
                  {sprint && (
                    <span className={styles.sprintDates}>
                      {formatSprintDate(sprint.fecha_inicio)} — {formatSprintDate(sprint.fecha_final)}
                    </span>
                  )}
                  {sprint && canManageSprints && (
                    <button
                      type="button"
                      className={styles.sprintEditBtn}
                      onClick={() => setEditingSprint(sprint)}
                      title="Editar sprint"
                    >
                      <PencilSquareIcon width={14} height={14} />
                    </button>
                  )}
                </div>

                <div className={styles.list}>
                  {groupItems.map(item => renderItem(item))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right: detail panel — always in DOM so width transition runs both ways ── */}
      <div className={styles.detailArea}>
        {detailPanel}
      </div>

      <CreateBacklogItemForm
        projectId={PROJECT_ID}
        userId={user?.id ?? 0}
        meta={meta}
        isOpen={showCreateForm}
        onClose={() => {setShowCreateForm(false); setShowCreateSprintForm(false)}}
        onCreated={() => { refreshAll(); setShowCreateForm(false); setShowCreateSprintForm(false);}}
      />
      <CreateSprintForm
        key={editingSprint != null ? `edit-${editingSprint.id}` : 'create'}
        projectId={PROJECT_ID}
        userId={user?.id ?? 0}
        isOpen={showCreateSprintForm || editingSprint !== null}
        sprintToEdit={editingSprint ?? undefined}
        existingSprints={meta.sprints}
        onClose={() => { setShowCreateSprintForm(false); setEditingSprint(null); }}
        onCreated={() => { refreshAll(); setShowCreateSprintForm(false); setEditingSprint(null); }}
      />
    </div>
  );
};

export default ProjectBacklog;
