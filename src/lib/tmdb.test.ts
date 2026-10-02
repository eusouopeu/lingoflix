import { PLATAFORMAS } from "./catalogo";
import { urlDescobrir } from "./tmdb";

describe("urlDescobrir", () => {
  it("monta busca de séries com idioma, página, ordem e todas as plataformas", () => {
    const u = new URL(urlDescobrir({ tipo: "serie", idioma: "es", ordem: "lancamento", pagina: 3, generos: [], plataformas: [] }, "k"));
    expect(u.pathname).toBe("/3/discover/tv");
    expect(u.searchParams.get("with_original_language")).toBe("es");
    expect(u.searchParams.get("page")).toBe("3");
    expect(u.searchParams.get("sort_by")).toBe("first_air_date.desc");
    expect(u.searchParams.get("watch_region")).toBe("BR");
    expect(u.searchParams.get("with_watch_providers")!.split("|").sort()).toEqual(PLATAFORMAS.map((p) => p.id).sort());
    expect(u.searchParams.has("with_genres")).toBe(false);
  });

  it("vários gêneros e plataformas viram OU (|) em filmes", () => {
    const u = new URL(
      urlDescobrir({ tipo: "filme", idioma: "zh", ordem: "nota", pagina: 1, generos: [35, 18], plataformas: ["119", "8"] }, "k")
    );
    expect(u.pathname).toBe("/3/discover/movie");
    expect(u.searchParams.get("with_watch_providers")).toBe("119|8");
    expect(u.searchParams.get("with_genres")).toBe("35|18");
    expect(u.searchParams.get("sort_by")).toBe("vote_average.desc");
  });
});
