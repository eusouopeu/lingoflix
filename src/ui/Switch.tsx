import { cn } from "./cn";

// Interruptor liga/desliga (role="switch"); o rótulo vem de fora (aria-labelledby).
export function Switch({
  ligado,
  onChange,
  desativado,
  idRotulo,
}: {
  ligado: boolean;
  onChange: (v: boolean) => void;
  desativado?: boolean;
  idRotulo: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-labelledby={idRotulo}
      disabled={desativado}
      onClick={() => onChange(!ligado)}
      className={cn(
        "relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        ligado ? "bg-caneta-500" : "bg-cartao-verso",
      )}
    >
      <span
        className={cn(
          "absolute top-1 left-1 size-5 rounded-full bg-card transition-transform duration-150",
          ligado && "translate-x-5",
        )}
      />
    </button>
  );
}
