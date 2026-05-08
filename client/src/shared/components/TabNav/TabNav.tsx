import './TabNav.css';

export type TabNavItem<TValue extends string> = {
  value: TValue;
  label: string;
  count?: number;
};

type Props<TValue extends string> = {
  items: TabNavItem<TValue>[];
  activeValue: TValue;
  onChange: (value: TValue) => void;
  className?: string;
};

export default function TabNav<TValue extends string>({ items, activeValue, onChange, className }: Props<TValue>) {
  return (
    <div className={`tab-nav${className ? ` ${className}` : ''}`}>
      {items.map((item) => {
        const isActive = item.value === activeValue;
        return (
          <button
            key={item.value}
            type="button"
            className={`tab-nav__item ${isActive ? 'tab-nav__item--active' : ''}`}
            onClick={() => onChange(item.value)}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span className="tab-nav__count">{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
