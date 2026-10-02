import { rotuloNivel, type Nivel } from "../lib/nivel";
import { cn } from "./cn";

// Um único selo por cartão: pílula sólida, como no mock do cartão.

export function SeloNivel({ nivel, idioma, neutro, className }: { nivel: Nivel; idioma: string; neutro?: boolean; className?: string }) {
  return (
    <span
      className={cn("rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap text-on-caneta", neutro ? "bg-tag-cinza" : "bg-caneta-500", className)}
      title="Nível estimado"
    >
      {rotuloNivel(nivel, idioma)}
    </span>
  );
}
