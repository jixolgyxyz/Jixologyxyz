import { useCallback, useEffect, useState } from 'react';
import { getAdminUsers } from '../services/adminUsers.service';
import type { AdminUserListItem } from '../types/admin.types';

export function useAdminUsers(
  search: string,
  statusFilter: 'active' | 'inactive' | 'all'
) {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getAdminUsers(search, statusFilter);
      setUsers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ocurrió un error al cargar usuarios.'
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadUsers();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadUsers]);

  return {
    users,
    loading,
    error,
    refreshUsers: loadUsers,
  };
}