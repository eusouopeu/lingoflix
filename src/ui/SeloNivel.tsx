import { rotuloNivel, type Nivel } from "../lib/nivel";
import { cn } from "./cn";

// Um único selo por cartão. O degrau da escala roxa sobe com a dificuldade.
const FUNDO = ["bg-caneta-soft", "bg-caneta-200", "bg-caneta-300"];

export function SeloNivel({ nivel, idioma, className }: { nivel: Nivel; idioma: string; className?: string }) {
  return (
    <span
      className={cn("rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap text-ink", FUNDO[nivel], className)}
      title="Nível estimado"
    >
      {rotuloNivel(nivel, idioma)}
    </span>
  );
}
