// Escolha de temporada e episódio antes de abrir as legendas de uma série.
// Lembra o último episódio aberto de cada série (só neste aparelho).
import { ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { buscarTemporadas, type Temporada } from "../lib/tmdb";
import type { ItemLista } from "../store/lista";
import { BotaoIcone } from "../ui/BotaoIcone";
import { cn } from "../ui/cn";
import { Selecao } from "../ui/Selecao";

const CHAVE_ULTIMO = "lingoflix.ultimoEpisodio";

function ultimo(chave: string): { t: number; e: number } | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_ULTIMO) ?? "{}")[chave] ?? null;
  } catch {
    return null;
  }
}

function lembrar(chave: string, t: number, e: number) {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE_ULTIMO) ?? "{}");
    localStorage.setItem(CHAVE_ULTIMO, JSON.stringify({ ...d, [chave]: { t, e } }));
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

export function SeletorEpisodio({
  item,
  onEscolher,
  onFechar,
}: {
  item: ItemLista;
  onEscolher: (temporada: number, episodio: number) => void;
  onFechar: () => void;
}) {
  const [temps, setTemps] = useState<Temporada[] | null>(null);
  const [erro, setErro] = useState(false);
  const anterior = ultimo(item.chave);
  const [t, setT] = useState(anterior?.t ?? 1);

  useEffect(() => {
    buscarTemporadas(item.id)
      .then((ts) => {
        setTemps(ts);
        if (!ts.some((x) => x.numero === t) && ts[0]) setT(ts[0].numero);
      })
      .catch(() => setErro(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const atual = temps?.find((x) => x.numero === t);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end"
      role="dialog"
      aria-modal
      aria-label="Escolher episódio"
    >
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-paper/70" />
      <div className="relative flex max-h-[80vh] animate-surge flex-col rounded-t-app bg-card px-4 pt-3 pb-[calc(var(--safe-bottom)+16px)]">
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{item.titulo}</h2>
          <BotaoIcone icone={XMarkIcon} rotulo="Fechar" onClick={onFechar} className="-mr-2.5" />
        </div>
        {erro ? (
          <p className="py-6 text-center text-sm font-semibold text-erro">Não foi possível carregar as temporadas.</p>
        ) : !temps ? (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-sub">
            <ArrowPathIcon className="size-4 animate-spin" aria-hidden /> Carregando temporadas…
          </p>
        ) : (
          <>
            <div className="mt-1">
              <Selecao
                id="temporada"
                rotulo="Temporada"
                valor={String(t)}
                onChange={(v) => setT(Number(v))}
                opcoes={temps.map((x) => ({ valor: String(x.numero), nome: x.nome }))}
              />
            </div>
            <p className="mt-3 mb-1.5 text-xs font-semibold text-sub">Episódio</p>
            <div className="grid grid-cols-6 gap-1.5 overflow-y-auto">
              {Array.from({ length: atual?.episodios ?? 0 }, (_, i) => i + 1).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    lembrar(item.chave, t, e);
                    onEscolher(t, e);
                  }}
                  className={cn(
                    "h-11 cursor-pointer rounded-app-sm text-sm font-semibold transition-transform duration-150 active:scale-95",
                    anterior?.t === t && anterior.e === e ? "bg-caneta-200 text-caneta" : "bg-card-2 text-ink",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
