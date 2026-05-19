import React, { useState } from 'react';
import './Store.css';
import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';

//PROFILE HOOKS & COMPONENTS
import { AvatarLootBox } from '../../profile/components/AvatarLootBox';
import { useUserAvatar } from '../../profile/hooks/useUserAvatar';
import { useAvatarCatalog } from '../../profile/hooks/useAvatarCatalog';
import { useAvatarFeatures } from '../../profile/hooks/useAvatarFeatures';

//MESSAGE
import type { MessagePopUpType } from '../../../shared/components/MessagePopUp';

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
    description: 'Elementos inspirados en un estilo visual retro y minimalista.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 2,
    category: 'styles',
    title: 'Cofre Animado',
    description: 'Diseños expresivos y dinámicos con un acabado moderno y creativo.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 3,
    category: 'styles',
    title: 'Cofre Tradicional',
    description: 'Una colección con un enfoque clásico, limpio y atemporal.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 4,
    category: 'types',
    title: 'Cofre de Accesorios',
    subcategory: [1, 2],
    description: 'Detalles adicionales para darle más personalidad a tu avatar.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 5,
    category: 'types',
    title: 'Cofre de Barbas',
    subcategory: [3],
    description: 'Estilos de barba para complementar distintos tipos de apariencia.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 6,
    category: 'types',
    title: 'Cofre de Ropa',
    subcategory: [4, 5],
    description: 'Prendas y combinaciones para personalizar tu estilo visual.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 7,
    category: 'types',
    title: 'Cofre de Ojos',
    subcategory: [6, 7],
    description: 'Variaciones de ojos y colores para expresar diferentes estilos.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 8,
    category: 'types',
    title: 'Cofre de Gafas',
    subcategory: [8, 9],
    description: 'Una selección de gafas con estilos modernos y clásicos.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 9,
    category: 'types',
    title: 'Cofre de Cabello',
    subcategory: [10, 11],
    description: 'Peinados y colores para crear una apariencia única.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 10,
    category: 'types',
    title: 'Cofre de Sombrero',
    subcategory: [12, 13],
    description: 'Sombreros y accesorios de cabeza para destacar tu avatar.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 11,
    category: 'types',
    title: 'Cofre de Boca',
    subcategory: [14, 15],
    description: 'Expresiones y detalles faciales para darle más carácter al avatar.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 12,
    category: 'types',
    title: 'Cofre de Fondo',
    subcategory: [16],
    description: 'Fondos decorativos para complementar la presentación visual.',
    image: cofreDefault,
    imageHeight: '200px',
  },
  {
    id: 18,
    category: 'types',
    title: 'Cofre de Piel',
    subcategory: [18],
    description: 'Opciones de tonos y acabados para personalizar la apariencia base.',
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
  const [, setPopup] = useState<PopupState | null>(null); //No tengo idea de porque esa coma la hace funcionar... pero lo hace
  const [lootboxCategory, setLootboxCategory] = useState<number[] | null>(null); //Pool de Objetos

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
  } = useUserAvatar(user?.id ?? 0, catalog, allElements, atributos);

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

  //Filtrado de Items por Cofre
  console.log('lootboxCategory:', lootboxCategory);

  console.log(
    'unownedItems:',
    unownedItems.map((item) => ({
      nombre: item.nombre,
      id_atributo_avatar: item.id_atributo_avatar,
      tipo: typeof item.id_atributo_avatar,
    }))
  );
  const filteredUnownedItems =
  !lootboxCategory
    ? unownedItems
    : unownedItems.filter((item) =>
        lootboxCategory.includes(item.id_atributo_avatar)
      );

  console.log(
    'filteredUnownedItems:',
    filteredUnownedItems.map((item) => ({
      nombre: item.nombre,
      id_atributo_avatar: item.id_atributo_avatar,
      tipo: typeof item.id_atributo_avatar,
    }))
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
                  unownedItems={filteredUnownedItems}
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
                        height: item.imageHeight,
                        transform: 'translateY(-0.7rem)',
                      }}
                    />
                  </div>

                  <div className="shop-item-info">
                    <h3>{item.title}</h3>

                    <p>{item.description}</p>

                    <ButtonComponent
                      label="Comprar" //COFRES DE ESTILOS, NO FILTRAR
                      onClick={() => { setShowLootbox(true); setPopup(null); }}
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
                      onClick={() => { setLootboxCategory(item.subcategory ?? null); setShowLootbox(true); setPopup(null); }}
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
