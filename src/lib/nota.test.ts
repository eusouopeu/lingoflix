import { faixaNota } from "./nota";

describe("faixa de cor da nota", () => {
  it("vermelho até 5, cinza de 5.1 a 7.4, verde a partir de 7.5 (pela nota exibida, 1 casa)", () => {
    expect([0, 4.2, 5, 5.04].map(faixaNota)).toEqual(["baixa", "baixa", "baixa", "baixa"]);
    expect([5.06, 5.1, 6.8, 7.4, 7.44].map(faixaNota)).toEqual(["media", "media", "media", "media", "media"]);
    expect([7.45, 7.5, 8.2, 10].map(faixaNota)).toEqual(["alta", "alta", "alta", "alta"]);
  });
});
