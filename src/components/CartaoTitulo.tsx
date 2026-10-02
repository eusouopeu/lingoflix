// Cartão de filme/série (mock do Pedro, 02/10/2026). Tocar na imagem alterna
// pôster ⇄ verso (etiquetas de gênero + sinopse justificada). Título, título
// original, nota/ano/duração/trailer, marcadores e streamings ficam sempre
// visíveis embaixo. Os detalhes (duração, trailer, streamings) são buscados
// quando o cartão chega perto da tela.
import { BookmarkIcon, CheckCircleIcon, FilmIcon, StarIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolido, CheckCircleIcon as CheckSolido } from "@heroicons/react/24/solid";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { corGenero, NOME_GENERO, PLATAFORMAS } from "../lib/catalogo";
import { faixaNota } from "../lib/nota";
import { buscarDetalhes, IMG, type Detalhes, type Titulo } from "../lib/tmdb";
import { useLista } from "../store/ListaContexto";
import { BotaoIcone } from "../ui/BotaoIcone";
import { cn } from "../ui/cn";
import { SeloNivel } from "../ui/SeloNivel";

// classes completas (o Tailwind não enxerga nome montado em tempo de execução)
const TAG: Record<string, string> = {
  azul: "bg-tag-azul",
  ambar: "bg-tag-ambar",
  verde: "bg-tag-verde",
  vermelho: "bg-tag-vermelho",
  ciano: "bg-tag-ciano",
  roxo: "bg-tag-roxo",
  rosa: "bg-tag-rosa",
  cinza: "bg-tag-cinza",
};

const COR_NOTA = { baixa: "bg-nota-baixa", media: "bg-nota-media", alta: "bg-nota-alta" };

const NOSSAS = new Set(PLATAFORMAS.map((p) => Number(p.id)));

// `extras`: botões a mais na linha de ações (Minha lista: anotações, remover);
// com eles os logos dos streamings descem para uma linha própria.
// `abaixo`: conteúdo extra no fim do cartão (campo de anotações).
export function CartaoTitulo({ t, extras, abaixo }: { t: Titulo; extras?: ReactNode; abaixo?: ReactNode }) {
  const [virado, setVirado] = useState(false);
  const [det, setDet] = useState<Detalhes | null>(null);
  const raiz = useRef<HTMLElement>(null);
  const lista = useLista();
  const status = lista.statusDe(t);
  const original = t.tituloOriginal && t.tituloOriginal !== t.titulo ? t.tituloOriginal : null;
  // itens antigos da lista podem não ter sinopse/gêneros/nota: os detalhes completam
  const sinopse = t.sinopse || det?.sinopse || "";
  const generos = t.generos.length ? t.generos : (det?.generos ?? []);
  const nota = t.nota || det?.nota || 0;

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        buscarDetalhes(t).then(setDet).catch(() => undefined);
      },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [t]);

  // streamings da busca primeiro; no máximo 3 cabem no cartão do celular
  const logos = [...(det?.plataformas ?? [])].sort((a, b) => Number(NOSSAS.has(b.id)) - Number(NOSSAS.has(a.id))).slice(0, 4);

  const logosEl =
    logos.length > 0 ? (
      <a
        href={det?.link ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Onde assistir: ${det!.plataformas.map((p) => p.nome).join(", ")}`}
        className={cn("flex animate-surge gap-1", !extras && "ml-auto", !det?.link && "pointer-events-none")}
      >
        {logos.map((p, i) => (
          <img
            key={p.id}
            src={`${IMG}/w92${p.logo}`}
            alt={p.nome}
            title={p.nome}
            className={cn("size-[22px] rounded-[6px] sm:size-7", i === 3 && "hidden sm:block")}
          />
        ))}
      </a>
    ) : null;

  return (
    <article ref={raiz} className="flex min-w-0 flex-col rounded-app bg-cartao p-2">
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
              <img src={`${IMG}/w342${t.poster}`} alt="" loading="lazy" className="h-full w-full animate-surge object-cover" />
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
        <h3 className="truncate text-base leading-tight font-bold" title={t.titulo}>
          {t.titulo}
        </h3>
        {/* linha reservada mesmo sem título original, para os cartões alinharem na grade */}
        <p className="h-5 truncate text-sm font-semibold text-sub" lang={t.idioma} title={original ?? undefined}>
          {original}
        </p>

        <div className="mt-2 flex h-7 items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-sub">
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 rounded-app-sm px-1.5 py-1 text-on-caneta transition-colors duration-150",
              COR_NOTA[faixaNota(nota)]
            )}
          >
            <StarIcon className="size-3.5" aria-hidden />
            <span aria-label={`nota ${nota.toFixed(1)}`}>{nota.toFixed(1)}</span>
          </span>
          {t.ano && <span>{t.ano}</span>}
          {det?.duracao && <span>{det.duracao}</span>}
          {det?.trailer && (
            <a
              href={det.trailer}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Trailer no idioma original"
              title="Trailer no idioma original"
              className="-mr-1 ml-auto inline-flex size-7 shrink-0 animate-surge items-center justify-center text-trailer active:scale-90"
            >
              <FilmIcon className="size-[22px]" aria-hidden />
            </a>
          )}
        </div>

        <div className="-ml-2 flex items-center">
          <BotaoIcone
            icone={BookmarkIcon}
            iconeAtivo={BookmarkSolido}
            ativo={status === "quero"}
            rotulo="Quero ver"
            onClick={() => lista.alternar(t, "quero", det)}
            className="size-9"
          />
          <BotaoIcone
            icone={CheckCircleIcon}
            iconeAtivo={CheckSolido}
            ativo={status === "visto"}
            rotulo="Já vi"
            onClick={() => lista.alternar(t, "visto", det)}
            className="size-9"
          />
          {extras}
          {!extras && logosEl}
        </div>
        {extras && logosEl && <div className="flex pb-1">{logosEl}</div>}
        {abaixo}
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
      const altura = el.parentElement!.clientHeight - el.offsetTop + el.parentElement!.offsetTop - 12;
      const linha = parseFloat(getComputedStyle(el).lineHeight) || 19;
      setLinhas(Math.max(1, Math.floor(altura / linha)));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el.parentElement!);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="flex h-full animate-surge flex-col gap-2 p-3">
      {generos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {generos.slice(0, 2).map((g) => (
            <span key={g} className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold text-on-caneta", TAG[corGenero(g)])}>
              {NOME_GENERO[g] ?? "Outro"}
            </span>
          ))}
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
