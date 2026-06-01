import React, { useMemo, useState } from 'react';
import './Store.css';
import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';

import { AvatarLootBox } from '../../profile/components/AvatarLootBox';
import { useUserAvatar } from '../../profile/hooks/useUserAvatar';
import { useAvatarCatalog } from '../../profile/hooks/useAvatarCatalog';
import {
  fetchCatalog,
  fetchUserActiveAvatar,
  makeDefaultVisibleFeatures,
} from '../../profile/services/avatar.service';
import type { DynamicFeatures, ElementoInventarioAvatar } from '../../profile/types/avatar.types';
import { CircleStackIcon } from '@heroicons/react/24/outline';

import { useUser } from '@/core/auth/userContext';

// ── Chest icons per style + feature ───────────────────────────────────────
import pixelGeneral     from '../resources/Pixel_General.png';
import pixelAccesories  from '../resources/Pixel_Accesories.png';
import pixelBeard       from '../resources/Pixel_Beard.png';
import pixelClothing    from '../resources/Pixel_Clothing.png';
import pixelEyes        from '../resources/Pixel_Eyes.png';
import pixelGlasses     from '../resources/Pixel_Glasses.png';
import pixelHair        from '../resources/Pixel_Hair.png';
import pixelHat         from '../resources/Pixel_Hat.png';
import pixelMouth       from '../resources/Pixel_Mouth.png';
import pixelSkin        from '../resources/Pixel_Skin_Colour.png';

import notionistGeneral        from '../resources/Notionist_General.png';
import notionistBackground     from '../resources/Notionist_Background.png';
import notionistBeard          from '../resources/Notionist_Beard.png';
import notionistClothes        from '../resources/Notionist_Clothes.png';
import notionistClothesGraphic from '../resources/Notionist_Clothes_Graphic.png';
import notionistEyebrows       from '../resources/Notionist_Eyebrows.png';
import notionistEyes           from '../resources/Notionist_Eyes.png';
import notionistGesture        from '../resources/Notionist_Gesture.png';
import notionistGlasses        from '../resources/Notionist_Glasses.png';
import notionistHair           from '../resources/Notionist_Hair.png';
import notionistHead           from '../resources/Notionist_Head.png';
import notionistMouth          from '../resources/Notionist_Mouth.png';
import notionistNose           from '../resources/Notionist_Nose.png';

import miniavsGeneral  from '../resources/Miniavs_General.png';
import miniavsBlush    from '../resources/Miniavs_Blush.png';
import miniavsBody     from '../resources/Miniavs_Body.png';
import miniavsEyes     from '../resources/Miniavs_Eyes.png';
import miniavsHair     from '../resources/Miniavs_Hair.png';
import miniavsHead     from '../resources/Miniavs_Head.png';
import miniavsMouth    from '../resources/Miniavs_Mouth.png';
import miniavsMustache from '../resources/Miniavs_Mustache.png';

// Per-style image lookup: [styleName][featureKey] → png url.
// 'general' is the per-style fallback used by the general chest and any
// feature that doesn't have its own dedicated icon.
const CHEST_IMAGES: Record<string, Record<string, string>> = {
  pixelArt: {
    general:     pixelGeneral,
    accessories: pixelAccesories,
    beard:       pixelBeard,
    clothing:    pixelClothing,
    eyes:        pixelEyes,
    glasses:     pixelGlasses,
    hair:        pixelHair,
    hat:         pixelHat,
    mouth:       pixelMouth,
    skinColor:   pixelSkin,
  },
  notionist: {
    general:         notionistGeneral,
    backgroundColor: notionistBackground,
    beard:           notionistBeard,
    clothing:        notionistClothes,
    clothingGraphic: notionistClothesGraphic,
    eyebrows:        notionistEyebrows,
    eyes:            notionistEyes,
    gesture:         notionistGesture,
    glasses:         notionistGlasses,
    hair:            notionistHair,
    head:            notionistHead,
    mouth:           notionistMouth,
    nose:            notionistNose,
  },
  miniavs: {
    general:  miniavsGeneral,
    blush:    miniavsBlush,
    body:     miniavsBody,
    eyes:     miniavsEyes,
    hair:     miniavsHair,
    head:     miniavsHead,
    mouth:    miniavsMouth,
    mustache: miniavsMustache,
  },
};

function pickChestImage(styleName: string, featureKey: string): string {
  return CHEST_IMAGES[styleName]?.[featureKey]
      ?? CHEST_IMAGES[styleName]?.general
      ?? pixelGeneral;
}

// Snapshot handed to AvatarLootBox — built atomically in the click handler.
interface LootboxSession {
  styleId:      number;
  styleName:    string;
  baseFeatures: DynamicFeatures;
  unownedItems: ElementoInventarioAvatar[];
}

// A chest tile shown in the store grid.
interface Chest {
  id:           string;
  title:        string;
  description:  string;
  costo:        number;
  image:        string;
  attributoIds: number[] | null; // null = all attributes of the style (general chest)
}

interface ShopPageProps {
  styleId?:        number;
  onStyleChange?:  (styleId: number) => void;
}

