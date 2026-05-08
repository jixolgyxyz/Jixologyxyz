import './Tabs.css';

export type TabItem<TValue extends string> = {
  value: TValue;
  label: string;
  count?: number;
};

type Props<TValue extends string> = {
  items: TabItem<TValue>[];
  activeValue: TValue;
  onChange: (value: TValue) => void;
};

export default function Tabs<TValue extends string>({ items, activeValue, onChange }: Props<TValue>) {
  return (
    <div className="tabs">
      {items.map((item) => {
        const isActive = item.value === activeValue;

        return (
          <button
            key={item.value}
            type="button"
            className={`tabs__item ${isActive ? 'tabs__item--active' : ''}`}
            onClick={() => onChange(item.value)}
          >
            <span>{item.label}</span>

            {typeof item.count === 'number' && (
              <span className="tabs__count">{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}