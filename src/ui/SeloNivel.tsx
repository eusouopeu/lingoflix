import { SparklesIcon } from "@heroicons/react/24/solid";
import { rotuloNivel, type Nivel } from "../lib/nivel";
import { cn } from "./cn";

// Um único selo por cartão: pílula sólida, como no mock do cartão. Com `ia`,
// leva uma faísca: o nível veio do Claude, não da heurística de gênero.

export function SeloNivel({
  nivel,
  idioma,
  neutro,
  ia,
  className,
}: {
  nivel: Nivel;
  idioma: string;
  neutro?: boolean;
  ia?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap text-on-caneta",
        neutro ? "bg-tag-cinza" : "bg-caneta-500",
        className,
      )}
      title={ia ? "Nível estimado pelo Claude" : "Nível estimado pelo gênero"}
    >
      {ia && <SparklesIcon className="size-3" aria-label="estimado pelo Claude" />}
      {rotuloNivel(nivel, idioma)}
    </span>
  );
}
