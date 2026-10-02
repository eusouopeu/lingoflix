// Peças comuns aos dois cartões de título (grade do Explorar e linha da Minha
// lista): detalhes sob demanda, metadados, logos de streaming e etiquetas.
import { FilmIcon, StarIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { corGenero, NOME_GENERO, PLATAFORMAS } from "../lib/catalogo";
import { faixaNota } from "../lib/nota";
import { buscarDetalhes, IMG, type Detalhes, type Titulo } from "../lib/tmdb";
import { cn } from "../ui/cn";

// Busca duração, trailer e streamings quando o cartão chega perto da tela.
// Itens antigos da lista podem não ter sinopse/gêneros/nota: os detalhes completam.
export function useDetalhes<E extends HTMLElement>(t: Titulo) {
  const ref = useRef<E>(null);
  const [det, setDet] = useState<Detalhes | null>(null);
  useEffect(() => {
    const el = ref.current;
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
  }, [t.tipo, t.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    ref,
    det,
    sinopse: t.sinopse || det?.sinopse || "",
    generos: t.generos.length ? t.generos : (det?.generos ?? []),
    nota: t.nota || det?.nota || 0,
  };
}

const COR_NOTA = { baixa: "bg-nota-baixa", media: "bg-nota-media", alta: "bg-nota-alta" };

// Nota (cor pela faixa), ano, duração e, à direita, o trailer.
export function Metadados({ nota, ano, det, className }: { nota: number; ano: number | null; det: Detalhes | null; className?: string }) {
  return (
    <div className={cn("flex h-7 items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-sub", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-0.5 rounded-app-sm px-1.5 py-1 text-on-caneta transition-colors duration-150",
          COR_NOTA[faixaNota(nota)]
        )}
      >
        <StarIcon className="size-3.5" aria-hidden />
        <span aria-label={`nota ${nota.toFixed(1)}`}>{nota.toFixed(1)}</span>
      </span>
      {ano && <span>{ano}</span>}
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
  );
}

const NOSSAS = new Set(PLATAFORMAS.map((p) => Number(p.id)));

// Logos dos streamings (os do filtro primeiro): 3 no celular, 4 em tela maior.
export function Logos({ det, className }: { det: Detalhes | null; className?: string }) {
  if (!det?.plataformas.length) return null;
  const logos = [...det.plataformas].sort((a, b) => Number(NOSSAS.has(b.id)) - Number(NOSSAS.has(a.id))).slice(0, 4);
  return (
    <a
      href={det.link ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Onde assistir: ${det.plataformas.map((p) => p.nome).join(", ")}`}
      className={cn("flex shrink-0 animate-surge gap-1", !det.link && "pointer-events-none", className)}
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
  );
}

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

export function Etiquetas({ generos, max }: { generos: number[]; max: number }) {
  return (
    <>
      {generos.slice(0, max).map((g) => (
        <span key={g} className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold text-on-caneta", TAG[corGenero(g)])}>
          {NOME_GENERO[g] ?? "Outro"}
        </span>
      ))}
    </>
  );
}

export function TituloEOriginal({ t, className }: { t: Titulo; className?: string }) {
  const original = t.tituloOriginal && t.tituloOriginal !== t.titulo ? t.tituloOriginal : null;
  return (
    <div className={cn("min-w-0", className)}>
      <h3 className="truncate text-base leading-tight font-bold" title={t.titulo}>
        {t.titulo}
      </h3>
      {/* linha reservada mesmo sem título original, para os cartões alinharem */}
      <p className="h-5 truncate text-sm font-semibold text-sub" lang={t.idioma} title={original ?? undefined}>
        {original}
      </p>
    </div>
  );
}

// Pôster com uma nova tentativa se a rede falhar no primeiro carregamento.
export function Poster({ caminho, largura, className }: { caminho: string; largura: "w154" | "w342"; className?: string }) {
  const [tentativa, setTentativa] = useState(0);
  return (
    <img
      src={`${IMG}/${largura}${caminho}${tentativa ? `?t=${tentativa}` : ""}`}
      alt=""
      loading="lazy"
      onError={() => tentativa < 2 && window.setTimeout(() => setTentativa(tentativa + 1), 800)}
      className={className}
    />
  );
}
