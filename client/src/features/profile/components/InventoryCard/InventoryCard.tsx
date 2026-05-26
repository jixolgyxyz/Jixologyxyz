import React, { useMemo, useState, useEffect } from 'react';
import { PaintBrushIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';

import AvatarTile from '../AvatarTile';
import ColorSwatch from '../ColorSwatch';
import SkeletonAvatarTile from '../SkeletonAvatarTile';
import { TYPE_LABELS, makeVariantTileSvg, makeColorTileSvg } from '../../services/avatar.service';
import type { AvatarCatalog, DynamicFeatures, FeatureMeta } from '../../types/avatar.types';

export interface InventoryCardProps {
  catalog:         AvatarCatalog;
  features:        DynamicFeatures;
  onSelectVariant: (meta: FeatureMeta, value: string | null) => void;
  onSelectColor:   (meta: FeatureMeta, colorValue: string) => void;
  onSelectType:    (meta: FeatureMeta, typeValue: string) => void;
}

const InventoryCard: React.FC<InventoryCardProps> = ({
  catalog,
  features,
  onSelectVariant,
  onSelectColor,
  onSelectType,
}) => {
  const [activeKey,    setActiveKey]    = useState<string>(
    catalog.features.find(f => f.key === 'hair')?.key ?? catalog.features[0]?.key ?? ''
  );
  const [showingColor, setShowingColor] = useState(false);

  useEffect(() => {
    setActiveKey(catalog.features[0]?.key ?? '');
  }, [JSON.stringify(catalog)]);

  // May be undefined when catalog.features is empty
  const activeTab = useMemo(
    () => catalog.features.find(f => f.key === activeKey) ?? catalog.features[0] ?? null,
    [catalog, activeKey],
  );

  // All derived values guard against null activeTab so hooks stay unconditional
  const hasColor       = activeTab ? !activeTab.colorOnly && !!activeTab.colorProp : false;
  const isNoneSelected = activeTab?.probProp
    ? ((features[activeTab.probProp] as number) ?? 100) === 0
    : false;

  const variantTiles = useMemo(() => {
    if (!activeTab) return [];
    const tiles: { value: string | null; label: string; svg: string; selected: boolean }[] = [];

    if (activeTab.probProp) {
      tiles.push({
        value:    null,
        label:    'None',
        svg:      makeVariantTileSvg(features, activeTab, null),
        selected: isNoneSelected,
      });
    }

    for (const value of activeTab.variants) {
      tiles.push({
        value,
        label:    activeTab.variantLabels[value] ?? value,
        svg:      makeVariantTileSvg(features, activeTab, value),
        selected: !isNoneSelected && (features[activeTab.key] as string[])?.[0] === value,
      });
    }
    return tiles;
  }, [activeTab, features, isNoneSelected]);

  const colorTiles = useMemo(() => {
    if (!activeTab?.colorProp) return [];
    const selectedColors = (features[activeTab.colorProp] as string[]) ?? [];
    return activeTab.colorOptions.map((c) => ({
      hex:      c,
      svg:      makeColorTileSvg(features, activeTab, c),
      selected: selectedColors.includes(c),
    }));
  }, [activeTab, features]);

  // All hooks are above — safe to early-return now
  if (!activeTab) {
    return (
      <div className="inv-card">
        <div className="inv-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonAvatarTile key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="inv-card">
      <nav className="inv-tabs">
        {catalog.features.map((meta) => (
          <button
            key={meta.key}
            className={`inv-tab ${activeTab.key === meta.key ? 'inv-tab--active' : ''}`}
            onClick={() => { setActiveKey(meta.key); setShowingColor(false); }}
          >
            {meta.label}
          </button>
        ))}

        {hasColor && (
          <div style={{ marginLeft: 'auto' }}>
            <ButtonComponent
              label={showingColor ? 'Variants' : 'Colors'}
              icon={showingColor ? <Squares2X2Icon width={15} height={15} /> : <PaintBrushIcon width={15} height={15} />}
              variant={showingColor ? 'primary' : 'secondary'}
              onClick={() => setShowingColor((s) => !s)}
            />
          </div>
        )}
      </nav>

      <div className="inv-grid">
        {activeTab.colorOnly ? (
          <>
            {activeTab.typeProp && (
              <div className="inv-type-toggle">
                {activeTab.typeOptions.map((type) => (
                  <button
                    key={type}
                    className={`inv-type-btn ${
                      (features[activeTab.typeProp!] as string[])?.[0] === type
                        ? 'inv-type-btn--active'
                        : ''
                    }`}
                    onClick={() => onSelectType(activeTab, type)}
                  >
                    {TYPE_LABELS[type] ?? type}
                  </button>
                ))}
              </div>
            )}
            {colorTiles.map(({ hex, svg, selected }) => (
              <div key={hex} className="inv-color-tile">
                <AvatarTile
                  svg={svg}
                  label={`#${hex}`}
                  selected={selected}
                  onClick={() => onSelectColor(activeTab, hex)}
                />
                <ColorSwatch
                  hex={hex}
                  selected={selected}
                  onClick={() => onSelectColor(activeTab, hex)}
                />
              </div>
            ))}
          </>
        ) : !showingColor ? (
          variantTiles.map(({ value, label, svg, selected }) => (
            <AvatarTile
              key={label}
              svg={svg}
              label={label}
              selected={selected}
              onClick={() => onSelectVariant(activeTab, value)}
            />
          ))
        ) : (
          colorTiles.map(({ hex, svg, selected }) => (
            <div key={hex} className="inv-color-tile">
              <AvatarTile
                svg={svg}
                label={`#${hex}`}
                selected={selected}
                onClick={() => onSelectColor(activeTab, hex)}
              />
              <ColorSwatch
                hex={hex}
                selected={selected}
                onClick={() => onSelectColor(activeTab, hex)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InventoryCard;
