import type { FC, ReactNode } from 'react';
import './ButtonComponent.css';

interface ButtonComponentProps {
  label: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

const ButtonComponent: FC<ButtonComponentProps> = ({ label, onClick, icon, type = 'button', disabled, variant = 'primary' }) => {
  return (
    <button type={type} className={`button-component button-component--${variant}`} onClick={onClick} disabled={disabled}>
      {icon && <span className="button-component__icon">{icon}</span>}
      {label}
    </button>
  );
};

export default ButtonComponent;
