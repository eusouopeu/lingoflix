// IDs de um título nos streamings, pelo Wikidata (ligado ao ID do TMDB).
// O TMDB só diz EM QUAL serviço o título está, não o endereço dele lá; o
// Wikidata guarda esses IDs para boa parte dos filmes e séries conhecidos.
import type { Tipo } from "./catalogo";

export type Servico = "netflix" | "prime" | "disney" | "hbo" | "apple" | "globoplay";
export type IdsStreaming = Partial<Record<Servico, string>>;

// propriedade do ID do TMDB e de cada serviço no Wikidata
const PROP_TMDB: Record<Tipo, string> = { filme: "P4947", serie: "P4983" };
const PROPS: [Servico, string][] = [
  ["netflix", "P1874"],
  ["prime", "P8055"],
  ["disney", "P7595"],
  ["apple", "P9586"],
  ["hbo", "P8298"],
];

export function consultaSparql(tipo: Tipo, idTmdb: number): string {
  const opcionais = PROPS.map(([s, p]) => `OPTIONAL { ?item wdt:${p} ?${s} . }`).join(" ");
  return `SELECT * WHERE { ?item wdt:${PROP_TMDB[tipo]} "${idTmdb}" . ${opcionais} } LIMIT 1`;
}

export function lerResposta(json: { results?: { bindings?: Record<string, { value: string }>[] } }): IdsStreaming {
  const b = json.results?.bindings?.[0];
  if (!b) return {};
  return Object.fromEntries(PROPS.filter(([s]) => b[s]).map(([s]) => [s, b[s].value]));
}

const cache = new Map<string, Promise<IdsStreaming>>();

// Sem resposta em 2,5 s (ou com erro), segue sem IDs: o app abre na busca.
export function idsStreaming(tipo: Tipo, idTmdb: number): Promise<IdsStreaming> {
  const k = `${tipo}-${idTmdb}`;
  let p = cache.get(k);
  if (!p) {
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(consultaSparql(tipo, idTmdb))}`;
    p = fetch(url, { signal: AbortSignal.timeout(2500), headers: { Accept: "application/sparql-results+json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Wikidata respondeu ${r.status}`))))
      .then(lerResposta);
    p.catch(() => cache.delete(k));
    cache.set(k, p);
  }
  return p.catch(() => ({}));
}
