import React, { useMemo, useState, useEffect } from 'react';
import styles from './ProjectsPage.module.css';
import { useUser } from '@/core/auth/userContext';
import { useNavigate } from 'react-router-dom';

// --- Interfaces ---
import type { Project } from '@/features/project/projectHub/types/Project';
import type { MenuComponent } from '@/shared/components/ContextMenu';

// --- Servicios ---
import { archiveProject, unarchiveProject, changeProjectStatus, getArchivedProjects } from '@/features/project/projectHub/services/projects.services';

// --- Hooks ---
import { useProjectCards} from '../../hooks/useProjects';
import { useRecentProjects } from '../../hooks/useRecentProjects';

// --- Componentes ---
import ProjectCard from '@/features/project/projectHub/components/ProjectCard';
import StatusLabel from '@/shared/components/StatusLabel';
import EmptyState from '@/shared/components/EmptyState';
import SkeletonCard from '@/shared/components/SkeletonCard';
import CreateProject from '@/features/project/projectHub/components/CreateProject';
import ProjectCreationToast from '@/features/project/projectHub/components/ProjectCreationToast';
import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';
import TabNav from '@/shared/components/TabNav/TabNav';
import SearchBarComponent from '@/shared/components/SearchBarComponent/SearchBarComponent';
import { PlusIcon } from '@heroicons/react/24/outline';

type FilterKey = 'TodosLosProyectos' | 'Completados' | 'EnProgreso' | 'Retrasado' | 'SinAsignar' | 'Archivados';

const FILTER_TO_STATUS_ID: Partial<Record<FilterKey, number>> = {
  Completados: 1,
  EnProgreso:  2,
  Retrasado:   3,
  SinAsignar:  4,
};

const FILTER_LABELS: Record<FilterKey, string> = {
  TodosLosProyectos: 'Todos',
  Completados:       'Completado',
  EnProgreso:        'En Progreso',
  Retrasado:         'Retrasado',
  SinAsignar:        'Sin Asignar',
  Archivados:        'Archivados',
};

