import React from 'react';
import { XCircleIcon } from '@heroicons/react/24/outline';

import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';
import InventoryCard from '../InventoryCard';
import SkeletonAvatarTile from '../SkeletonAvatarTile';
import type { AvatarStyle, FeatureMeta } from '../../types/avatar.types';

const SKELETON_TILE_COUNT = 10;

interface AvatarInventorySectionProps {
  showInventory: boolean;
  filteredCatalog: React.ComponentProps<typeof InventoryCard>['catalog'] | null;
  features: React.ComponentProps<typeof InventoryCard>['features'];

  onSelectVariant: (
    meta: FeatureMeta,
    value: string | null
  ) => void;
  
  onSelectColor: (
    meta: FeatureMeta,
    colorValue: string
  ) => void;
  
  onSelectType: (
    meta: FeatureMeta,
    typeValue: string
  ) => void;

  avatarSaving: boolean;
  handleSaveAvatar: () => void;

  canEditAvatar: boolean;
  addingItem: boolean;

  onClose?: () => void;

  styles?:          AvatarStyle[];
  selectedStyleId?: number;
  onStyleChange?:   (styleId: number) => void;
}

const AvatarInventorySection: React.FC<AvatarInventorySectionProps> = ({
  showInventory,
  filteredCatalog,
  features,
  onSelectVariant,
  onSelectColor,
  onSelectType,
  avatarSaving,
  handleSaveAvatar,
  canEditAvatar,
  addingItem,
  onClose,
  styles,
  selectedStyleId,
  onStyleChange,
}) => {
  return (
    <div className="profile-section profile-section--inventory">
      <div className="inventory-header">
        <span className="section-tab">Cosméticos</span>
        {onClose && (
          <button
            type="button"
            className="inventory-close"
            onClick={onClose}
            aria-label="Cerrar inventario"
          >
            <XCircleIcon width={26} height={26} />
          </button>
        )}
      </div>

      {styles && styles.length > 1 && onStyleChange && (
        <div className="inventory-style-nav">
          {styles.map(s => (
            <button
              key={s.id}
              type="button"
              className={`inventory-style-nav__btn${selectedStyleId === s.id ? ' inventory-style-nav__btn--active' : ''}`}
              onClick={() => onStyleChange(s.id)}
            >
              {s.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="section-body section-body--flush">
        {showInventory && filteredCatalog ?(
          <InventoryCard
            catalog={filteredCatalog}
            features={features}
            onSelectVariant={onSelectVariant}
            onSelectColor={onSelectColor}
            onSelectType={onSelectType}
          />
        ) : (
          <div className="inv-card">
            <div className="inv-grid">
              {Array.from({ length: SKELETON_TILE_COUNT }).map((_, i) => (
                <SkeletonAvatarTile key={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="section-footer">
        <ButtonComponent
          label={avatarSaving ? 'Guardando…' : 'Guardar avatar'}
          onClick={handleSaveAvatar}
          disabled={
            !canEditAvatar ||
            !showInventory ||
            avatarSaving ||
            addingItem
          }
        />
      </div>
    </div>
  );
};

export default AvatarInventorySection;