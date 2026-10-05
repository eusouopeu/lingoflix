// Streamings no cartão: um ícone por serviço, o app Android de cada um e o
// endereço do título dentro do serviço.
import { PLATAFORMAS, type Tipo } from "./catalogo";
import type { IdsStreaming, Servico } from "./wikidata";

export interface Plataforma {
  id: number;
  nome: string;
  logo: string;
}

// "Netflix Standard with Ads", "HBO Max Amazon Channel"... viram o serviço-base.
const base = (nome: string) =>
  nome
    .toLowerCase()
    .replace(/\s+(standard|basic|premium)?\s*with ads$/, "")
    .replace(/\s+(amazon|apple tv|roku premium)\s+channel$/, "")
    .trim();

const NOSSAS = new Set(PLATAFORMAS.map((p) => Number(p.id)));

export function unificarPlataformas(lista: Plataforma[]): Plataforma[] {
  const grupos = new Map<string, Plataforma>();
  for (const p of lista) {
    const k = base(p.nome);
    const atual = grupos.get(k);
    // fica o da ordem do TMDB, salvo se um id do nosso filtro aparecer depois
    if (!atual || (!NOSSAS.has(atual.id) && NOSSAS.has(p.id))) grupos.set(k, p);
  }
  return [...grupos.values()];
}

// Endereço do título dentro de cada serviço. Com o ID (Wikidata), abre a
// página do próprio título; sem ele, a busca do serviço já com o nome.
// O trecho de texto da URL (slug) é ignorado pelos serviços; vai por legibilidade.
const slug = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "-";

interface Destino {
  servico: Servico;
  pacote: string; // app Android
  web: string; // se o app não estiver instalado
  busca: (nome: string) => string;
  titulo?: (id: string, tipo: Tipo, nome: string) => string | null;
}

const q = encodeURIComponent;

const APPS: [RegExp, Destino][] = [
  [
    /netflix/,
    {
      servico: "netflix",
      pacote: "com.netflix.mediaclient",
      web: "https://www.netflix.com",
      busca: (n) => `https://www.netflix.com/search?q=${q(n)}`,
      titulo: (id) => (/^\d+$/.test(id) ? `https://www.netflix.com/title/${id}` : null),
    },
  ],
  [
    /prime video|amazon video/,
    {
      servico: "prime",
      pacote: "com.amazon.avod.thirdpartyclient",
      web: "https://www.primevideo.com",
      busca: (n) => `https://www.primevideo.com/search/?phrase=${q(n)}`,
      titulo: (id) => (/^amzn1\.dv\.gti\./.test(id) ? `https://www.primevideo.com/detail/${id}` : null),
    },
  ],
  [
    /disney/,
    {
      servico: "disney",
      pacote: "com.disney.disneyplus",
      web: "https://www.disneyplus.com",
      busca: (n) => `https://www.disneyplus.com/search?q=${q(n)}`,
      titulo: (id, tipo, nome) =>
        /^[A-Za-z0-9]{12}$/.test(id)
          ? `https://www.disneyplus.com/${tipo === "filme" ? "movies" : "series"}/${slug(nome)}/${id}`
          : null,
    },
  ],
  [
    /hbo|^max$/,
    {
      servico: "hbo",
      pacote: "com.wbd.stream",
      web: "https://play.hbomax.com",
      busca: (n) => `https://play.hbomax.com/search/result?q=${q(n)}`,
      // só o formato atual (movie/<uuid>); os IDs "urn:hbo" são do HBO Max antigo
      titulo: (id) => (/^(movie|series|show)\/[0-9a-f-]{36}$/.test(id) ? `https://play.hbomax.com/${id}` : null),
    },
  ],
  [
    /apple tv/,
    {
      servico: "apple",
      pacote: "com.apple.atve.androidtv.appletv",
      web: "https://tv.apple.com",
      busca: (n) => `https://tv.apple.com/br/search?term=${q(n)}`,
      titulo: (id, tipo, nome) =>
        /^umc\.cmc\.[a-z0-9]+$/.test(id)
          ? `https://tv.apple.com/br/${tipo === "filme" ? "movie" : "show"}/${slug(nome)}/${id}`
          : null,
    },
  ],
  [
    /globoplay/,
    {
      servico: "globoplay",
      pacote: "com.globo.globotv",
      web: "https://globoplay.globo.com",
      busca: (n) => `https://globoplay.globo.com/busca/?q=${q(n)}`,
    },
  ],
];

export function destinoApp(p: Pick<Plataforma, "id" | "nome">): Destino | null {
  const n = base(p.nome);
  return APPS.find(([re]) => re.test(n))?.[1] ?? null;
}

// Link do título no serviço: página dele (com o ID) ou a busca pelo nome.
export function linkTitulo(
  d: Destino,
  ids: IdsStreaming,
  t: { tipo: Tipo; titulo: string },
): { url: string; exato: boolean } {
  const id = ids[d.servico];
  const exato = id && d.titulo?.(id, t.tipo, t.titulo);
  return exato ? { url: exato, exato: true } : { url: d.busca(t.titulo), exato: false };
}
