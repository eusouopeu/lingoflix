import { rotuloNivel, type Nivel } from "../lib/nivel";
import { cn } from "./cn";

// Um único selo por cartão: pílula sólida, como no mock do cartão.

export function SeloNivel({ nivel, idioma, className }: { nivel: Nivel; idioma: string; className?: string }) {
  return (
    <span
      className={cn("rounded-full bg-caneta-500 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-on-caneta", className)}
      title="Nível estimado"
    >
      {rotuloNivel(nivel, idioma)}
    </span>
  );
}
