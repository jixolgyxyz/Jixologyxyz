import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PlusIcon, UserPlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';
import FormPopUp from '@/shared/components/FormPopUp';
import ListUserCard from '@/shared/components/ListUserCard';
import type { Role } from '@/shared/components/ListUserCard';
import MessagePopUp from '@/shared/components/MessagePopUp';
import { useProjectMembers } from '../hooks/useProjectMembers';
import { useProjectEtiquetas } from '../hooks/useProjectEtiquetas';
import { useProjectFte } from '../hooks/useProjectFte';
import { useToast } from '../hooks/useToast';
import { useUser } from '@/core/auth/userContext';
import { deleteEtiquetaWithCascade, upsertProyectoFte, fetchGithubConfig, buildGithubInstallUrl, type GithubConfigRecord } from '../services/projectConfig.service';
import InviteUserForm from '../components/InviteUserForm';
import CreateEtiquetaForm from '../components/CreateEtiquetaForm';
import EditEtiquetaForm from '../components/EditEtiquetaForm';
import UserEtiquetasPanel from '../components/UserEtiquetasPanel';
import { MemberHoverCard } from '../components/MemberHoverCard';
import type { EtiquetaPersonalizadaRecord, FteMemberRecord } from '../types/projectConfig.types';
import styles from './ProjectConfigPage.module.css';

