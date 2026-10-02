// Baralho .csv para o Anki: 3 colunas separadas por ";" — frente, verso e
// tags. Uma coluna é o termo em português; a outra, o termo no idioma
// estudado seguido (se houver) do significado das partes; a ordem depende da
// frente escolhida nos Ajustes. Tags: <idioma>::<nível> e a classe gramatical.
// O cabeçalho "#..." é o formato de importação do Anki (2.1.55+).
import { IDIOMAS } from "./catalogo";
import { rotuloNivel, type Nivel } from "./nivel";
import type { Par } from "./vocabulario";

export type Frente = "pt" | "estudo";

const campo = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function csvAnki(pares: Par[], o: { idioma: string; nivel: Nivel; frente: Frente }): string {
  const idioma = IDIOMAS.find((l) => l.codigo === o.idioma)?.tag ?? o.idioma;
  const nivel = rotuloNivel(o.nivel, o.idioma).replace(/\s+/g, "");
  const linhas = pares
    .map((p) => ({ ...p, termo: p.termo.trim(), traducao: p.traducao.trim() }))
    .filter((p) => p.termo && p.traducao)
    .map((p) => {
      const estudo = p.partes ? `${p.termo}<br>(${p.partes})` : p.termo;
      const tags = [`${idioma}::${nivel}`, p.classe].filter(Boolean).join(" ");
      const [frente, verso] = o.frente === "pt" ? [p.traducao, estudo] : [estudo, p.traducao];
      return [frente, verso, tags].map(campo).join(";");
    });
  return ["#separator:semicolon", "#html:true", "#tags column:3", ...linhas].join("\n");
}
