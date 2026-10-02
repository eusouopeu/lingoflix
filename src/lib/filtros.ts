// Filtros da lista pessoal: mesmos critérios da busca, aplicados localmente.
import type { ItemLista } from "../store/lista";
import type { OrdemLista, Tipo } from "./catalogo";
import type { Nivel } from "./nivel";

export interface FiltrosLista {
  tipo: Tipo | null;
  idioma: string | null;
  nivel: Nivel | null;
  generos: number[];
  plataformas: string[];
  ordem: OrdemLista;
}

const algum = <T>(escolhidos: T[], valores: T[]) =>
  escolhidos.length === 0 || escolhidos.some((v) => valores.includes(v));

const ORDENAR: Record<OrdemLista, (a: ItemLista, b: ItemLista) => number> = {
  adicionado: (a, b) => b.atualizado - a.atualizado,
  nota: (a, b) => b.nota - a.nota,
  lancamento: (a, b) => (b.ano ?? 0) - (a.ano ?? 0),
};

export function filtrarLista(itens: ItemLista[], f: FiltrosLista): ItemLista[] {
  return itens
    .filter(
      (i) =>
        (f.tipo === null || i.tipo === f.tipo) &&
        (f.idioma === null || i.idioma === f.idioma) &&
        (f.nivel === null || i.nivel === f.nivel) &&
        algum(f.generos, i.generos) &&
        algum(f.plataformas, i.plataformas),
    )
    .sort(ORDENAR[f.ordem]);
}
