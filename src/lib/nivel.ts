// Nível estimado de dificuldade para quem aprende o idioma. É uma heurística
// sobre os gêneros e a época do título: animação/infantil tem fala simples e
// clara; comédia, romance e ação ficam no meio; drama, história, guerra,
// documentário, crime e mistério concentram vocabulário denso. Títulos
// antigos (antes de 1980) sobem um degrau pela linguagem datada.

export type Nivel = 0 | 1 | 2;

const FACEIS = new Set([16, 10751, 10762]); // animação, família, infantil
const LEVES = new Set([35, 10749, 28, 12, 10759, 10764, 10766]);
const DENSOS = new Set([18, 36, 10752, 99, 9648, 80, 10768, 53]);

export function calcularNivel({ generos, ano }: { generos: number[]; ano?: number | null }): Nivel {
  let nivel: number;
  if (generos.some((g) => FACEIS.has(g))) nivel = 0;
  else {
    const densos = generos.filter((g) => DENSOS.has(g)).length;
    const leves = generos.filter((g) => LEVES.has(g)).length;
    nivel = densos >= 2 || (densos === 1 && leves === 0) ? 2 : 1;
  }
  if (ano && ano < 1980) nivel += 1;
  return Math.min(nivel, 2) as Nivel;
}

// Mandarim usa a escala HSK (equivalência aproximada com o QECR:
// HSK 3 ≈ A2, HSK 4 ≈ B1, HSK 6 ≈ C1); os demais idiomas usam o QECR.
const QECR = ["A2", "B1", "C1"];
const HSK = ["HSK 3", "HSK 4", "HSK 6"];

export function rotuloNivel(nivel: Nivel, idioma: string): string {
  return (idioma === "zh" ? HSK : QECR)[nivel];
}
