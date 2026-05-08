import { CheckIcon } from '@heroicons/react/24/solid';
import type { ButtonHTMLAttributes } from 'react';
import './StatusCheckBox.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  checked: boolean;
};

export default function StatusCheckBox({
  checked,
  className = '',
  type = 'button',
  ...buttonProps
}: Props) {
  return (
    <button
      {...buttonProps}
      type={type}
      className={`status-checkbox ${
        checked ? 'status-checkbox--checked' : ''
      } ${className}`.trim()}
    >
      <CheckIcon className="status-checkbox__icon" />
    </button>
  );
}