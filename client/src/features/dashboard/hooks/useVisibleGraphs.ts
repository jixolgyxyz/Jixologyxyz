import { useMemo } from 'react';
import type { Layout } from 'react-grid-layout';
import { useUser } from '@/core/auth/userContext';
import { GRAPH_CATALOG, type GraphDescriptor, type DashboardKind } from '../config/graphCatalog';
import { useDashboardPreferences, type GraphLayoutItem } from './useDashboardPreferences';
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
  /** Returns react-grid-layout Layout items for the given visible graphs. */
  getLayoutItems: (visibleGraphs: GraphDescriptor[], cols?: number) => GraphLayoutItem[];
  /** Persists the layout from an onLayoutChange callback. */
  saveLayout: (layout: Layout[]) => Promise<void>;
}

export function useVisibleGraphs(dashboard: DashboardKind): VisibleGraphsResult {
  const { user } = useUser();
  const { isVisible, toggle, loading: prefsLoading, getLayoutItems, saveLayout } = useDashboardPreferences();
  const { projectIds: pmProjectIds, loading: pmLoading } = usePmProjects();

  const isGlobalAdmin = user?.idRolGlobal === 1 || user?.idRolGlobal === 2;
  const isPm          = pmProjectIds.size > 0;

  const available = useMemo<GraphDescriptor[]>(() => {
    return GRAPH_CATALOG.filter(g => {
      if (!g.dashboards.includes(dashboard)) return false;

      switch (g.visibility) {
        case 'admin-only':
          return isGlobalAdmin;
        case 'user-only':
          return dashboard === 'user';
        case 'shared':
          return true;
        case 'pm-extended':
          if (dashboard === 'admin')   return isGlobalAdmin;
          if (dashboard === 'project') return isPm;
          return false; // pm-extended graphs no longer appear on the user dashboard
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
    getLayoutItems,
    saveLayout,
  };
}
