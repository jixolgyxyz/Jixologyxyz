import React, { useState } from 'react';
import './Store.css';
import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';

//PROFILE HOOKS & COMPONENTS
import { AvatarLootBox } from '../../profile/components/AvatarLootBox';
import { useUserAvatar } from '../../profile/hooks/useUserAvatar';
import { useAvatarCatalog } from '../../profile/hooks/useAvatarCatalog';
import { useAvatarFeatures } from '../../profile/hooks/useAvatarFeatures';

import { useUser } from '@/core/auth/userContext';


import cofreDefault from '../resources/CofreDef.png';

interface PopupState {
  type: MessagePopUpType;
  title: string;
  message: string;
}

const shopItems = [
  {
    id: 1,
    category: 'styles',
    title: 'Cofre Pixel',
    description: 'Objetos relacionados con el estilo artistico "Pixel". ¡Cualquiera dentro de esa categoría!.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 2,
    category: 'styles',
    title: 'Cofre Animado',
    description: 'Objetos relacionados con el estilo artistico "Animado". ¡Cualquiera dentro de esa categoría!.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 3,
    category: 'styles',
    title: 'Cofre Tradicional',
    description: 'Objetos relacionados con el estilo artistico "Tradicional". ¡Cualquiera dentro de esa categoría!.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 4,
    category: 'types',
    title: 'Cofre de Lentes',
    subcategory: 'lentes',
    description: 'Cualquier tipo de gafas. ¡(Te) verás genial con estas!',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 5,
    category: 'types',
    title: 'Cofre de Camisas',
    subcategory: 'camisas',
    description: 'Cualquier camisa. ¡Viste con orgullo tu mejor prenda!',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 6,
    category: 'types',
    title: 'Cofre de Accesorios',
    subcategory: 'accesorios',
    description: 'Cualquier accesorio. ¡Es importante mostrar tu estilo único!',
    image: cofreDefault,
    imageHeight: '200px',
  },
];

const ShopPage: React.FC = () => {
  const { user } = useUser();

  //Lista de estilos y tipos en shopItems
  const styleItems = shopItems.filter(
    (item) => item.category === 'styles'
  );

  const typeItems = shopItems.filter(
    (item) => item.category === 'types'
  );

  //Variables para manejo de Gachas
  const [showLootbox, setShowLootbox] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [lootboxCategory, setLootboxCategory] = useState<string | null>(null); //Pool de Objetos

  //Datos DEL gacha
  const {
    catalog,
    allElements,
    atributos,
  } = useAvatarCatalog();

  //Datos del usuario para el gacha
  const {
    unownedItems,
    filteredCatalog,
    initialFeatures,
    addRandomItem,
    addingItem,
  } = useUserAvatar(user?.id, catalog, allElements, atributos);

  //Datos del Avatar
  const {
      features,
    } = useAvatarFeatures(
      filteredCatalog ?? {
        styleId: 1,
        styleName: '',
        features: [],
        defaultFeatures: {},
      },
      initialFeatures,
    );

  return (<>
    {showLootbox && (
            <div
              className="lootbox-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowLootbox(false);
              }}
            >
              <div className="lootbox-modal">
                <AvatarLootBox
                  unownedItems={unownedItems}
                  atributos={atributos}
                  baseFeatures={features}
                  onOpen={addRandomItem}
                  onClose={() => setShowLootbox(false)}
                  disabled={addingItem}
                />
              </div>
            </div>
          )}
    <div className="shop-page">
      <div className="shop-section">
        <div className="shop-header">
          <h1 className="shop-title">Tienda</h1>
        </div>

        <div className="shop-content">
          <div className="shop-category">
            <h2 className="shop-subtitle">
              Estilos de Avatar
            </h2>

            <div className="shop-grid">
              {styleItems.map((item) => (
                <div
                  key={item.id}
                  className="shop-item"
                >
                  <div className="shop-item-image">
                    <img
                      src={item.image}
                      alt={item.title}
                      style={{
                        width: item.imageWidth,
                        height: item.imageHeight,
                        transform: 'translateY(-0.7rem)',
                      }}
                    />
                  </div>

                  <div className="shop-item-info">
                    <h3>{item.title}</h3>

                    <p>{item.description}</p>

                    <ButtonComponent
                      label="Comprar"
                      onClick={() => { setLootboxCategory("{item.subcategory}"); setShowLootbox(true); setPopup(null); }}
                      />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="shop-category">
            <h2 className="shop-subtitle">
              Elementos Específicos
            </h2>

            <div className="shop-grid-below">
              {typeItems.map((item) => (
                <div
                  key={item.id}
                  className="shop-item"
                >
                  <div className="shop-item-image">
                    <img
                      src={item.image}
                      alt={item.title}
                      style={{
                        width: item.imageWidth,
                        height: item.imageHeight,
                        transform: 'translateY(-0.7rem)',
                      }}
                    />
                  </div>

                  <div className="shop-item-info">
                    <h3>{item.title}</h3>

                    <p>{item.description}</p>

                    <ButtonComponent
                      label="Comprar"
                      onClick={() => { setShowLootbox(true); setPopup(null); }}
                      />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>);
};

export default ShopPage;
