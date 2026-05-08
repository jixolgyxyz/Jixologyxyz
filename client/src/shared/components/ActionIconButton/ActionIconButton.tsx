import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './ActionIconButton.css';

type ActionIconButtonVariant = 'default' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  variant?: ActionIconButtonVariant;
};

export default function ActionIconButton({
  icon,
  variant = 'default',
  className = '',
  type = 'button',
  ...buttonProps
}: Props) {
  return (
    <button
      {...buttonProps}
      type={type}
      className={`action-icon-button action-icon-button--${variant} ${className}`.trim()}
    >
      <span className="action-icon-button__icon">{icon}</span>
    </button>
  );
}