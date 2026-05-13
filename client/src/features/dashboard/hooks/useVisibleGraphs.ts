import { useMemo } from 'react';
import { useUser } from '@/core/auth/userContext';
import { GRAPH_CATALOG, type GraphDescriptor, type DashboardKind } from '../config/graphCatalog';
import { useDashboardPreferences } from './useDashboardPreferences';
import { usePmProjects } from './usePmProjects';

export interface VisibleGraphsResult {
  /** Graphs the user CAN see on this dashboard, regardless of their toggle. Drives the panel list. */
  available: GraphDescriptor[];
  /** Graphs to actually render right now (available ∩ user's visibility preference). */
  visible: GraphDescriptor[];
  /** Project IDs the current user is PM on (empty set for global admins or non-PMs). */
  pmProjectIds: Set<number>;
  /** True while either prefs or PM lookup is in flight. */
  loading: boolean;
  /** Forwarded toggle from useDashboardPreferences. */
  toggle: (graphId: string) => Promise<void>;
  /** Helper for the panel: is this graph currently visible per the user's prefs? */
  isVisible: (graphId: string) => boolean;
}

export function useVisibleGraphs(dashboard: DashboardKind): VisibleGraphsResult {
  const { user } = useUser();
  const { isVisible, toggle, loading: prefsLoading } = useDashboardPreferences();
  const { projectIds: pmProjectIds, loading: pmLoading } = usePmProjects();

  const isGlobalAdmin = user?.idRolGlobal === 1 || user?.idRolGlobal === 2;
  const isPm          = pmProjectIds.size > 0;

  const available = useMemo<GraphDescriptor[]>(() => {
    return GRAPH_CATALOG.filter(g => {
      if (!g.dashboards.includes(dashboard)) {
        // On the user dashboard we also surface pm-extended graphs even if
        // they're catalogued as admin-only graphs.
        if (dashboard === 'user' && g.visibility === 'pm-extended' && isPm) {
          // fall through
        } else {
          return false;
        }
      }

      switch (g.visibility) {
        case 'admin-only':
          return isGlobalAdmin;
        case 'user-only':
          return dashboard === 'user';
        case 'shared':
          return true;
        case 'pm-extended':
          // On the admin dashboard: global admins see these.
          // On the user dashboard: PMs see these scoped to their projects.
          if (dashboard === 'admin') return isGlobalAdmin;
          return isPm;
      }
    });
  }, [dashboard, isGlobalAdmin, isPm]);

  const visible = useMemo(
    () => available.filter(g => isVisible(g.id)),
    [available, isVisible],
  );

  return {
    available,
    visible,
    pmProjectIds,
    loading: prefsLoading || pmLoading,
    toggle,
    isVisible,
  };
}
