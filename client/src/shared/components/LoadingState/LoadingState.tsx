import './LoadingState.css';

type Props = {
  message?: string;
};

export default function LoadingState({ message = 'Cargando...' }: Props) {
  return (
    <section className="loading-state">
      <div className="loading-state__spinner" />
      <p className="loading-state__message">{message}</p>
    </section>
  );
}