import React from 'react';
import './Store.css';
import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';

const shopItems = [
  {
    id: 1,
    category: 'styles',
    title: 'Cofre Básico',
    description: 'Incluye cosméticos comunes.',
  },
  {
    id: 2,
    category: 'styles',
    title: 'Cofre Premium',
    description: 'Mayor probabilidad de objetos raros.',
  },
  {
    id: 3,
    category: 'styles',
    title: 'Cofre Legendario',
    description: 'Objetos exclusivos limitados.',
  },
  {
    id: 4,
    category: 'types',
    title: 'Cofre Evento',
    description: 'Contenido especial temporal.',
  },
  {
    id: 5,
    category: 'types',
    title: 'Cofre Especial',
    description: 'Objetos únicos para elementos específicos.',
  },
];

const ShopPage: React.FC = () => {
  const styleItems = shopItems.filter(
    (item) => item.category === 'styles'
  );

  const typeItems = shopItems.filter(
    (item) => item.category === 'types'
  );

  return (
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
                    Placeholder
                  </div>

                  <div className="shop-item-info">
                    <h3>{item.title}</h3>

                    <p>{item.description}</p>

                    <ButtonComponent
                      label="Comprar"
                      onClick={() => {}}
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
                    Placeholder
                  </div>

                  <div className="shop-item-info">
                    <h3>{item.title}</h3>

                    <p>{item.description}</p>

                    <ButtonComponent
                      label="Comprar"
                      onClick={() => {}}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;