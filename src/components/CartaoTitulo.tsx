// Cartão da grade do Explorar (mock do Pedro, 02/10/2026). Tocar na imagem
// alterna pôster ⇄ verso (etiquetas de gênero + sinopse justificada). Título,
// metadados, marcadores e streamings ficam sempre visíveis embaixo.
import { BookmarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolido, CheckCircleIcon as CheckSolido } from "@heroicons/react/24/solid";
import { useLayoutEffect, useRef, useState } from "react";
import type { Titulo } from "../lib/tmdb";
import { useLista } from "../store/ListaContexto";
import { BotaoIcone } from "../ui/BotaoIcone";
import { SeloNivel } from "../ui/SeloNivel";
import { Etiquetas, Logos, Metadados, Poster, TituloEOriginal, useDetalhes } from "./partesTitulo";

export function CartaoTitulo({ t }: { t: Titulo }) {
  const [virado, setVirado] = useState(false);
  const { ref, det, sinopse, generos, nota } = useDetalhes<HTMLElement>(t);
  const lista = useLista();
  const status = lista.statusDe(t);

  return (
    <article ref={ref} className="flex min-w-0 flex-col rounded-app bg-cartao p-2">
      <button
        type="button"
        aria-expanded={virado}
        aria-label={virado ? `Mostrar pôster de ${t.titulo}` : `Mostrar sinopse de ${t.titulo}`}
        onClick={() => setVirado(!virado)}
        className="relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-[12px] bg-cartao-verso text-left transition-transform duration-150 active:scale-[0.98]"
      >
        {virado ? (
          <Verso sinopse={sinopse} generos={generos} />
        ) : (
          <>
            {t.poster ? (
              <Poster caminho={t.poster} largura="w342" className="h-full w-full animate-surge object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center p-3 text-center text-sm font-semibold text-sub">
                {t.titulo}
              </span>
            )}
            <SeloNivel nivel={t.nivel} idioma={t.idioma} className="absolute top-2 left-2" />
          </>
        )}
      </button>

      <div className="min-w-0 px-1 pt-2">
        <TituloEOriginal t={t} />
        <Metadados nota={nota} ano={t.ano} det={det} className="mt-2" />
        <div className="-ml-2 flex items-center">
          <BotaoIcone
            icone={BookmarkIcon}
            iconeAtivo={BookmarkSolido}
            ativo={status === "quero"}
            rotulo="Quero ver"
            onClick={() => lista.alternar(t, "quero", det)}
            className="size-[34px]"
          />
          <BotaoIcone
            icone={CheckCircleIcon}
            iconeAtivo={CheckSolido}
            ativo={status === "visto"}
            rotulo="Já vi"
            onClick={() => lista.alternar(t, "visto", det)}
            className="size-[34px]"
          />
          <Logos det={det} className="ml-auto" />
        </div>
      </div>
    </article>
  );
}

function Verso({ sinopse, generos }: { sinopse: string; generos: number[] }) {
  const texto = useRef<HTMLParagraphElement>(null);
  const [linhas, setLinhas] = useState(8);

  // quantas linhas cabem no espaço que sobra: o corte termina em "…"
  useLayoutEffect(() => {
    const el = texto.current;
    if (!el) return;
    const medir = () => {
      const altura = el.parentElement!.clientHeight - el.offsetTop - 12;
      const linha = parseFloat(getComputedStyle(el).lineHeight) || 19;
      setLinhas(Math.max(1, Math.floor(altura / linha)));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el.parentElement!);
    return () => obs.disconnect();
  }, [generos.length]);

  return (
    <div className="flex h-full animate-surge flex-col gap-2 p-3">
      {generos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Etiquetas generos={generos} max={2} />
        </div>
      )}
      <p
        ref={texto}
        lang="pt-BR"
        style={{ WebkitLineClamp: linhas }}
        className="overflow-hidden text-[13px] leading-[1.45] text-ink [display:-webkit-box] [-webkit-box-orient:vertical] text-justify hyphens-auto"
      >
        {sinopse || "Sinopse não disponível."}
      </p>
    </div>
  );
}

export function CartaoEsqueleto() {
  return (
    <div aria-hidden className="flex flex-col rounded-app bg-cartao p-2">
      <div className="aspect-[2/3] w-full animate-pulse rounded-[12px] bg-cartao-verso" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded-full bg-cartao-verso" />
      <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded-full bg-cartao-verso" />
      <div className="mt-3 h-6 w-2/3 animate-pulse rounded-full bg-cartao-verso" />
      <div className="mt-2 h-8" />
    </div>
  );
}
