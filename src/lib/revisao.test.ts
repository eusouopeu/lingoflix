import { aprendido, diaLocal, revisar, somarDias, venceu } from "./revisao";

describe("revisão espaçada (SM-2)", () => {
  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(diaLocal(new Date(2026, 9, 2, 23, 50))).toBe("2026-10-02");
  });

  it("acertos seguidos: 1, 6 e depois intervalo × facilidade", () => {
    const a = revisar(undefined, "bom", "2026-10-02");
    expect(a).toMatchObject({ repeticoes: 1, intervalo: 1, proxima: "2026-10-03" });
    const b = revisar(a, "bom", "2026-10-03");
    expect(b).toMatchObject({ repeticoes: 2, intervalo: 6, proxima: "2026-10-09" });
    const c = revisar(b, "bom", "2026-10-09");
    expect(c.intervalo).toBe(Math.round(6 * b.facilidade));
  });

  it("errar zera as repetições, volta amanhã e reduz a facilidade (mínimo 1,3)", () => {
    let r = revisar(undefined, "facil", "2026-10-02");
    r = revisar(r, "errei", "2026-10-03");
    expect(r).toMatchObject({ repeticoes: 0, intervalo: 1, proxima: "2026-10-04" });
    for (let i = 0; i < 10; i++) r = revisar(r, "errei", "2026-10-03");
    expect(r.facilidade).toBe(1.3);
  });

  it("vencido e aprendido", () => {
    const p = { revisao: { repeticoes: 3, intervalo: 25, facilidade: 2.5, proxima: "2026-10-02" } };
    expect(venceu(p, "2026-10-02")).toBe(true);
    expect(venceu(p, "2026-10-01")).toBe(false);
    expect(venceu({}, "2026-10-02")).toBe(false);
    expect(aprendido(p)).toBe(true);
  });
});
