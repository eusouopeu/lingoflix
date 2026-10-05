// Importação de legendas em lote (aba Importar): descobre o episódio de cada
// arquivo pelo nome, forma os pares idioma estudado + português e monta a
// legenda de cada episódio.
import { casarPorTempo, estimarDeslocamento, type Fala } from "./legenda";
import type { Legenda } from "../store/legendas";

export interface Arquivo {
  nome: string;
  falas: Fala[];
}

export interface Episodio {
  temporada?: number; // ausente quando o nome só traz o número do episódio
  episodio: number;
}

const PADROES: { re: RegExp; ler: (m: RegExpMatchArray) => Episodio }[] = [
  { re: /s(\d{1,2})\s*[._ -]?\s*e(\d{1,3})(?!\d)/i, ler: (m) => ({ temporada: +m[1], episodio: +m[2] }) },
  { re: /(?<!\d)(\d{1,2})x(\d{2,3})(?!\d)/i, ler: (m) => ({ temporada: +m[1], episodio: +m[2] }) },
  { re: /第\s*(\d{1,2})\s*季\s*第\s*(\d{1,3})\s*[集话話]/, ler: (m) => ({ temporada: +m[1], episodio: +m[2] }) },
  { re: /第\s*(\d{1,3})\s*[集话話]/, ler: (m) => ({ episodio: +m[1] }) },
  { re: /(?<![a-z0-9])(?:ep|episode|episodio|episódio|e)[ ._-]?(\d{1,3})(?!\d)/i, ler: (m) => ({ episodio: +m[1] }) },
];

// "Avatar.S03E05.WEB.srt" → { temporada: 3, episodio: 5 }; sem pista, null.
export function episodioDoNome(nome: string): Episodio | null {
  for (const { re, ler } of PADROES) {
    const m = nome.match(re);
    if (m) return ler(m);
  }
  return null;
}

export type Lado = "original" | "pt";

export interface Par<T extends { nome: string }> {
  temporada: number;
  episodio: number;
  original?: T;
  pt?: T;
}

export interface Pareamento<T extends { nome: string }> {
  pares: Par<T>[]; // por temporada e episódio
  sem: { lado: Lado; arquivo: T }[]; // nome sem episódio e sem escolha manual
  repetidos: number; // arquivos descartados por repetirem um episódio já preenchido
}

export const chaveManual = (lado: Lado, nome: string) => `${lado}:${nome}`;

// `manual`: episódio escolhido à mão para arquivos que o nome não identifica.
// `temporada`: usada quando o nome traz só o episódio.
export function parear<T extends { nome: string }>(
  original: T[],
  pt: T[],
  temporada: number,
  manual: Record<string, number> = {},
): Pareamento<T> {
  const mapa = new Map<string, Par<T>>();
  const sem: Pareamento<T>["sem"] = [];
  let repetidos = 0;
  const colocar = (lado: Lado, arquivo: T) => {
    const achado = episodioDoNome(arquivo.nome);
    const episodio = achado?.episodio ?? manual[chaveManual(lado, arquivo.nome)];
    if (episodio == null) return sem.push({ lado, arquivo });
    const t = achado?.temporada ?? temporada;
    const k = `${t}-${episodio}`;
    const par: Par<T> = mapa.get(k) ?? { temporada: t, episodio };
    if (par[lado]) repetidos++;
    else par[lado] = arquivo;
    mapa.set(k, par);
  };
  original.forEach((a) => colocar("original", a));
  pt.forEach((a) => colocar("pt", a));
  const pares = [...mapa.values()].sort((a, b) => a.temporada - b.temporada || a.episodio - b.episodio);
  return { pares, sem, repetidos };
}

// Legenda pronta para gravar: casa as duas pelo tempo (sem IA, para valer em
// lote). Mantém posição e termos se a original é a mesma de antes.
export function montarLegenda(
  chave: string,
  idioma: string,
  original: Arquivo,
  pt: Arquivo | null,
  anterior: Legenda | null,
): Legenda {
  const ptFalas = pt?.falas ?? [];
  const deslocamento = ptFalas.length ? estimarDeslocamento(original.falas, ptFalas) : 0;
  const mesma = anterior?.origem.original === original.nome;
  return {
    chave,
    idioma,
    original: original.falas,
    pt: ptFalas,
    casamento: casarPorTempo(original.falas, ptFalas, deslocamento),
    deslocamento,
    ia: false,
    origem: { original: original.nome, pt: pt?.nome ?? "" },
    posicao: mesma ? anterior.posicao : 0,
    termos: mesma ? anterior.termos : {},
  };
}
