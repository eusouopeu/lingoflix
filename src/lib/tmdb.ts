// Cliente da API do TMDB: busca paginada (discover) e detalhes de um título
// (trailer no idioma original e onde assistir no Brasil).
import { PLATAFORMAS, type Ordem, type Tipo } from "./catalogo";
import { calcularNivel, type Nivel } from "./nivel";

const BASE = "https://api.themoviedb.org/3";
export const IMG = "https://image.tmdb.org/t/p";
const CHAVE = import.meta.env.VITE_TMDB_KEY as string;

export interface Titulo {
  id: number;
  tipo: Tipo;
  titulo: string;
  tituloOriginal: string;
  idioma: string;
  poster: string | null;
  sinopse: string;
  ano: number | null;
  nota: number;
  nivel: Nivel;
}

export interface Filtro {
  tipo: Tipo;
  idioma: string;
  ordem: Ordem;
  pagina: number;
  genero?: number;
  plataforma?: string;
}

const CAMINHO: Record<Tipo, string> = { filme: "movie", serie: "tv" };
const DATA: Record<Tipo, string> = { filme: "primary_release_date", serie: "first_air_date" };

export function urlDescobrir(f: Filtro, chave = CHAVE): string {
  const ordem = { popularidade: "popularity.desc", nota: "vote_average.desc", lancamento: `${DATA[f.tipo]}.desc` }[f.ordem];
  const p = new URLSearchParams({
    api_key: chave,
    language: "pt-BR",
    sort_by: ordem,
    // nota exige um mínimo de votos para não subir título com 3 votos 10/10
    "vote_count.gte": f.ordem === "nota" ? "100" : "20",
    include_adult: "false",
    page: String(f.pagina),
    watch_region: "BR",
    with_original_language: f.idioma,
    with_watch_providers: f.plataforma ?? PLATAFORMAS.map((x) => x.id).join("|"),
    with_watch_monetization_types: "flatrate",
  });
  if (f.ordem === "lancamento") p.set(`${DATA[f.tipo]}.lte`, new Date().toISOString().slice(0, 10));
  if (f.genero) p.set("with_genres", String(f.genero));
  return `${BASE}/discover/${CAMINHO[f.tipo]}?${p}`;
}

interface Bruto {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language: string;
  poster_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids: number[];
}

function normalizar(b: Bruto, tipo: Tipo): Titulo {
  const data = b.release_date || b.first_air_date || "";
  const ano = data ? Number(data.slice(0, 4)) : null;
  return {
    id: b.id,
    tipo,
    titulo: b.title ?? b.name ?? "",
    tituloOriginal: b.original_title ?? b.original_name ?? "",
    idioma: b.original_language,
    poster: b.poster_path,
    sinopse: b.overview,
    ano,
    nota: b.vote_average,
    nivel: calcularNivel({ generos: b.genre_ids, ano }),
  };
}

async function obter<T>(url: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`TMDB respondeu ${r.status}`);
  return r.json() as Promise<T>;
}

export async function buscarPagina(f: Filtro, signal?: AbortSignal) {
  const d = await obter<{ results: Bruto[]; total_pages: number }>(urlDescobrir(f), signal);
  return { itens: d.results.map((b) => normalizar(b, f.tipo)), totalPaginas: d.total_pages };
}

export interface Detalhes {
  duracao: string | null;
  trailer: string | null;
  link: string | null;
  plataformas: { id: number; nome: string; logo: string }[];
}

interface DetalhesBrutos {
  runtime?: number;
  number_of_seasons?: number;
  videos?: { results: { key: string; site: string; type: string; iso_639_1: string }[] };
  "watch/providers"?: {
    results: Record<string, { link?: string; flatrate?: { provider_id: number; provider_name: string; logo_path: string }[] }>;
  };
}

const cache = new Map<string, Promise<Detalhes>>();

export function buscarDetalhes(t: Pick<Titulo, "tipo" | "id" | "idioma">): Promise<Detalhes> {
  const k = `${t.tipo}-${t.id}`;
  let p = cache.get(k);
  if (!p) {
    const q = new URLSearchParams({
      api_key: CHAVE,
      language: "pt-BR",
      append_to_response: "videos,watch/providers",
      include_video_language: `${t.idioma},en,null`,
    });
    p = obter<DetalhesBrutos>(`${BASE}/${CAMINHO[t.tipo]}/${t.id}?${q}`).then((d) => {
      const videos = (d.videos?.results ?? []).filter((v) => v.site === "YouTube");
      // trailer falado no idioma original primeiro; depois qualquer trailer
      const trailer =
        videos.find((v) => v.type === "Trailer" && v.iso_639_1 === t.idioma) ??
        videos.find((v) => v.iso_639_1 === t.idioma) ??
        videos.find((v) => v.type === "Trailer");
      const br = d["watch/providers"]?.results.BR;
      const duracao = d.runtime
        ? `${Math.floor(d.runtime / 60)}h${String(d.runtime % 60).padStart(2, "0")}`
        : d.number_of_seasons
          ? `${d.number_of_seasons} temp.`
          : null;
      return {
        duracao,
        trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
        link: br?.link ?? null,
        plataformas: (br?.flatrate ?? []).map((x) => ({ id: x.provider_id, nome: x.provider_name, logo: x.logo_path })),
      };
    });
    p.catch(() => cache.delete(k));
    cache.set(k, p);
  }
  return p;
}
