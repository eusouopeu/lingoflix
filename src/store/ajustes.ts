// Ajustes do app: chave da API do Claude, tradução automática e frente dos
// flashcards. SQLite no aparelho (tabela chave/valor), localStorage no navegador.
import { Capacitor } from "@capacitor/core";
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import type { Frente } from "../lib/anki";
import { abrirBanco } from "./banco";

export interface Ajustes {
  chaveClaude: string;
  traducaoAuto: boolean;
  frente: Frente;
}

const PADRAO: Ajustes = { chaveClaude: "", traducaoAuto: false, frente: "pt" };
const CHAVE_WEB = "lingoflix.ajustes";

async function ler(): Promise<Ajustes> {
  if (!Capacitor.isNativePlatform()) {
    try {
      return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE_WEB) || "{}") };
    } catch {
      return PADRAO;
    }
  }
  const db = await abrirBanco();
  await db.execute("CREATE TABLE IF NOT EXISTS ajustes (chave TEXT PRIMARY KEY NOT NULL, valor TEXT NOT NULL);");
  const r = await db.query("SELECT chave, valor FROM ajustes");
  const salvo = Object.fromEntries((r.values ?? []).map((v) => [v.chave, JSON.parse(v.valor)]));
  return { ...PADRAO, ...salvo };
}

async function gravar(a: Ajustes) {
  if (!Capacitor.isNativePlatform()) {
    localStorage.setItem(CHAVE_WEB, JSON.stringify(a));
    return;
  }
  const db = await abrirBanco();
  for (const [k, v] of Object.entries(a)) {
    await db.run("INSERT OR REPLACE INTO ajustes (chave, valor) VALUES (?, ?)", [k, JSON.stringify(v)]);
  }
}

const Ctx = createContext<{ ajustes: Ajustes; mudar: (m: Partial<Ajustes>) => void } | null>(null);

export function AjustesProvider({ children }: { children: ReactNode }) {
  const [ajustes, setAjustes] = useState(PADRAO);
  useEffect(() => {
    ler().then(setAjustes).catch(console.error);
  }, []);
  const mudar = (m: Partial<Ajustes>) =>
    setAjustes((a) => {
      const novo = { ...a, ...m };
      gravar(novo).catch(console.error);
      return novo;
    });
  return createElement(Ctx.Provider, { value: { ajustes, mudar } }, children);
}

export function useAjustes() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAjustes fora do AjustesProvider");
  return c;
}
