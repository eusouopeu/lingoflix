import type { ComponentType, SVGProps } from "react";
import { cn } from "./cn";

type Icone = ComponentType<SVGProps<SVGSVGElement>>;

// Botão-ícone sem fundo nem borda (minimalismo.md); `ativo` troca para o
// ícone sólido e a cor primária.
export function BotaoIcone({
  icone: I,
  iconeAtivo: IA,
  ativo = false,
  rotulo,
  onClick,
  className,
}: {
  icone: Icone;
  iconeAtivo?: Icone;
  ativo?: boolean;
  rotulo: string;
  onClick: () => void;
  className?: string;
}) {
  const Atual = ativo && IA ? IA : I;
  return (
    <button
      type="button"
      aria-label={rotulo}
      aria-pressed={IA ? ativo : undefined}
      title={rotulo}
      onClick={onClick}
      className={cn(
        "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[color,transform] duration-150 active:scale-90",
        ativo ? "text-caneta" : "text-sub",
        className
      )}
    >
      <Atual className="size-6" aria-hidden />
    </button>
  );
}
