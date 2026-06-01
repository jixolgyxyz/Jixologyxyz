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

import cofreEspecial from '../resources/cofreEspecial.png';

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
                      src={cofreEspecial}
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
