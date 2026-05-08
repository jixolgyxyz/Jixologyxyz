import React from 'react';
import SearchBarComponent from '@/shared/components/SearchBarComponent';
import styles from './FilterBar.module.css';

export interface FilterOption {
  id: string | number;
  label: string;
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchHeight?: string;
  searchFontSize?: string;
  onSearchChange: (value: string) => void;
  filters: FilterOption[];
  activeFilter: string | number | null;
  onFilterChange: (id: string | number | null) => void;
  allLabel?: string;
  children?: React.ReactNode;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = 'Buscar...',
  searchHeight,
  searchFontSize,
  onSearchChange,
  filters,
  activeFilter,
  onFilterChange,
  allLabel = 'Todos',
  children,
}) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div className={styles.searchWrapper}>
          <SearchBarComponent
            infoText={searchPlaceholder}
            onChange={onSearchChange}
            height={searchHeight}
            fontSize={searchFontSize}
          />
        </div>

        {children && <div className={styles.actions}>{children}</div>}
      </div>

      {filters.length > 0 && (
        <div className={styles.filterPills}>
          <button
            type="button"
            className={`${styles.pill} ${activeFilter === null ? styles.pillActive : ''}`}
            onClick={() => onFilterChange(null)}
          >
            {allLabel}
          </button>

          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.pill} ${activeFilter === f.id ? styles.pillActive : ''}`}
              onClick={() => onFilterChange(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterBar;