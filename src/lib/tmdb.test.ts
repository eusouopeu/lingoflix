import { PLATAFORMAS } from "./catalogo";
import { urlDescobrir } from "./tmdb";

describe("urlDescobrir", () => {
  it("monta busca de séries com idioma, página, ordem e todas as plataformas", () => {
    const u = new URL(urlDescobrir({ tipo: "serie", idioma: "es", ordem: "lancamento", pagina: 3 }, "k"));
    expect(u.pathname).toBe("/3/discover/tv");
    expect(u.searchParams.get("with_original_language")).toBe("es");
    expect(u.searchParams.get("page")).toBe("3");
    expect(u.searchParams.get("sort_by")).toBe("first_air_date.desc");
    expect(u.searchParams.get("watch_region")).toBe("BR");
    expect(u.searchParams.get("with_watch_providers")!.split("|").sort()).toEqual(PLATAFORMAS.map((p) => p.id).sort());
  });

  it("filtra uma plataforma e um gênero em filmes", () => {
    const u = new URL(urlDescobrir({ tipo: "filme", idioma: "zh", ordem: "nota", pagina: 1, genero: 35, plataforma: "119" }, "k"));
    expect(u.pathname).toBe("/3/discover/movie");
    expect(u.searchParams.get("with_watch_providers")).toBe("119");
    expect(u.searchParams.get("with_genres")).toBe("35");
    expect(u.searchParams.get("sort_by")).toBe("vote_average.desc");
  });
});
