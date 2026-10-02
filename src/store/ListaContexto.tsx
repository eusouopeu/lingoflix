import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Detalhes, Titulo } from "../lib/tmdb";
import { abrirLista, type ItemLista, type RepoLista, type Status } from "./lista";

interface Contexto {
  itens: ItemLista[];
  statusDe: (t: Pick<Titulo, "tipo" | "id">) => Status | null;
  alternar: (t: Titulo, status: Status, det?: Detalhes | null) => void;
  atualizar: (item: ItemLista, mudanca: Partial<ItemLista>) => void;
  remover: (chave: string) => void;
}

const Ctx = createContext<Contexto | null>(null);

export const chaveDe = (t: Pick<Titulo, "tipo" | "id">) => `${t.tipo}-${t.id}`;

export function ListaProvider({ children }: { children: ReactNode }) {
  const repo = useRef<Promise<RepoLista>>(null);
  const [itens, setItens] = useState<ItemLista[]>([]);

  const obterRepo = () => (repo.current ??= abrirLista());

  useEffect(() => {
    obterRepo().then((r) => r.todos()).then(setItens).catch(console.error);
  }, []);

  // Estado otimista: a tela muda na hora e a gravação segue em segundo plano.
  const gravar = (item: ItemLista) => {
    setItens((xs) => [item, ...xs.filter((x) => x.chave !== item.chave)]);
    obterRepo().then((r) => r.salvar(item)).catch(console.error);
  };

  const valor: Contexto = {
    itens,
    statusDe: (t) => itens.find((i) => i.chave === chaveDe(t))?.status ?? null,
    alternar: (t, status, det) => {
      const atual = itens.find((i) => i.chave === chaveDe(t));
      if (atual?.status === status) return valor.remover(atual.chave);
      gravar({
        chave: chaveDe(t),
        id: t.id,
        tipo: t.tipo,
        titulo: t.titulo,
        tituloOriginal: t.tituloOriginal,
        poster: t.poster,
        idioma: t.idioma,
        nivel: t.nivel,
        status,
        notas: atual?.notas ?? "",
        atualizado: Date.now(),
        generos: t.generos.length ? t.generos : (det?.generos ?? []),
        plataformas: det ? det.plataformas.map((p) => String(p.id)) : (atual?.plataformas ?? []),
        nota: t.nota || det?.nota || 0,
        ano: t.ano,
        sinopse: t.sinopse || det?.sinopse || "",
      });
    },
    atualizar: (item, mudanca) => gravar({ ...item, ...mudanca, atualizado: Date.now() }),
    remover: (chave) => {
      setItens((xs) => xs.filter((x) => x.chave !== chave));
      obterRepo().then((r) => r.remover(chave)).catch(console.error);
    },
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useLista() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLista fora do ListaProvider");
  return c;
}
