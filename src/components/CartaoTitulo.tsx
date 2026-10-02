// Cartão de filme/série. Tocar no pôster vira o cartão (toggle): o verso
// mostra sinopse e dados, e o rodapé ganha onde assistir e o trailer no
// idioma original. Os detalhes só são buscados na primeira virada.
import { BookmarkIcon, CheckCircleIcon, PlayCircleIcon, StarIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolido, CheckCircleIcon as CheckSolido } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { buscarDetalhes, IMG, type Detalhes, type Titulo } from "../lib/tmdb";
import { useLista } from "../store/ListaContexto";
import { BotaoIcone } from "../ui/BotaoIcone";
import { cn } from "../ui/cn";
import { SeloNivel } from "../ui/SeloNivel";

export function CartaoTitulo({ t }: { t: Titulo }) {
  const [virado, setVirado] = useState(false);
  const [det, setDet] = useState<Detalhes | null>(null);
  const lista = useLista();
  const status = lista.statusDe(t);
  const original = t.tituloOriginal && t.tituloOriginal !== t.titulo ? t.tituloOriginal : null;

  useEffect(() => {
    if (virado && !det) buscarDetalhes(t).then(setDet).catch(() => undefined);
  }, [virado, det, t]);

  return (
    <article className="flex min-w-0 flex-col">
      <button
        type="button"
        aria-expanded={virado}
        aria-label={virado ? `Mostrar pôster de ${t.titulo}` : `Mostrar sinopse de ${t.titulo}`}
        onClick={() => setVirado(!virado)}
        className="relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-app bg-card-2 text-left transition-transform duration-150 active:scale-[0.98]"
      >
        {virado ? (
          <div className="flex h-full animate-surge flex-col gap-2 p-3">
            <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-sub">
              {t.ano && <span>{t.ano}</span>}
              <span className="inline-flex items-center gap-0.5">
                <StarIcon className="size-3.5" aria-hidden />
                <span aria-label={`nota ${t.nota.toFixed(1)}`}>{t.nota.toFixed(1)}</span>
              </span>
              {det?.duracao && <span>{det.duracao}</span>}
            </p>
            <p className="min-h-0 flex-1 overflow-hidden text-xs leading-[1.5] text-ink [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
              {t.sinopse || "Sinopse não disponível."}
            </p>
          </div>
        ) : t.poster ? (
          <img
            src={`${IMG}/w342${t.poster}`}
            alt=""
            loading="lazy"
            className="h-full w-full animate-surge object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center p-3 text-center text-sm font-semibold text-sub">
            {t.titulo}
          </span>
        )}
        {!virado && <SeloNivel nivel={t.nivel} idioma={t.idioma} className="absolute top-2 left-2" />}
      </button>

      <div className="mt-2 min-w-0 px-0.5">
        <h3 className="truncate text-sm font-semibold" title={t.titulo}>
          {t.titulo}
        </h3>
        {/* linha reservada mesmo sem título original, para os cartões alinharem na grade */}
        <p className="h-[18px] truncate text-xs text-sub" lang={t.idioma} title={original ?? undefined}>
          {original}
        </p>
      </div>

      <div className="-ml-2.5 flex items-center">
        <BotaoIcone
          icone={BookmarkIcon}
          iconeAtivo={BookmarkSolido}
          ativo={status === "quero"}
          rotulo="Quero ver"
          onClick={() => lista.alternar(t, "quero")}
        />
        <BotaoIcone
          icone={CheckCircleIcon}
          iconeAtivo={CheckSolido}
          ativo={status === "visto"}
          rotulo="Já vi"
          onClick={() => lista.alternar(t, "visto")}
        />
        {virado && det?.trailer && (
          <a
            href={det.trailer}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Trailer no idioma original"
            title="Trailer no idioma original"
            className="inline-flex size-11 animate-surge items-center justify-center rounded-full text-sub active:scale-90"
          >
            <PlayCircleIcon className="size-6" aria-hidden />
          </a>
        )}
      </div>

      {virado && det && det.plataformas.length > 0 && (
        <a
          href={det.link ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Onde assistir: ${det.plataformas.map((p) => p.nome).join(", ")}`}
          className={cn("flex animate-surge flex-wrap gap-1.5", !det.link && "pointer-events-none")}
        >
          {det.plataformas.slice(0, 5).map((p) => (
            <img key={p.id} src={`${IMG}/w92${p.logo}`} alt={p.nome} title={p.nome} className="size-7 rounded-app-sm" />
          ))}
        </a>
      )}
    </article>
  );
}

export function CartaoEsqueleto() {
  return (
    <div aria-hidden className="flex flex-col">
      <div className="aspect-[2/3] w-full animate-pulse rounded-app bg-card-2" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded-full bg-card-2" />
      <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded-full bg-card-2" />
    </div>
  );
}
