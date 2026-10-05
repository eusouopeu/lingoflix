// Baralho .csv para o Anki: 3 colunas separadas por ";" — frente, verso e
// tags. Uma coluna é o termo em português; a outra, o termo no idioma
// estudado seguido (se houver) do significado das partes; a ordem depende da
// frente escolhida nos Ajustes. Tags: <idioma>::<nível> e a classe gramatical.
// O cabeçalho "#..." é o formato de importação do Anki (2.1.55+).
// Há dois baralhos: o de um título (vocabulário da Minha lista) e o de um
// idioma inteiro (aba Estudo).
import { IDIOMAS } from "./catalogo";
import { rotuloNivel, type Nivel } from "./nivel";
import type { Par } from "./vocabulario";

export type Frente = "pt" | "estudo";

const campo = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const CABECALHO = ["#separator:semicolon", "#html:true", "#tags column:3"];

const tagIdioma = (codigo: string) => IDIOMAS.find((l) => l.codigo === codigo)?.tag ?? codigo;

// Uma linha do baralho; null se o par estiver incompleto.
function linhaAnki(p: Par, o: { idioma: string; nivel: Nivel; frente: Frente }): string | null {
  const termo = p.termo.trim();
  const traducao = p.traducao.trim();
  if (!termo || !traducao) return null;
  const nivel = rotuloNivel(o.nivel, o.idioma).replace(/\s+/g, "");
  const estudo = p.partes ? `${termo}<br>(${p.partes})` : termo;
  const tags = [`${tagIdioma(o.idioma)}::${nivel}`, p.classe].filter(Boolean).join(" ");
  const [frente, verso] = o.frente === "pt" ? [traducao, estudo] : [estudo, traducao];
  return [frente, verso, tags].map(campo).join(";");
}

export function csvAnki(pares: Par[], o: { idioma: string; nivel: Nivel; frente: Frente }): string {
  return [...CABECALHO, ...pares.map((p) => linhaAnki(p, o)).filter((l) => l !== null)].join("\n");
}

// Baralho de um idioma inteiro (aba Estudo): o vocabulário de todos os
// títulos, sem repetir termo (vale o do título mais recente). Cada linha
// leva o nível do título de onde a palavra veio.
export function csvAnkiIdioma(
  itens: { idioma: string; nivel: Nivel; atualizado: number; vocabulario: Par[] }[],
  idioma: string,
  frente: Frente,
): { csv: string; total: number } {
  const vistos = new Set<string>();
  const linhas: string[] = [];
  for (const i of [...itens].filter((x) => x.idioma === idioma).sort((a, b) => b.atualizado - a.atualizado)) {
    for (const p of i.vocabulario) {
      const k = p.termo.trim().toLocaleLowerCase();
      if (vistos.has(k)) continue;
      const l = linhaAnki(p, { idioma, nivel: i.nivel, frente });
      if (!l) continue;
      vistos.add(k);
      linhas.push(l);
    }
  }
  return { csv: [...CABECALHO, ...linhas].join("\n"), total: linhas.length };
}
