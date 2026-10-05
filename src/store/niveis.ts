// Cache dos níveis estimados pelo Claude (chave "tipo-id" → 0/1/2), para não
// pagar duas vezes pelo mesmo título. SQLite no aparelho, localStorage no navegador.
import { Capacitor } from "@capacitor/core";
import type { Nivel } from "../lib/nivel";
import { abrirBanco } from "./banco";

const CHAVE_WEB = "lingoflix.niveis";

const lerWeb = (): Record<string, Nivel> => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_WEB) || "{}");
  } catch {
    return {};
  }
};

let tabela: Promise<void> | null = null;
async function banco() {
  const db = await abrirBanco();
  tabela ??= db
    .execute("CREATE TABLE IF NOT EXISTS niveis (chave TEXT PRIMARY KEY NOT NULL, nivel INTEGER NOT NULL);")
    .then(() => undefined);
  await tabela;
  return db;
}

export async function lerNiveis(chaves: string[]): Promise<Record<string, Nivel>> {
  if (!chaves.length) return {};
  if (!Capacitor.isNativePlatform()) {
    const todos = lerWeb();
    return Object.fromEntries(chaves.filter((k) => k in todos).map((k) => [k, todos[k]]));
  }
  const db = await banco();
  const r = await db.query(
    `SELECT chave, nivel FROM niveis WHERE chave IN (${chaves.map(() => "?").join(",")})`,
    chaves,
  );
  return Object.fromEntries((r.values ?? []).map((v) => [v.chave, v.nivel as Nivel]));
}

export async function gravarNiveis(niveis: Record<string, Nivel>) {
  const pares = Object.entries(niveis);
  if (!pares.length) return;
  if (!Capacitor.isNativePlatform()) {
    localStorage.setItem(CHAVE_WEB, JSON.stringify({ ...lerWeb(), ...niveis }));
    return;
  }
  const db = await banco();
  for (const [k, n] of pares) await db.run("INSERT OR REPLACE INTO niveis (chave, nivel) VALUES (?, ?)", [k, n]);
}