const ShopPage: React.FC<ShopPageProps> = ({ styleId, onStyleChange }) => {
  const { user } = useUser();
  const activeStyleId = styleId ?? 1;

  const { catalog, allElements, atributos, styles } = useAvatarCatalog(activeStyleId);
  const { unownedItems, addRandomItem, addingItem } = useUserAvatar(
    user?.id ?? 0,
    catalog,
    allElements,
    atributos,
  );

  const [session, setSession] = useState<LootboxSession | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Build chests dynamically for the currently-selected style ────────────────
  // 1. General chest: random across every attribute of the style
  // 2. One focused chest per feature in the catalog (hair, eyes, mouth, …)
  const chests: Chest[] = useMemo(() => {
    if (!catalog) return [];
    const styleName = catalog.styleName;

    const result: Chest[] = [
      {
        id:           `general-${activeStyleId}`,
        title:        `Cofre ${styleName}`,
        description:  `Una colección variada de elementos de ${styleName}.`,
        costo:        40,
        image:        pickChestImage(styleName, 'general'),
        attributoIds: null,
      },
    ];

    for (const feature of catalog.features) {
      const variantAttr = atributos.find(
        a => a.nombre === feature.key && a.id_avatar_style === activeStyleId,
      );
      const colorAttr = feature.colorProp
        ? atributos.find(a => a.nombre === feature.colorProp && a.id_avatar_style === activeStyleId)
        : undefined;

      const ids: number[] = [];
      if (variantAttr) ids.push(variantAttr.id);
      if (colorAttr)   ids.push(colorAttr.id);
      if (ids.length === 0) continue;

      result.push({
        id:           `${activeStyleId}-${feature.key}`,
        title:        `Cofre de ${feature.label}`,
        description:  `Solo elementos de ${feature.label.toLowerCase()}.`,
        costo:        10,
        image:        pickChestImage(styleName, feature.key),
        attributoIds: ids,
      });
    }

    return result;
  }, [catalog, atributos, activeStyleId]);

  // ── Open a chest ─────────────────────────────────────────────────────────────
  const openChest = async (chest: Chest) => {
    const userId = user?.id;
    if (!userId || !atributos.length || !allElements.length || !catalog) return;
    if (loading) return;

    setLoading(true);
    try {
      const styleAttrIds = new Set(
        atributos.filter(a => a.id_avatar_style === activeStyleId).map(a => a.id),
      );

      const items = unownedItems.filter(it => {
        if (!styleAttrIds.has(it.id_atributo_avatar)) return false;
        if (chest.attributoIds && !chest.attributoIds.includes(it.id_atributo_avatar)) return false;
        return true;
      });

      const saved = await fetchUserActiveAvatar(userId, allElements, atributos, activeStyleId);
      let baseFeatures: DynamicFeatures;
      if (saved) {
        baseFeatures = saved.features;
      } else {
        const { catalog: styleCatalog } = await fetchCatalog(activeStyleId);
        baseFeatures = makeDefaultVisibleFeatures(styleCatalog);
      }

      setSession({
        styleId:      activeStyleId,
        styleName:    catalog.styleName,
        baseFeatures,
        unownedItems: items,
      });
    } finally {
      setLoading(false);
    }
  };

  const closeLootbox = () => setSession(null);

  return (
    <>
      {session && (
        <div
          className="lootbox-overlay"
          onClick={e => {
            if (e.target === e.currentTarget) closeLootbox();
          }}
        >
          <div className="lootbox-modal">
            <AvatarLootBox
              key={`lootbox-${session.styleId}-${session.unownedItems.length}`}
              unownedItems={session.unownedItems}
              atributos={atributos}
              baseFeatures={session.baseFeatures}
              styleName={session.styleName}
              onOpen={addRandomItem}
              onClose={closeLootbox}
              disabled={addingItem}
            />
          </div>
        </div>
      )}

      <div className="shop-page">
        <div className="shop-section">
          <div className="shop-header">
            <h1 className="shop-title">Tienda</h1>
            <div className="shop-coins">
              <span>Monedas: 20</span>
              <CircleStackIcon className="shop-coins-icon" />
            </div>
          </div>

          {styles.length > 1 && onStyleChange && (
            <div className="shop-style-nav">
              {styles.map(s => (
                <button
                  key={s.id}
                  className={`shop-style-nav__btn${activeStyleId === s.id ? ' shop-style-nav__btn--active' : ''}`}
                  onClick={() => onStyleChange(s.id)}
                >
                  {s.nombre}
                </button>
              ))}
            </div>
          )}

          <div className="shop-content">
            <div className="shop-horizontal-scroll">
              {chests.map(chest => (
                <div key={chest.id} className="shop-item">
                  <div className="shop-item-image">
                    <img
                      src={chest.image}
                      alt={chest.title}
                      style={{ height: '90px', transform: 'translateY(-0.7rem)' }}
                    />
                  </div>

                  <div className="shop-item-info">
                    <h3>{chest.title}</h3>
                    <p>{chest.description}</p>

                    <ButtonComponent
                      label={
                        <div className="shopButtonLabel">
                          <span>{loading ? 'Cargando…' : 'Comprar'}</span>
                          <span className="shopButtonPrice">
                            {chest.costo}
                            <CircleStackIcon />
                          </span>
                        </div>
                      }
                      onClick={() => openChest(chest)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShopPage;
