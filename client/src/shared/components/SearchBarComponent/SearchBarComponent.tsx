import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import styles from './SearchBarComponent.module.css';

export interface ISearchBarComponentProps {
  infoText?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  fontSize?: string;
  height?: string;
}

const SearchBarComponent: React.FC<ISearchBarComponentProps> = ({
  infoText,
  placeholder,
  value,
  onChange,
  fontSize = '1rem',
  height = 'auto',
}) => {
  const [internalValue, setInternalValue] = useState('');

  const currentValue = value ?? internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;

    if (value === undefined) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
  };

  return (
    <div className={styles.container} style={{ fontSize, height }}>
      <MagnifyingGlassIcon className={styles.magnifyingIcon} />

      <input
        className={`${styles.input} ${currentValue ? styles.inputActive : ''}`}
        type="text"
        placeholder={placeholder ?? infoText ?? ''}
        value={currentValue}
        onChange={handleChange}
      />
    </div>
  );
};

export default SearchBarComponent;