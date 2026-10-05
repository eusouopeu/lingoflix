// Ajustes do app: chave da API do Claude, tradução automática, nível por IA,
// frente dos flashcards, o último filtro do Explorar e os dias de estudo.
// SQLite no aparelho (tabela chave/valor), localStorage no navegador.
import { Capacitor } from "@capacitor/core";
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import type { Frente } from "../lib/anki";
import type { Ordem, Tipo } from "../lib/catalogo";
import type { Nivel } from "../lib/nivel";
import { diaLocal } from "../lib/revisao";
import { abrirBanco } from "./banco";

export interface FiltroExplorar {
  tipo: Tipo;
  idioma: string;
  nivel: Nivel | null;
  generos: number[];
  plataformas: string[];
  ordem: Ordem;
}

export interface Ajustes {
  chaveClaude: string;
  traducaoAuto: boolean;
  nivelIA: boolean;
  frente: Frente;
  explorar: FiltroExplorar;
  diasEstudo: string[]; // AAAA-MM-DD em que houve revisão ou palavra nova
}

const PADRAO: Ajustes = {
  chaveClaude: "",
  traducaoAuto: false,
  nivelIA: false,
  frente: "pt",
  explorar: { tipo: "filme", idioma: "en", nivel: null, generos: [], plataformas: [], ordem: "popularidade" },
  diasEstudo: [],
};
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

// Grava só o que mudou (o filtro do Explorar muda a cada toque).
async function gravar(a: Ajustes, mudou: Partial<Ajustes>) {
  if (!Capacitor.isNativePlatform()) {
    localStorage.setItem(CHAVE_WEB, JSON.stringify(a));
    return;
  }
  const db = await abrirBanco();
  for (const [k, v] of Object.entries(mudou)) {
    await db.run("INSERT OR REPLACE INTO ajustes (chave, valor) VALUES (?, ?)", [k, JSON.stringify(v)]);
  }
}

interface Contexto {
  ajustes: Ajustes;
  pronto: boolean; // já leu o que estava salvo (antes disso, valem os padrões)
  mudar: (m: Partial<Ajustes> | ((a: Ajustes) => Partial<Ajustes>)) => void;
  marcarEstudo: () => void; // conta hoje na sequência de dias de estudo
}

const Ctx = createContext<Contexto | null>(null);

export function AjustesProvider({ children }: { children: ReactNode }) {
  const [ajustes, setAjustes] = useState(PADRAO);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    ler()
      .then(setAjustes)
      .catch(console.error)
      .finally(() => setPronto(true));
  }, []);
  const mudar: Contexto["mudar"] = (m) =>
    setAjustes((a) => {
      const mudou = typeof m === "function" ? m(a) : m;
      const novo = { ...a, ...mudou };
      gravar(novo, mudou).catch(console.error);
      return novo;
    });
  const marcarEstudo = () => {
    const hoje = diaLocal();
    if (!ajustes.diasEstudo.includes(hoje))
      mudar((a) => (a.diasEstudo.includes(hoje) ? {} : { diasEstudo: [...a.diasEstudo, hoje] }));
  };
  return createElement(Ctx.Provider, { value: { ajustes, pronto, mudar, marcarEstudo } }, children);
}

export function useAjustes() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAjustes fora do AjustesProvider");
  return c;
}