const ProjectsPage: React.FC = () => {
  const { user, loading: userLoading } = useUser();
  const { projects, setProjects, loading: projectsLoading, error, refetch } = useProjectCards(user?.idRolGlobal , user?.id, userLoading);
  const loading = userLoading || projectsLoading;
  const [search, setSearch]         = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('TodosLosProyectos');
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [creationSuccessMessage, setCreationSuccessMessage] = useState<string | null>(null);
  const { recentIds, trackVisit } = useRecentProjects(user?.id);
  const navigate = useNavigate();

  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  useEffect(() => {
    if (activeFilter !== 'Archivados' || !user || user.idRolGlobal == null) return;

    const fetchArchived = async () => {
      setArchivedLoading(true);
      try {
        const data = await getArchivedProjects(user.idRolGlobal!, user.id);
        setArchivedProjects(data);
      } catch (err) {
        console.error('[Archivados] error al obtener:', err);
      } finally {
        setArchivedLoading(false);
      }
    };

    void fetchArchived();
  }, [activeFilter, user]);

  const STATUS_OPTIONS: { id: number; label: string }[] = [
    { id: 1, label: 'Completado' },
    { id: 2, label: 'En Progreso' },
    { id: 3, label: 'Retrasado' },
    { id: 4, label: 'Sin Asignar' },
  ];

  const buildMenuItems = (project: Project): MenuComponent[] => [
    {
      text: 'Abrir',
      onClick: () => navigate(`/proyectos/${project.id}/backlog`),
    },
    {
      text: 'Editar Proyecto',
      onClick: () => setEditingProjectId(project.id),
    },
    ...(project.id_estatus !== 5 ? [{
      text: 'Cambiar Estatus',
      onClick: () => {},
      subMenu: STATUS_OPTIONS
        .filter((s) => s.id !== project.id_estatus)
        .map((s) => ({
          text: s.label,
          statusId: s.id,
          onClick: async () => {
            await changeProjectStatus(project.id, user!.id, s.id);
            setProjects((prev) =>
              prev.map((p) => p.id === project.id ? { ...p, id_estatus: s.id } : p)
            );
          },
        })),
    }] : []),
    project.id_estatus !== 5
      ? {
          text: 'Archivar Proyecto',
          onClick: async () => {
            try {
              await archiveProject(project.id, user!.id);
              setProjects((prev) => prev.filter((p) => p.id !== project.id));
              setArchivedProjects((prev) => [...prev, { ...project, id_estatus: 5 }]);
            } catch (err) {
              console.error('[Archivar] error:', err);
            }
          },
        }
      : {
          text: 'Desarchivar Proyecto',
          onClick: async () => {
            try {
              await unarchiveProject(project.id, user!.id);
              setArchivedProjects((prev) => prev.filter((p) => p.id !== project.id));
              setProjects((prev) => [...prev, { ...project, id_estatus: 4 }]);
            } catch (err) {
              console.error('[Desarchivar] error:', err);
            }
          },
        },
  ];

  const renderCard = (project: Project) => (
  <ProjectCard
    key={project.id}
    projectId={project.id}
    projectName={project.nombre}
    projectStatus={project.id_estatus}
    projectStack={project.stack_tecnologico ?? []}
    completition={project.completion_percentage ?? 0}
    projectDescription={project.descripcion}
    projectDueDate={project.fecha_final}
    projectFTE={project.fte}
    statusLabel={<StatusLabel statusId={project.id_estatus} />}
    onClick={() => {
      trackVisit(project.id);
      navigate(`/proyectos/${project.id}/backlog`);
    }}
    menuItems={buildMenuItems(project)}
  />
);

  const filteredProjects = useMemo(() => {
    const statusId = FILTER_TO_STATUS_ID[activeFilter];

    return projects
      .filter((project) => statusId === undefined || project.id_estatus === statusId)
      .filter((project) =>
        project.nombre.toLowerCase().includes(search.toLowerCase()),
      );
  }, [projects, search, activeFilter]);

  const recentProjects = useMemo( () => {
    return recentIds.map( (id) => projects.find((p) => p.id === id))
             .filter((p): p is Project => p !== undefined);

  }, [projects, recentIds]);

  const isSearching = search.trim().length > 0;
  const isFiltering = activeFilter !== 'TodosLosProyectos';

  if (error) {
    console.log(error);
    return (
      <EmptyState
        title="Error obteniendo los proyectos"
        subtitle="Verifica tu conexión e intenta de nuevo."
      />
    );
  }
  return (
    <>
      <div className={styles.container}>
        <section className={styles.header}>
          <div>
            <h1 className={styles.title}>Proyectos</h1>
            <p className={styles.description}>Administra y consulta todos tus proyectos.</p>
          </div>
          <TabNav<FilterKey>
            activeValue={activeFilter}
            onChange={setActiveFilter}
            items={(Object.keys(FILTER_LABELS) as FilterKey[]).map(k => ({ value: k, label: FILTER_LABELS[k] }))}
          />
        </section>

        <div className={styles.toolbar}>
          <div className={styles.search}>
            <SearchBarComponent
              infoText="Buscar proyectos"
              onChange={setSearch}
            />
          </div>
          <ButtonComponent label="Crear proyecto" icon={<PlusIcon width={16} height={16} />} onClick={() => setIsCreateProjectOpen(true)} />
        </div>

        {activeFilter === 'Archivados' ? (
          archivedLoading ? (
            <div className={styles.grid}>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : archivedProjects.length === 0 ? (
            <EmptyState
              title="No hay proyectos archivados"
              subtitle="Los proyectos archivados aparecerán aquí."
            />
          ) : (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Proyectos archivados</h2>
              <div className={styles.grid}>{archivedProjects.map(renderCard)}</div>
            </section>
          )
        ) : loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            title="No hay proyectos disponibles"
            subtitle="No tienes proyectos asignados o aún no se han creado."
          />
        ) : isSearching || isFiltering ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Resultados</h2>
            <div className={styles.grid}>{filteredProjects.map(renderCard)}</div>
          </section>
        ) : (
          <>
            {recentProjects.length !== 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Proyectos recientes</h2>
                <div className={styles.grid}>
                  {recentProjects.map(p => (
                    <ProjectCard
                      key={p.id}
                      projectId={p.id}
                      projectName={p.nombre}
                      projectStatus={p.id_estatus}
                      projectStack={p.stack_tecnologico ?? []}
                      completition={p.completion_percentage ?? 0}
                      projectDescription={p.descripcion}
                      projectDueDate={p.fecha_final}
                      projectFTE={p.fte}
                      statusLabel={<StatusLabel statusId={p.id_estatus} />}
                      forceExpanded
                      onClick={() => {
                        trackVisit(p.id);
                        navigate(`/proyectos/${p.id}/backlog`);
                      }}
                      menuItems={buildMenuItems(p)}
                    />
                  ))}
                </div>
            </section>
        )}
            <div className={styles.divider} />

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Todos los proyectos</h2>
              <div className={styles.grid}>{projects.map(renderCard)}</div>
            </section>
          </>
        )}
      </div>
      {user ? (
        <CreateProject
          isOpen={isCreateProjectOpen || editingProjectId !== null}
          isCreate={editingProjectId === null}
          projectId={editingProjectId ?? undefined}
          onClose={() => {
            setIsCreateProjectOpen(false);
            setEditingProjectId(null);
          }}
          userId={user.id}
          onCreated={async (message) => {
            setCreationSuccessMessage(message);
            setIsCreateProjectOpen(false);
            setEditingProjectId(null);
            await refetch();
          }}
        />
      ) : null}
      {creationSuccessMessage ? (
        <ProjectCreationToast
          message={creationSuccessMessage}
          onClose={() => setCreationSuccessMessage(null)}
          autoCloseMs={3500}
        />
      ) : null}
    </>
  );
};

export default ProjectsPage;
