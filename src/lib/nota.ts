// Cor da pílula de nota (pedido do Pedro, 02/10/2026): vermelho até 5,
// cinza de 5.1 a 7.4, verde a partir de 7.5. Decide pela nota como aparece
// na tela (1 casa decimal), para a cor nunca contradizer o número.
export type FaixaNota = "baixa" | "media" | "alta";

export function faixaNota(nota: number): FaixaNota {
  const exibida = Math.round(nota * 10) / 10;
  if (exibida <= 5) return "baixa";
  if (exibida >= 7.5) return "alta";
  return "media";
}
