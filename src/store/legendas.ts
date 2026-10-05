// Legendas baixadas ou importadas de cada filme/episódio, já casadas, mais a
// posição em que o usuário parou e os significados já consultados. Cada
// legenda é baixada uma vez só (a cota do OpenSubtitles é pequena).
// SQLite no aparelho (JSON numa tabela chave/dados), localStorage no navegador.
import { Capacitor } from "@capacitor/core";
import type { Explicacao } from "../lib/claude";
import type { Fala } from "../lib/legenda";
import { abrirBanco } from "./banco";

export interface Legenda {
  chave: string; // ver chaveLegenda
  original: Fala[];
  pt: Fala[];
  casamento: string[]; // texto em PT de cada fala original
  deslocamento: number; // ms somados aos tempos da legenda em PT
  ia: boolean; // casamento feito pelo Haiku (não só pelo tempo)
  origem: { original: string; pt: string }; // nome do release ou "importado"
  posicao: number; // ms onde parou
  termos: Record<string, Explicacao>; // "fala|termo" → significado
}

export const chaveLegenda = (chaveTitulo: string, temporada?: number, episodio?: number) =>
  temporada != null && episodio != null ? `${chaveTitulo}-s${temporada}e${episodio}` : chaveTitulo;

const PREFIXO_WEB = "lingoflix.legendas.";

let tabela: Promise<void> | null = null;
async function banco() {
  const db = await abrirBanco();
  tabela ??= db
    .execute("CREATE TABLE IF NOT EXISTS legendas (chave TEXT PRIMARY KEY NOT NULL, dados TEXT NOT NULL);")
    .then(() => undefined);
  await tabela;
  return db;
}

export async function lerLegenda(chave: string): Promise<Legenda | null> {
  if (!Capacitor.isNativePlatform()) {
    try {
      return JSON.parse(localStorage.getItem(PREFIXO_WEB + chave) ?? "null");
    } catch {
      return null;
    }
  }
  const r = await (await banco()).query("SELECT dados FROM legendas WHERE chave = ?", [chave]);
  const v = r.values?.[0];
  return v ? { termos: {}, ...JSON.parse(v.dados) } : null;
}

export async function gravarLegenda(l: Legenda): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.setItem(PREFIXO_WEB + l.chave, JSON.stringify(l));
    return;
  }
  await (await banco()).run("INSERT OR REPLACE INTO legendas (chave, dados) VALUES (?, ?)", [l.chave, JSON.stringify(l)]);
}
