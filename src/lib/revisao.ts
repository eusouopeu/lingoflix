// Revisão espaçada dos pares de vocabulário (algoritmo SM-2, o mesmo do
// SuperMemo 2 e base do Anki). O estado de cada par fica no próprio par
// (campo `revisao`), dentro do vocabulário do título: não há tabela nova.

export interface Revisao {
  repeticoes: number; // acertos seguidos
  intervalo: number; // dias até a próxima revisão
  facilidade: number; // fator de facilidade (mínimo 1,3)
  proxima: string; // AAAA-MM-DD (data local)
}

// Botões da revisão, do pior ao melhor.
export type Resposta = "errei" | "dificil" | "bom" | "facil";

const QUALIDADE: Record<Resposta, number> = { errei: 1, dificil: 3, bom: 4, facil: 5 };

// Data local (não UTC): revisar às 23h não pode cair no dia seguinte.
export function diaLocal(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  return diaLocal(new Date(a, m - 1, d + n));
}

export function revisar(r: Revisao | undefined, resposta: Resposta, hoje: string): Revisao {
  const q = QUALIDADE[resposta];
  const facilidadeAntes = r?.facilidade ?? 2.5;
  const facilidade = Math.max(1.3, facilidadeAntes + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (q < 3) return { repeticoes: 0, intervalo: 1, facilidade, proxima: somarDias(hoje, 1) };
  const repeticoes = (r?.repeticoes ?? 0) + 1;
  const intervalo = repeticoes === 1 ? 1 : repeticoes === 2 ? 6 : Math.round((r?.intervalo ?? 1) * facilidadeAntes);
  return { repeticoes, intervalo, facilidade, proxima: somarDias(hoje, intervalo) };
}

// Par nunca revisado conta como novo; os demais vencem na data marcada.
export const ehNovo = (p: { revisao?: Revisao }) => !p.revisao;
export const venceu = (p: { revisao?: Revisao }, hoje: string) => !!p.revisao && p.revisao.proxima <= hoje;

// Palavra "aprendida": intervalo de 21 dias ou mais (o "maduro" do Anki).
export const aprendido = (p: { revisao?: Revisao }) => (p.revisao?.intervalo ?? 0) >= 21;
