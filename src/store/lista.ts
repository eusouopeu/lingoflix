// Lista pessoal ("quero ver" / "já vi", com anotações de vocabulário).
// No app (Android) grava em SQLite; no navegador de desenvolvimento cai para
// localStorage. As duas implementações cumprem a mesma interface.
import { Capacitor } from "@capacitor/core";
import type { Tipo } from "../lib/catalogo";
import type { Nivel } from "../lib/nivel";

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
}

export interface RepoLista {
  todos(): Promise<ItemLista[]>;
  salvar(item: ItemLista): Promise<void>;
  remover(chave: string): Promise<void>;
}

const recentes = (a: ItemLista, b: ItemLista) => b.atualizado - a.atualizado;

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
      return Object.values(ler()).sort(recentes);
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

const COLUNAS = ["chave", "id", "tipo", "titulo", "titulo_original", "poster", "idioma", "nivel", "status", "notas", "atualizado"];

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
      }));
    },
    async salvar(i) {
      await db.run(`INSERT OR REPLACE INTO lista (${COLUNAS.join(",")}) VALUES (${COLUNAS.map(() => "?").join(",")})`, [
        i.chave, i.id, i.tipo, i.titulo, i.tituloOriginal, i.poster, i.idioma, i.nivel, i.status, i.notas, i.atualizado,
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
