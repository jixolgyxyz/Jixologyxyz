import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import './FloatingBackButton.css';

type Props = {
  label?: string;
  fixed?: boolean;
  onClick: () => void;
};

export default function FloatingBackButton({
  label = 'Regresar',
  fixed = true,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      className={`floating-back-button ${
        fixed ? 'floating-back-button--fixed' : 'floating-back-button--inline'
      }`}
      onClick={onClick}
    >
      <ArrowLeftIcon className="floating-back-button__icon" />
      <span>{label}</span>
    </button>
  );
}