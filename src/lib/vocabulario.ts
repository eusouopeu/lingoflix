// Vocabulário de cada título da lista: pares termo → tradução.

export interface Par {
  termo: string; // no idioma estudado
  traducao: string; // em português
  classe?: string; // classe gramatical (preenchida pela tradução automática)
  partes?: string; // significado das partes da palavra, ex.: "fogo + mosca"
}

// Anotações em texto livre (versões até a 3) viram pares: cada linha é um
// par, separado por "-", "=", "→", ":" ou tab; sem separador, só o termo.
export function migrarNotas(texto: string): Par[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.+?)\s*(?:\s-\s|=|→|:|\t)\s*(.*)$/);
      return m ? { termo: m[1].trim(), traducao: m[2].trim() } : { termo: l, traducao: "" };
    });
}

export function limparPares(pares: Par[]): Par[] {
  return pares
    .map((p) => ({ ...p, termo: p.termo.trim(), traducao: p.traducao.trim() }))
    .filter((p) => p.termo || p.traducao);
}

export const contarPalavras = (pares: Par[]) => pares.filter((p) => p.termo.trim()).length;
