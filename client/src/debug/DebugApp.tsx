import React, { useMemo, useState } from 'react';
import '@/app/index.css';

import ProjectCard from '@/features/project/projectHub/components/ProjectCard';
import StatusLabel from '@/shared/components/StatusLabel';
import LogInPage from '@/features/auth/pages/LogInPage';
import Profile from '@/features/profile/pages';
import SearchBarComponent from '@/shared/components/SearchBarComponent';
import ProjectsPage from '@/features/project/projectHub/pages/ProjectsPage';
import UserCard from '@/features/profile/components/UserCard/UserCard';
import ListUserCard from '@/shared/components/ListUserCard';
import type { Role } from '@/shared/components/ListUserCard';
import { useUserProfile } from '@/features/user/services/user.service';
import { AvatarLootBox } from '@/features/profile/components/AvatarLootBox';
import { useAvatarCatalog } from '@/features/profile/hooks/useAvatarCatalog';
import { useUserAvatar } from '@/features/profile/hooks/useUserAvatar';
import { useAvatarFeatures } from '@/features/profile/hooks/useAvatarFeatures';
import BacklogListItem from '@/features/project/Backlog/components/BacklogListItem';
import type { BacklogStatus, Priority, BacklogItemType } from '@/features/project/Backlog/components/BacklogListItem';
import CreateBacklogItemForm from '@/features/project/Backlog/components/CreateBacklogItemForm';
import SkeletonBacklogItem from '@/features/project/Backlog/components/SkeletonBacklogItem/SkeletonBacklogItem';
import { useBacklogItems } from '@/features/project/Backlog/hooks/useBacklogItems';
import { useBacklogMeta } from '@/features/project/Backlog/hooks/useBacklogMeta';
import type { BacklogStatusRecord, BacklogPriorityRecord } from '@/features/project/Backlog/types/backlog.types';

// --- Shared Components ---
import ContextMenu from '@/shared/components/ContextMenu';
import type { MenuComponent } from '@/shared/components/ContextMenu';

type DebugViewKey = 'login' | 'projects' | 'profile' | 'searchBar' | 'projectsPage' | 'userCard' | 'listUserCard' | 'lootbox' | 'contextMenu'|  'backlogItem' | 'createBacklogItem';

// ── Status colour map (by orden) ──────────────────────────────────────────────
const STATUS_COLORS: Record<number, { color: string; textColor: string }> = {
  1: { color: '#F3F4F6', textColor: '#6B7280' }, // Por Hacer   — gray
  2: { color: '#DBEAFE', textColor: '#1D4ED8' }, // En Progreso — blue
  3: { color: '#FEF3C7', textColor: '#D97706' }, // En Revisión — amber
  4: { color: '#D1FAE5', textColor: '#065F46' }, // Acabado     — green
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

function DebugBacklogList() {
  const { items, loading: itemsLoading } = useBacklogItems(null);
  const { meta, loading: metaLoading } = useBacklogMeta(1);
  const loading = itemsLoading || metaLoading;

  const allStatuses = meta.statuses.map(toBacklogStatus);

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {Array.from({ length: 5 }).map((_, i) => <SkeletonBacklogItem key={i} />)}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonBacklogItem key={i} />)}
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map(item => {
        const statusRecord   = meta.statuses.find(s => s.id === item.id_estatus);
        const priorityRecord = meta.priorities.find(p => p.id === item.id_prioridad);
        const typeRecord     = meta.types.find(t => t.id === item.id_tipo);
        const status: BacklogStatus = statusRecord
          ? toBacklogStatus(statusRecord)
          : { label: 'Sin estatus', color: '#F3F4F6', textColor: '#6B7280' };
        const prefix = TYPE_PREFIX[typeRecord?.nombre ?? ''] ?? 'IT';

        return (
          <BacklogListItem
            key={item.id}
            code={`${prefix}-${String(item.id).padStart(2, '0')}`}
            title={item.nombre}
            status={status}
            statuses={allStatuses}
            priority={toPriority(priorityRecord)}
            itemType={typeRecord?.nombre as BacklogItemType | undefined}
          />
        );
      })}
    </div>
  );
}

