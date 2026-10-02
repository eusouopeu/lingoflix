// Streamings no cartão: um ícone por serviço e o app Android de cada um.
import { PLATAFORMAS } from "./catalogo";

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

interface Destino {
  pacote: string; // app Android
  web: string; // se o app não estiver instalado
}

const APPS: [RegExp, Destino][] = [
  [/netflix/, { pacote: "com.netflix.mediaclient", web: "https://www.netflix.com" }],
  [/prime video|amazon video/, { pacote: "com.amazon.avod.thirdpartyclient", web: "https://www.primevideo.com" }],
  [/disney/, { pacote: "com.disney.disneyplus", web: "https://www.disneyplus.com" }],
  [/hbo|^max$/, { pacote: "com.wbd.stream", web: "https://play.hbomax.com" }],
  [/apple tv/, { pacote: "com.apple.atve.androidtv.appletv", web: "https://tv.apple.com" }],
  [/globoplay/, { pacote: "com.globo.globotv", web: "https://globoplay.globo.com" }],
];

export function destinoApp(p: Pick<Plataforma, "id" | "nome">): Destino | null {
  const n = base(p.nome);
  return APPS.find(([re]) => re.test(n))?.[1] ?? null;
}
