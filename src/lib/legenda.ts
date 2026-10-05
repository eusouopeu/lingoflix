// Legendas (.srt / .vtt): leitura, fala de cada instante e casamento da
// legenda original com a em português pelo tempo (tela Legendas).

export interface Fala {
  inicio: number; // ms
  fim: number; // ms
  texto: string;
}

const TEMPO = /(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/;

function ms(m: RegExpMatchArray): number {
  const [, h, min, s, frac] = m;
  return ((Number(h ?? 0) * 60 + Number(min)) * 60 + Number(s)) * 1000 + Number(frac.padEnd(3, "0"));
}

// SRT e WebVTT: blocos separados por linha em branco; a linha com "-->" traz
// os tempos e as seguintes o texto (tags de estilo e posição saem).
export function lerSrt(texto: string): Fala[] {
  const falas: Fala[] = [];
  for (const bloco of texto
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)) {
    const linhas = bloco.split("\n");
    const i = linhas.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, b] = linhas[i].split("-->");
    const ini = a.match(TEMPO);
    const fim = b?.match(TEMPO);
    if (!ini || !fim) continue;
    const t = linhas
      .slice(i + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\{\\[^}]*\}/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (t) falas.push({ inicio: ms(ini), fim: ms(fim), texto: t });
  }
  return falas.sort((x, y) => x.inicio - y.inicio);
}

// Índice da fala ativa em `t` (ou da última que já começou); -1 antes da primeira.
export function falaEm(falas: Fala[], t: number): number {
  let lo = 0;
  let hi = falas.length - 1;
  let r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (falas[m].inicio <= t) {
      r = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return r;
}

function sobreposicaoTotal(orig: Fala[], pt: Fala[], d: number): number {
  let soma = 0;
  let j = 0;
  for (const o of orig) {
    while (j < pt.length && pt[j].fim + d <= o.inicio) j++;
    for (let k = j; k < pt.length && pt[k].inicio + d < o.fim; k++) {
      soma += Math.max(0, Math.min(o.fim, pt[k].fim + d) - Math.max(o.inicio, pt[k].inicio + d));
    }
  }
  return soma;
}

// Quanto somar aos tempos da legenda em PT para alinhá-la à original: testa
// de −10 s a +10 s, de 100 em 100 ms, e fica com a maior sobreposição.
export function estimarDeslocamento(orig: Fala[], pt: Fala[]): number {
  let melhor = 0;
  let max = sobreposicaoTotal(orig, pt, 0);
  for (let d = -10000; d <= 10000; d += 100) {
    const s = sobreposicaoTotal(orig, pt, d);
    if (s > max) [max, melhor] = [s, d];
  }
  return melhor;
}

// Texto em PT de cada fala original: cada fala em PT (já deslocada) vai para
// a original com que mais se sobrepõe.
export function casarPorTempo(orig: Fala[], pt: Fala[], deslocamento: number): string[] {
  const partes: string[][] = orig.map(() => []);
  for (const p of pt) {
    const ini = p.inicio + deslocamento;
    const fim = p.fim + deslocamento;
    let alvo = -1;
    let max = 0;
    for (let k = Math.max(0, falaEm(orig, ini) - 1); k < orig.length && orig[k].inicio < fim; k++) {
      const s = Math.min(orig[k].fim, fim) - Math.max(orig[k].inicio, ini);
      if (s > max) [max, alvo] = [s, k];
    }
    if (alvo >= 0) partes[alvo].push(p.texto);
  }
  return partes.map((p) => p.join(" "));
}

export interface Token {
  texto: string;
  palavra: boolean;
}

const PALAVRA = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu;
// chinês e japonês não separam palavras com espaço: cada caractere é tocável
const PALAVRA_CJK =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]|[\p{Script=Latin}\p{N}]+(?:['’]\p{Script=Latin}+)*/gu;

export function dividirPalavras(texto: string, idioma: string): Token[] {
  const re = idioma === "zh" || idioma === "ja" ? PALAVRA_CJK : PALAVRA;
  const tokens: Token[] = [];
  let pos = 0;
  for (const m of texto.matchAll(re)) {
    if (m.index > pos) tokens.push({ texto: texto.slice(pos, m.index), palavra: false });
    tokens.push({ texto: m[0], palavra: true });
    pos = m.index + m[0].length;
  }
  if (pos < texto.length) tokens.push({ texto: texto.slice(pos), palavra: false });
  return tokens;
}

const dois = (n: number) => String(n).padStart(2, "0");

export function formatarTempo(t: number): string {
  const s = Math.max(0, Math.floor(t / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${dois(m)}:${dois(s % 60)}` : `${m}:${dois(s % 60)}`;
}

// "1:02:15", "62:15" ou só minutos ("75") → ms
export function lerTempo(texto: string): number | null {
  const partes = texto.trim().split(":");
  if (!partes.length || partes.length > 3 || partes.some((p) => !/^\d+$/.test(p))) return null;
  const n = partes.map(Number);
  const s = n.length === 1 ? n[0] * 60 : n.length === 2 ? n[0] * 60 + n[1] : (n[0] * 60 + n[1]) * 60 + n[2];
  return s * 1000;
}

// Arquivos .srt antigos costumam vir em Windows-1252 em vez de UTF-8.
export function decodificarTexto(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