function DebugCreateBacklogItem() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: '0.6rem 1.4rem',
          borderRadius: '999px',
          border: 'none',
          background: 'var(--color-mahindra-red)',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + Nuevo ítem de backlog
      </button>
      <CreateBacklogItemForm
        projectId={1}
        userId={1}
        isOpen={open}
        onClose={() => setOpen(false)}
        onCreated={() => setOpen(false)}
      />
    </div>
  );
}

// ── DB-connected wrappers (hooks require real components) ─────────────────────

function calcAge(fechaNacimiento: string): number {
  const birth = new Date(fechaNacimiento);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function DbUserCard({ userId }: { userId: number }) {
  const { userProfile, loading } = useUserProfile(userId);
  if (loading || !userProfile) return null;

  const nombre    = [userProfile.nombre, userProfile.apellido].filter(Boolean).join(' ') || '—';
  const birthDate = userProfile.fechaNacimiento
    ? new Date(userProfile.fechaNacimiento).toLocaleDateString('es-MX')
    : '—';
  const age = userProfile.fechaNacimiento ? calcAge(userProfile.fechaNacimiento) : 0;

  return (
    <UserCard
      userId={userId}
      name={nombre}
      age={age}
      birthDate={birthDate}
      phone={userProfile.telefono ?? '—'}
      email={userProfile.email}
      aboutMe={userProfile.sobreMi ?? ''}
    />
  );
}

function DbListUserCard({ userId, roles }: { userId: number; roles: Role[] }) {
  const { userProfile, loading } = useUserProfile(userId);
  if (loading || !userProfile) return null;

  const fullName = [userProfile.nombre, userProfile.apellido].filter(Boolean).join(' ') || '—';

  return (
    <ListUserCard
      userId={userId}
      fullName={fullName}
      roles={roles}
      email={userProfile.email}
    />
  );
}

function DbLootBox({ userId }: { userId: number }) {
  const { catalog, allElements, atributos, loading } = useAvatarCatalog();
  const { filteredCatalog, initialFeatures, addRandomItem, unownedItems, addingItem } = useUserAvatar(
    userId, catalog, allElements, atributos,
  );
  const { features } = useAvatarFeatures(
    filteredCatalog ?? { styleId: 1, styleName: '', features: [], defaultFeatures: {} },
    initialFeatures,
  );

  if (loading || !filteredCatalog) return <p style={{ padding: '2rem', fontFamily: 'monospace' }}>Cargando…</p>;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <AvatarLootBox
        unownedItems={unownedItems}
        atributos={atributos}
        baseFeatures={features}
        onOpen={addRandomItem}
        disabled={addingItem}
      />
    </div>
  );
}

// ── Debug app ─────────────────────────────────────────────────────────────────

