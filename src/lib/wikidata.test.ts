import { consultaSparql, lerResposta } from "./wikidata";

describe("IDs pelo Wikidata", () => {
  it("consulta pela propriedade do TMDB de filme ou de série", () => {
    expect(consultaSparql("filme", 550)).toContain('wdt:P4947 "550"');
    expect(consultaSparql("serie", 1396)).toContain('wdt:P4983 "1396"');
    expect(consultaSparql("filme", 550)).toContain("wdt:P1874 ?netflix");
  });

  it("lê só os serviços presentes; sem resultado, nenhum ID", () => {
    const r = lerResposta({
      results: {
        bindings: [{ item: { value: "http://www.wikidata.org/entity/Q190050" }, netflix: { value: "26004747" } }],
      },
    });
    expect(r).toEqual({ netflix: "26004747" });
    expect(lerResposta({ results: { bindings: [] } })).toEqual({});
  });
});
