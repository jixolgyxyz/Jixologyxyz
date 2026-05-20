import React from 'react';

import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';
import InventoryCard from '../InventoryCard';
import SkeletonAvatarTile from '../SkeletonAvatarTile';

const SKELETON_TILE_COUNT = 10;

interface AvatarInventorySectionProps {
  showInventory: boolean;
  filteredCatalog: any;
  features: any;

  onSelectVariant: (
    featureKey: string,
    variantIndex: number
  ) => void;

  onSelectColor: (
    featureKey: string,
    color: string
  ) => void;

  onSelectType: (
    featureKey: string,
    type: string
  ) => void;

  avatarSaving: boolean;
  handleSaveAvatar: () => void;

  canEditAvatar: boolean;
  addingItem: boolean;
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
}) => {
  return (
    <div className="profile-section profile-section--inventory">
      <div className="section-tab">Cosméticos</div>

      <div className="section-body section-body--flush">
        {showInventory ? (
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