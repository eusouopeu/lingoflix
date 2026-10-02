import { calcularNivel, rotuloNivel } from "./nivel";

describe("nível de dificuldade", () => {
  it("animação/família é fácil e drama histórico é difícil", () => {
    expect(calcularNivel({ generos: [16, 10751], ano: 2015 })).toBe(0);
    expect(calcularNivel({ generos: [35, 10749], ano: 2010 })).toBe(1);
    expect(calcularNivel({ generos: [18, 36], ano: 2005 })).toBe(2);
  });

  it("mandarim usa HSK; os demais idiomas usam QECR", () => {
    expect(rotuloNivel(0, "zh")).toMatch(/^HSK \d$/);
    expect(rotuloNivel(2, "zh")).toMatch(/^HSK \d$/);
    expect(rotuloNivel(0, "fr")).toBe("A2");
    expect(rotuloNivel(1, "de")).toBe("B1");
    expect(rotuloNivel(2, "es")).toBe("C1");
  });
});
