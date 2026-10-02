import { BookmarkIcon, FilmIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolido, FilmIcon as FilmSolido } from "@heroicons/react/24/solid";
import { useState } from "react";
import { Explorar } from "./screens/Explorar";
import { MinhaLista } from "./screens/MinhaLista";
import { ListaProvider, useLista } from "./store/ListaContexto";
import { cn } from "./ui/cn";

type Aba = "explorar" | "lista";

export function App() {
  const [aba, setAba] = useState<Aba>("explorar");
  return (
    <ListaProvider>
      {/* Explorar fica montado (escondido) para não perder filtros e páginas carregadas. */}
      <div hidden={aba !== "explorar"}>
        <Explorar />
      </div>
      {aba === "lista" && <MinhaLista />}
      <BarraAbas aba={aba} onChange={setAba} />
    </ListaProvider>
  );
}

function BarraAbas({ aba, onChange }: { aba: Aba; onChange: (a: Aba) => void }) {
  const { itens } = useLista();
  const quero = itens.filter((i) => i.status === "quero").length;
  const abas = [
    { id: "explorar" as const, nome: "Explorar", I: FilmIcon, IA: FilmSolido },
    { id: "lista" as const, nome: "Minha lista", I: BookmarkIcon, IA: BookmarkSolido },
  ];
  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-20 flex bg-card-blur pb-[var(--safe-bottom)] backdrop-blur-md"
    >
      {abas.map(({ id, nome, I, IA }) => {
        const ativa = aba === id;
        const Icone = ativa ? IA : I;
        return (
          <button
            key={id}
            type="button"
            aria-current={ativa ? "page" : undefined}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex h-[var(--tabbar-h)] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors duration-150",
              ativa ? "text-caneta" : "text-sub"
            )}
          >
            <span className="relative">
              <Icone className="size-6" aria-hidden />
              {id === "lista" && quero > 0 && (
                <span className="absolute -top-1 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-caneta px-1 text-[10px] font-bold text-on-caneta">
                  {quero}
                </span>
              )}
            </span>
            {nome}
          </button>
        );
      })}
    </nav>
  );
}