const ProjectConfigPage: React.FC = () => {
  const { id } = useParams();
  const PROJECT_ID = Number(id);
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const { members, memberEtiquetas, memberEtiquetasPred, loading: membersLoading, refresh: refreshMembers } = useProjectMembers(PROJECT_ID);
  const { etiquetas, etiquetasPredeterminadas, loading: etiquetasLoading, refresh: refreshEtiquetas } = useProjectEtiquetas(PROJECT_ID);
  const { fteData, loading: fteLoading, refresh: refreshFte } = useProjectFte(PROJECT_ID);
  const { toast, showError, clearToast } = useToast();

  // SAdmins (1) and Admins (2) can always invite; PMs in this project can too
  const canInvite = (() => {
    if (user?.idRolGlobal === 1 || user?.idRolGlobal === 2) return true;
    const pmEntry = etiquetasPredeterminadas.find(e => e.nombre === 'PM');
    if (!pmEntry) return false;
    return memberEtiquetasPred.some(
      me => me.id_usuario === user?.id && me.id_etiqueta_proyecto_predeterminada === pmEntry.id
    );
  })();

  // ── GitHub integration ────────────────────────────────────────────
  const [githubConfig, setGithubConfig] = useState<GithubConfigRecord | null>(null);
  const [githubOrg, setGithubOrg]       = useState('');
  const [githubRepo, setGithubRepo]     = useState('');
  const [githubLoading, setGithubLoading] = useState(true);

  useEffect(() => {
    fetchGithubConfig(PROJECT_ID)
      .then(setGithubConfig)
      .catch(() => setGithubConfig(null))
      .finally(() => setGithubLoading(false));
  }, [PROJECT_ID]);

  useEffect(() => {
    if (searchParams.get('github') === 'connected') {
      setSearchParams({}, { replace: true });
      fetchGithubConfig(PROJECT_ID).then(setGithubConfig).catch(() => null);
    }
  }, [searchParams, setSearchParams, PROJECT_ID]);

  const handleGithubConnect = () => {
    if (!githubOrg.trim() || !githubRepo.trim()) return;
    window.location.href = buildGithubInstallUrl(PROJECT_ID, githubOrg.trim(), githubRepo.trim());
  };

  // ── Modal visibility ──────────────────────────────────────────────
  const [showInviteForm, setShowInviteForm]         = useState(false);
  const [showCreateEtiqueta, setShowCreateEtiqueta] = useState(false);
  const [editingEtiqueta, setEditingEtiqueta]       = useState<EtiquetaPersonalizadaRecord | null>(null);
  const [deletingEtiqueta, setDeletingEtiqueta]     = useState<EtiquetaPersonalizadaRecord | null>(null);
  const [etiquetasPanel, setEtiquetasPanel] = useState<{
    userId: number;
    userName: string;
    position: { x: number; y: number };
  } | null>(null);

  // ── Jornada local state ───────────────────────────────────────────
  const [localHours, setLocalHours] = useState<Record<number, string>>({});
  const [savingRows, setSavingRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (fteData.length === 0) return;
    setLocalHours(prev => {
      const next: Record<number, string> = {};
      for (const m of fteData) {
        next[m.id] = prev[m.id] !== undefined
          ? prev[m.id]
          : m.cantidad_horas !== null ? String(m.cantidad_horas) : '';
      }
      return next;
    });
  }, [fteData]);

  // ── Avatar hover card ─────────────────────────────────────────────
  const [hoveredMember, setHoveredMember] = useState<{
    userId: number; name: string; email: string; roles: Role[]; rect: DOMRect;
  } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startHide   = useCallback(() => { hideTimer.current = setTimeout(() => setHoveredMember(null), 150); }, []);
  const cancelHide  = useCallback(() => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  // ── Helpers ───────────────────────────────────────────────────────
  const rolesForMember = (userId: number): Role[] => {
    const predRoles = memberEtiquetasPred
      .filter(me => me.id_usuario === userId)
      .map(me => etiquetasPredeterminadas.find(e => e.id === me.id_etiqueta_proyecto_predeterminada))
      .filter(<T,>(e: T | undefined): e is T => e !== undefined)
      .map(e => ({ label: e.nombre, color: e.color_bloque, textColor: e.color_letra }));

    const customRoles = memberEtiquetas
      .filter(me => me.id_usuario === userId)
      .map(me => etiquetas.find(e => e.id === me.id_etiqueta_proyecto_personalizada))
      .filter(<T,>(e: T | undefined): e is T => e !== undefined)
      .map(e => ({ label: e.nombre, color: e.color_bloque, textColor: e.color_letra }));

    return [...predRoles, ...customRoles];
  };

  const handleConfirmDelete = async () => {
    if (!deletingEtiqueta) return;
    const target = deletingEtiqueta;
    setDeletingEtiqueta(null);
    try {
      await deleteEtiquetaWithCascade(target.id);
      refreshEtiquetas();
      refreshMembers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleFteBlur = async (member: FteMemberRecord) => {
    if (savingRows.has(member.id)) return;
    const raw = localHours[member.id];
    if (raw === undefined) return;

    let cantidadHoras = raw === '' ? null : parseFloat(raw);
    if (cantidadHoras !== null && isNaN(cantidadHoras)) return;

    if (cantidadHoras !== null && member.max_horas !== null && cantidadHoras > member.max_horas) {
      cantidadHoras = member.max_horas;
      setLocalHours(prev => ({ ...prev, [member.id]: String(member.max_horas) }));
      showError(`Solo hay ${member.max_horas} hrs disponibles para ${[member.nombre, member.apellido].filter(Boolean).join(' ')} en este proyecto.`);
    }

    setSavingRows(prev => new Set(prev).add(member.id));
    try {
      await upsertProyectoFte(member.id, PROJECT_ID, cantidadHoras, member.jornada);
      refreshFte();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingRows(prev => { const next = new Set(prev); next.delete(member.id); return next; });
    }
  };

  const currentFte = (member: FteMemberRecord): number | null => {
    const raw = localHours[member.id];
    const hrs = raw !== undefined ? (raw === '' ? 0 : parseFloat(raw) || 0) : (member.cantidad_horas ?? 0);
    return member.jornada ? Math.round((hrs / member.jornada) * 100) : null;
  };

  return (
    <div className={styles.container}>

      {/* ── LEFT: Miembros ────────────────────────────────────────── */}
      <div className={`${styles.panel} ${styles.panelLeft}`}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Miembros del proyecto</h2>
            <p className={styles.panelSubtitle}>
              {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
            </p>
          </div>
          {canInvite && (
            <ButtonComponent
              label="Invitar usuario"
              icon={<UserPlusIcon width={16} height={16} />}
              onClick={() => setShowInviteForm(true)}
            />
          )}
        </div>

        <div className={styles.panelContent}>
          {membersLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className={styles.skeleton} />)
          ) : members.length === 0 ? (
            <p className={styles.empty}>No hay miembros en este proyecto aún.</p>
          ) : (
            members.map(member => {
              const fullName = [member.nombre, member.apellido].filter(Boolean).join(' ') || member.email;
              const roles = rolesForMember(member.id);
              return (
                <div key={member.id} className={styles.memberRow}>
                  <ListUserCard
                    userId={member.id}
                    fullName={fullName}
                    email={member.email}
                    roles={roles}
                    onEdit={pos => setEtiquetasPanel(prev =>
                      prev?.userId === member.id ? null : { userId: member.id, userName: fullName, position: pos }
                    )}
                    onAvatarEnter={rect => { cancelHide(); setHoveredMember({ userId: member.id, name: fullName, email: member.email, roles, rect }); }}
                    onAvatarLeave={startHide}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── TOP RIGHT: Jornada ────────────────────────────────────── */}
      <div className={`${styles.panel} ${styles.panelTopRight}`}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Jornada por proyecto</h2>
            <p className={styles.panelSubtitle}>Horas asignadas a este proyecto por miembro</p>
          </div>
        </div>

        <div className={styles.panelContent}>
          {fteLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className={styles.skeletonFte} />)
          ) : fteData.length === 0 ? (
            <p className={styles.empty}>No hay miembros para configurar.</p>
          ) : (
            fteData.map(member => {
              const fullName = [member.nombre, member.apellido].filter(Boolean).join(' ') || member.email;
              const ftePercent = currentFte(member);
              return (
                <div key={member.id} className={styles.fteRow}>
                  <span className={styles.fteName}>{fullName}</span>

                  <div className={styles.fteInputGroup}>
                    <input
                      type="number"
                      className={styles.fteInput}
                      min={0}
                      max={member.max_horas ?? undefined}
                      step={0.5}
                      value={localHours[member.id] ?? ''}
                      placeholder="0"
                      onChange={e => {
                        const val = e.target.value;
                        if (member.max_horas !== null && val !== '' && parseFloat(val) > member.max_horas) return;
                        setLocalHours(prev => ({ ...prev, [member.id]: val }));
                      }}
                      onBlur={() => handleFteBlur(member)}
                    />
                    <span className={styles.fteMax}>
                      {member.max_horas !== null
                        ? member.horas_otros > 0
                          ? `/ ${member.max_horas} de ${member.jornada} hrs`
                          : `/ ${member.jornada} hrs`
                        : '/ — hrs'}
                    </span>
                  </div>

                  <div className={styles.fteBadgeWrap}>
                    {ftePercent !== null
                      ? <span className={styles.fteBadge}>{ftePercent}% FTE</span>
                      : <span className={styles.fteNoJornada}>Sin jornada</span>
                    }
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── BOTTOM RIGHT: Etiquetas ───────────────────────────────── */}
      <div className={`${styles.panel} ${styles.panelBottomRight}`}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Etiquetas personalizadas</h2>
            <p className={styles.panelSubtitle}>Haz clic en una etiqueta para editarla</p>
          </div>
          <ButtonComponent
            label="Nueva etiqueta"
            icon={<PlusIcon width={16} height={16} />}
            onClick={() => setShowCreateEtiqueta(true)}
          />
        </div>

        <div className={styles.panelContent}>
          {etiquetasLoading ? (
            <div className={styles.skeletonFte} />
          ) : etiquetas.length === 0 ? (
            <p className={styles.empty}>No hay etiquetas personalizadas. Crea una para empezar.</p>
          ) : (
            <div className={styles.etiquetasGrid}>
              {etiquetas.map(et => (
                <div key={et.id} className={styles.etiquetaCard}>
                  <button type="button" className={styles.etiquetaBadgeBtn} onClick={() => setEditingEtiqueta(et)} title="Editar etiqueta">
                    <span className={styles.etiquetaBadge} style={{ backgroundColor: et.color_bloque, color: et.color_letra }}>
                      {et.nombre}
                    </span>
                    <PencilIcon className={styles.editIcon} />
                  </button>
                  {et.descripcion && <span className={styles.etiquetaDesc}>{et.descripcion}</span>}
                  <button type="button" className={styles.deleteBtn} aria-label={`Eliminar etiqueta ${et.nombre}`} onClick={() => setDeletingEtiqueta(et)}>
                    <TrashIcon className={styles.deleteBtnIcon} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM: GitHub integration ───────────────────────────── */}
      <div className={`${styles.panel} ${styles.panelGithub}`}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Integración con GitHub</h2>
            <p className={styles.panelSubtitle}>Conecta un repositorio para automatizar branches y PRs</p>
          </div>
          {githubConfig && <span className={styles.githubBadge}>Conectado</span>}
        </div>

        <div className={styles.panelContent}>
          {githubLoading ? (
            <div className={styles.skeletonFte} />
          ) : githubConfig ? (
            <div className={styles.githubConnected}>
              <svg className={styles.githubIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <div className={styles.githubConnectedInfo}>
                <span className={styles.githubRepo}>{githubConfig.github_org}/{githubConfig.github_repo}</span>
                <span className={styles.githubInstall}>Installation ID: {githubConfig.installation_id}</span>
              </div>
            </div>
          ) : (
            <div className={styles.githubForm}>
              <div className={styles.githubInputGroup}>
                <label className={styles.githubLabel}>Organización</label>
                <input
                  className={styles.githubInput}
                  type="text"
                  placeholder="mi-organizacion"
                  value={githubOrg}
                  onChange={e => setGithubOrg(e.target.value)}
                />
              </div>
              <div className={styles.githubInputGroup}>
                <label className={styles.githubLabel}>Repositorio</label>
                <input
                  className={styles.githubInput}
                  type="text"
                  placeholder="mi-repositorio"
                  value={githubRepo}
                  onChange={e => setGithubRepo(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={styles.githubConnectBtn}
                disabled={!githubOrg.trim() || !githubRepo.trim()}
                onClick={handleGithubConnect}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Conectar con GitHub
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────── */}
      <InviteUserForm
        projectId={PROJECT_ID}
        invitadorId={user?.id ?? 0}
        isOpen={showInviteForm}
        onClose={() => setShowInviteForm(false)}
        onInvited={refreshMembers}
        onError={showError}
      />

      <CreateEtiquetaForm
        projectId={PROJECT_ID}
        creadorId={user?.id ?? 0}
        isOpen={showCreateEtiqueta}
        onClose={() => setShowCreateEtiqueta(false)}
        onCreated={refreshEtiquetas}
        onError={showError}
      />

      {editingEtiqueta && (
        <EditEtiquetaForm
          etiqueta={editingEtiqueta}
          isOpen
          onClose={() => setEditingEtiqueta(null)}
          onUpdated={() => { refreshEtiquetas(); refreshMembers(); setEditingEtiqueta(null); }}
          onError={showError}
        />
      )}

      {etiquetasPanel && (
        <UserEtiquetasPanel
          userId={etiquetasPanel.userId}
          projectId={PROJECT_ID}
          userName={etiquetasPanel.userName}
          asignadorId={user?.id ?? 0}
          etiquetas={etiquetas}
          memberEtiquetas={memberEtiquetas}
          etiquetasPredeterminadas={etiquetasPredeterminadas}
          memberEtiquetasPred={memberEtiquetasPred}
          position={etiquetasPanel.position}
          onClose={() => setEtiquetasPanel(null)}
          onChanged={refreshMembers}
          onError={showError}
        />
      )}

      <FormPopUp
        eyebrow="Etiquetas personalizadas"
        title="Eliminar etiqueta"
        subtitle={deletingEtiqueta ? `¿Estás seguro de que deseas eliminar "${deletingEtiqueta.nombre}"? Se eliminará de todos los miembros del proyecto y esta acción no se puede deshacer.` : ''}
        isOpen={deletingEtiqueta !== null}
        onClose={() => setDeletingEtiqueta(null)}
      >
        <div className={styles.confirmActions}>
          <button type="button" className={styles.confirmCancelBtn} onClick={() => setDeletingEtiqueta(null)}>
            Cancelar
          </button>
          <button type="button" className={styles.confirmDeleteBtn} onClick={handleConfirmDelete}>
            <TrashIcon width={14} height={14} />
            Eliminar
          </button>
        </div>
      </FormPopUp>

      {toast && (
        <MessagePopUp type="error" title="Ocurrió un error" message={toast} onClose={clearToast} />
      )}

      {hoveredMember && (
        <MemberHoverCard
          userId={hoveredMember.userId}
          name={hoveredMember.name}
          email={hoveredMember.email}
          roles={hoveredMember.roles}
          rect={hoveredMember.rect}
          onMouseEnter={cancelHide}
          onMouseLeave={startHide}
        />
      )}
    </div>
  );
};

export default ProjectConfigPage;
