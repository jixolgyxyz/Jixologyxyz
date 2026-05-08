import { useState } from 'react';

const MAX = 4;

export function useRecentProjects(userId: number | undefined) {
  const key = `recent_projects_${userId}`;

  const [recentIds, setRecentIds] = useState<number[]>(() => {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored) as number[];
  });

  function trackVisit(projectId: number) {
    const filtered = recentIds.filter(id => id !== projectId);
    const updated = [projectId, ...filtered].slice(0, MAX);
    localStorage.setItem(key, JSON.stringify(updated));
    setRecentIds(updated);
  }

  return { recentIds, trackVisit };
}