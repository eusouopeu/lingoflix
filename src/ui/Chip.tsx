import type { ReactNode } from "react";
import { cn } from "./cn";

// Opção de filtro: selecionada usa o degrau 500 da escala roxa.
export function Chip({
  ativo,
  onClick,
  children,
  rotulo,
}: {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
  rotulo?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      aria-label={rotulo}
      title={rotulo}
      onClick={onClick}
      className={cn(
        "h-9 min-w-10 shrink-0 cursor-pointer rounded-full px-3 text-xs font-semibold transition-[background-color,color,transform] duration-150 active:scale-95",
        ativo ? "bg-caneta-500 text-on-caneta" : "bg-card-2 text-ink"
      )}
    >
      {children}
    </button>
  );
}
