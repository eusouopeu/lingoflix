// Lista pessoal ("quero ver" / "já vi", com anotações de vocabulário).
// No app (Android) grava em SQLite; no navegador de desenvolvimento cai para
// localStorage. As duas implementações cumprem a mesma interface.
import { Capacitor } from "@capacitor/core";
import type { Tipo } from "../lib/catalogo";
import type { Nivel } from "../lib/nivel";
import type { Titulo } from "../lib/tmdb";

export type Status = "quero" | "visto";

export interface ItemLista {
  chave: string;
  id: number;
  tipo: Tipo;
  titulo: string;
  tituloOriginal: string;
  poster: string | null;
  idioma: string;
  nivel: Nivel;
  status: Status;
  notas: string;
  atualizado: number;
  generos: number[];
  plataformas: string[];
  nota: number;
  ano: number | null;
  sinopse: string;
}

export interface RepoLista {
  todos(): Promise<ItemLista[]>;
  salvar(item: ItemLista): Promise<void>;
  remover(chave: string): Promise<void>;
}

const recentes = (a: ItemLista, b: ItemLista) => b.atualizado - a.atualizado;

// Itens de versões anteriores não tinham gêneros/plataformas/nota/ano/sinopse.
const completar = (i: ItemLista): ItemLista => ({ ...i, generos: i.generos ?? [], plataformas: i.plataformas ?? [], nota: i.nota ?? 0, ano: i.ano ?? null, sinopse: i.sinopse ?? "" });

const CHAVE_WEB = "lingoflix.lista";

export function criarListaWeb(): RepoLista {
  const ler = (): Record<string, ItemLista> => {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_WEB) || "{}");
    } catch {
      return {};
    }
  };
  const gravar = (d: Record<string, ItemLista>) => localStorage.setItem(CHAVE_WEB, JSON.stringify(d));
  return {
    async todos() {
      return Object.values(ler()).map(completar).sort(recentes);
    },
    async salvar(item) {
      gravar({ ...ler(), [item.chave]: item });
    },
    async remover(chave) {
      const d = ler();
      delete d[chave];
      gravar(d);
    },
  };
}

const COLUNAS = ["chave", "id", "tipo", "titulo", "titulo_original", "poster", "idioma", "nivel", "status", "notas", "atualizado", "generos", "plataformas", "nota", "ano", "sinopse"];

async function criarListaSQLite(): Promise<RepoLista> {
  const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const db = await sqlite.createConnection("lingoflix", false, "no-encryption", 1, false);
  await db.open();
  await db.execute(`CREATE TABLE IF NOT EXISTS lista (
    chave TEXT PRIMARY KEY NOT NULL,
    id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    titulo_original TEXT NOT NULL,
    poster TEXT,
    idioma TEXT NOT NULL,
    nivel INTEGER NOT NULL,
    status TEXT NOT NULL,
    notas TEXT NOT NULL DEFAULT '',
    atualizado INTEGER NOT NULL
  );`);
  // migração da versão 1: colunas novas para filtrar e ordenar a lista
  const existentes = new Set(((await db.query("PRAGMA table_info(lista)")).values ?? []).map((c) => c.name));
  const novas: [string, string][] = [
    ["generos", "TEXT NOT NULL DEFAULT '[]'"],
    ["plataformas", "TEXT NOT NULL DEFAULT '[]'"],
    ["nota", "REAL NOT NULL DEFAULT 0"],
    ["ano", "INTEGER"],
    ["sinopse", "TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [nome, def] of novas) {
    if (!existentes.has(nome)) await db.execute(`ALTER TABLE lista ADD COLUMN ${nome} ${def};`);
  }
  return {
    async todos() {
      const r = await db.query("SELECT * FROM lista ORDER BY atualizado DESC");
      return (r.values ?? []).map((v) => ({
        chave: v.chave,
        id: v.id,
        tipo: v.tipo,
        titulo: v.titulo,
        tituloOriginal: v.titulo_original,
        poster: v.poster,
        idioma: v.idioma,
        nivel: v.nivel,
        status: v.status,
        notas: v.notas,
        atualizado: v.atualizado,
        generos: JSON.parse(v.generos || "[]"),
        plataformas: JSON.parse(v.plataformas || "[]"),
        nota: v.nota ?? 0,
        ano: v.ano ?? null,
        sinopse: v.sinopse ?? "",
      }));
    },
    async salvar(i) {
      await db.run(`INSERT OR REPLACE INTO lista (${COLUNAS.join(",")}) VALUES (${COLUNAS.map(() => "?").join(",")})`, [
        i.chave, i.id, i.tipo, i.titulo, i.tituloOriginal, i.poster, i.idioma, i.nivel, i.status, i.notas, i.atualizado,
        JSON.stringify(i.generos), JSON.stringify(i.plataformas), i.nota, i.ano, i.sinopse,
      ]);
    },
    async remover(chave) {
      await db.run("DELETE FROM lista WHERE chave = ?", [chave]);
    },
  };
}

export function abrirLista(): Promise<RepoLista> {
  return Capacitor.isNativePlatform() ? criarListaSQLite() : Promise.resolve(criarListaWeb());
}

// Item da lista no formato do cartão de título (mesmo cartão do Explorar).
export function paraTitulo(i: ItemLista): Titulo {
  return {
    id: i.id,
    tipo: i.tipo,
    titulo: i.titulo,
    tituloOriginal: i.tituloOriginal,
    idioma: i.idioma,
    poster: i.poster,
    sinopse: i.sinopse,
    ano: i.ano,
    nota: i.nota,
    nivel: i.nivel,
    generos: i.generos,
  };
}
