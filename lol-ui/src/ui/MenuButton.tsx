type Props = {
  label: string;
  hint?: string;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export function MenuButton({ label, hint, primary, disabled, onClick }: Props) {
  return (
    <button
      className={`btn ${primary ? "primary" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled ? "true" : undefined}
    >
      <span>{label}</span>
      {hint ? <span className="hint">{hint}</span> : <span />}
    </button>
  );
}
