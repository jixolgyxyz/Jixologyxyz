import { useState } from 'react';
import { CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { ProjectUserOption } from '../../types/create.project.types';
import styles from './PmInvitePicker.module.css';

type Props = {
  users: ProjectUserOption[];
  selectedIds: number[];
  /** Usuario a ocultar de la lista (normalmente el creador del proyecto). */
  excludeUserId?: number;
  disabled?: boolean;
  onToggle: (userId: number) => void;
};

/** Selector múltiple de usuarios para invitar como PM al crear un proyecto. */
export default function PmInvitePicker({
  users,
  selectedIds,
  excludeUserId,
  disabled,
  onToggle,
}: Props) {
  const [search, setSearch] = useState('');

  const candidates = users.filter((user) => user.id !== excludeUserId);
  const query = search.trim().toLowerCase();
  const filtered = query
    ? candidates.filter((user) => {
        const name = [user.nombre, user.apellido].filter(Boolean).join(' ').toLowerCase();
        return name.includes(query) || user.email.toLowerCase().includes(query);
      })
    : candidates;

  const selected = new Set(selectedIds);

  return (
    <div className={styles.picker}>
      <div className={styles.searchWrapper}>
        <MagnifyingGlassIcon className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar usuario por nombre o correo..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={disabled}
        />
      </div>

      <p className={styles.count}>
        {selectedIds.length === 0
          ? 'Ningún usuario seleccionado.'
          : `${selectedIds.length} usuario${selectedIds.length === 1 ? '' : 's'} se agregará${
              selectedIds.length === 1 ? '' : 'n'
            } como PM.`}
      </p>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>No se encontraron usuarios.</p>
        ) : (
          filtered.map((user) => {
            const isSelected = selected.has(user.id);
            const fullName = [user.nombre, user.apellido].filter(Boolean).join(' ');

            return (
              <button
                type="button"
                key={user.id}
                className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
                onClick={() => onToggle(user.id)}
                disabled={disabled}
                aria-pressed={isSelected}
              >
                <span className={styles.checkbox}>
                  {isSelected ? <CheckIcon width={13} height={13} /> : null}
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{fullName || user.email}</span>
                  {fullName ? <span className={styles.email}>{user.email}</span> : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
