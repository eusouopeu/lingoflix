// Menu suspenso de escolha múltipla. Nenhuma opção marcada = "Todos".
// O menu fica aberto enquanto se marca; fecha com toque fora ou Esc.
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { cn } from "./cn";
import { CAMPO, LinhaFiltro } from "./Selecao";

export function MultiSelecao<T extends string | number>({
  id,
  rotulo,
  valores,
  onChange,
  opcoes,
}: {
  id: string;
  rotulo: string;
  valores: T[];
  onChange: (v: T[]) => void;
  opcoes: { valor: T; nome: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora, true);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const nomes = opcoes.filter((o) => valores.includes(o.valor)).map((o) => o.nome);
  const resumo = nomes.length === 0 ? "Todos" : nomes.length <= 2 ? nomes.join(", ") : `${nomes.length} selecionados`;
  const alternar = (v: T) => onChange(valores.includes(v) ? valores.filter((x) => x !== v) : [...valores, v]);

  return (
    <LinhaFiltro rotulo={rotulo} id={id}>
      <div ref={caixa}>
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={aberto}
          onClick={() => setAberto(!aberto)}
          className={cn(CAMPO, nomes.length > 0 && "font-semibold text-caneta")}
        >
          <span className="truncate">{resumo}</span>
        </button>
        <ChevronDownIcon
          className={cn(
            "pointer-events-none absolute top-2.5 right-3 size-5 text-sub transition-transform duration-150",
            aberto && "rotate-180",
          )}
          aria-hidden
        />
        {aberto && (
          <ul
            role="listbox"
            aria-multiselectable
            aria-label={rotulo}
            className="absolute inset-x-0 top-11 z-30 max-h-72 animate-surge overflow-auto rounded-app-sm bg-card py-1 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
          >
            {[{ valor: null, nome: "Todos" }, ...opcoes].map((o) => {
              const marcado = o.valor === null ? valores.length === 0 : valores.includes(o.valor);
              return (
                <li
                  key={String(o.valor)}
                  role="option"
                  aria-selected={marcado}
                  tabIndex={0}
                  onClick={() => (o.valor === null ? onChange([]) : alternar(o.valor))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).click();
                    }
                  }}
                  className={cn(
                    "flex h-11 cursor-pointer items-center gap-2 px-3 text-sm",
                    marcado ? "font-semibold text-caneta" : "text-ink",
                  )}
                >
                  <CheckIcon className={cn("size-5 shrink-0", !marcado && "invisible")} aria-hidden />
                  {o.nome}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </LinhaFiltro>
  );
}