export default function DebugApp() {
  const views = useMemo<Record<DebugViewKey, React.ReactNode>>(
    () => ({
      login: <LogInPage />,

      projects: (
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxSizing: 'border-box',
          }}
        >
          <h2 style={{ fontFamily: 'monospace', margin: 0 }}>Debug Playground</h2>

          <ProjectCard
            projectId={1}
            projectName="Proyecto Alpha"
            projectStatus={1}
            projectStack={['React', 'TypeScript', 'Supabase']}
            completition={100}
            projectDescription="Migración completa del sistema legacy a arquitectura moderna con React y Supabase."
            projectDueDate="2026-03-01"
            projectFTE={3}
            statusLabel={
              <StatusLabel
                statusId={1}
                statusOrder={1}
                isTerminal={true}
                statusName="Completado"
              />
            }
          />

          <ProjectCard
            projectId={2}
            projectName="Proyecto Beta"
            projectStatus={2}
            projectStack={['Vue', 'Node.js', 'PostgreSQL']}
            completition={60}
            projectDescription="Desarrollo del módulo de reportes financieros con exportación a PDF y Excel."
            projectDueDate="2026-05-15"
            projectFTE={5}
            statusLabel={
              <StatusLabel
                statusId={2}
                statusOrder={2}
                isTerminal={false}
                statusName="En Progreso"
              />
            }
          />

          <ProjectCard
            projectId={3}
            projectName="Proyecto Gamma"
            projectStatus={3}
            projectStack={['Angular', 'Express', 'MongoDB']}
            completition={30}
            projectDescription="Integración con API de pagos externos. Bloqueado por dependencia de proveedor."
            projectDueDate="2026-04-10"
            projectFTE={2}
            statusLabel={
              <StatusLabel
                statusId={3}
                statusOrder={3}
                isTerminal={false}
                statusName="Retrasado"
              />
            }
          />
          <ProjectCard
            projectId={4}
            projectName="Proyecto Delta"
            projectStatus={4}
            projectStack={['React Native daennieifen', 'Firebase efaerafva', '...']}
            completition={0}
            projectDescription="App móvil para gestión de inventario en campo. Pendiente de asignación de equipo."
            projectDueDate="2026-08-01"
            projectFTE={0}
            statusLabel={
              <StatusLabel
                statusId={4}
                statusOrder={4}
                isTerminal={false}
                statusName="Sin Asignar"
              />
            }
          />
        </div>
      ),

      searchBar: (
        <div style={{ padding: '1.5rem' }}>
          <SearchBarComponent infoText="Buscar proyectos..." />
        </div>
      ),

      projectsPage: <ProjectsPage />,

      userCard: <DbUserCard userId={1} />,

      listUserCard: (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <DbListUserCard
            userId={1}
            roles={[
              { label: 'QA',    color: '#FEF3C7', textColor: '#D97706' },
              { label: 'Front', color: '#EDE9FE', textColor: '#7C3AED' },
            ]}
          />
          <DbListUserCard
            userId={2}
            roles={[
              { label: 'Back',   color: '#DBEAFE', textColor: '#1D4ED8' },
              { label: 'DevOps', color: '#D1FAE5', textColor: '#065F46' },
            ]}
          />
          <DbListUserCard
            userId={1}
            roles={[
              { label: 'PM', color: '#FCE7F3', textColor: '#BE185D' },
            ]}
          />
        </div>
      ),

      backlogItem: <DebugBacklogList />,

      createBacklogItem: <DebugCreateBacklogItem />,

      profile: <Profile debugUserId={1} />,

      lootbox: <DbLootBox userId={1} />,

      contextMenu: (() => {
        const items: MenuComponent[] = [
          { text: 'Ver detalles',   onClick: () => console.log('Ver detalles') },
          { text: 'Editar',         onClick: () => console.log('Editar') },
          { text: 'Archivar',       onClick: () => console.log('Archivar') },
          { text: 'Eliminar',       onClick: () => console.log('Eliminar') },
        ];
        return (
          <div style={{ padding: '2rem' }}>
            <ContextMenu elements={items} />
          </div>
        );
      })(),
    }),
    []
  );

  const [activeView, setActiveView] = useState<DebugViewKey>('profile');

  return (
    <React.StrictMode>
      <div
        style={{
          minHeight: '100%',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            gap: '0.75rem',
            padding: '1rem',
            borderBottom: '0.0625rem solid #d9d9d9',
            backgroundColor: '#ffffff',
            flexWrap: 'wrap',
          }}
        >
          {(Object.keys(views) as DebugViewKey[]).map((viewKey) => (
            <button
              key={viewKey}
              type="button"
              onClick={() => setActiveView(viewKey)}
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '999rem',
                border: '0.0625rem solid #cfcfcf',
                backgroundColor: activeView === viewKey ? '#1f3650' : '#ffffff',
                color: activeView === viewKey ? '#ffffff' : '#222222',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {viewKey}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: 'var(--color-clarity-gray-1)', minHeight: '100vh' }}>
          {views[activeView]}
        </div>
      </div>
    </React.StrictMode>
  );
}