// Progresso por idioma (aba Estudo): tudo calculado a partir da lista e dos
// dias de estudo guardados nos ajustes.
import type { ItemLista } from "../store/lista";
import { aprendido, somarDias } from "./revisao";

export interface Progresso {
  idioma: string;
  palavras: number; // pares completos (termo e tradução)
  aprendidas: number;
  vistos: [number, number, number]; // títulos "já vi" por nível
  quero: number;
}

export function progressoPorIdioma(itens: ItemLista[]): Progresso[] {
  const por = new Map<string, Progresso>();
  for (const i of itens) {
    const p = por.get(i.idioma) ?? { idioma: i.idioma, palavras: 0, aprendidas: 0, vistos: [0, 0, 0], quero: 0 };
    const completos = i.vocabulario.filter((v) => v.termo.trim() && v.traducao.trim());
    p.palavras += completos.length;
    p.aprendidas += completos.filter(aprendido).length;
    if (i.status === "visto") p.vistos[i.nivel]++;
    else p.quero++;
    por.set(i.idioma, p);
  }
  // mais palavras primeiro; empate, mais títulos vistos
  const vistos = (p: Progresso) => p.vistos[0] + p.vistos[1] + p.vistos[2];
  return [...por.values()].sort((a, b) => b.palavras - a.palavras || vistos(b) - vistos(a));
}

// Dias seguidos de estudo até hoje. Se ainda não estudou hoje, a sequência
// que terminou ontem continua valendo (só quebra depois de um dia inteiro).
export function sequencia(dias: string[], hoje: string): number {
  const feitos = new Set(dias);
  let dia = feitos.has(hoje) ? hoje : somarDias(hoje, -1);
  let n = 0;
  while (feitos.has(dia)) {
    n++;
    dia = somarDias(dia, -1);
  }
  return n;
}
