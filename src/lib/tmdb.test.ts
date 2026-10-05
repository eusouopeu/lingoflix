import { PLATAFORMAS } from "./catalogo";
import { filtrarBusca, urlBuscar, urlDescobrir } from "./tmdb";

describe("urlDescobrir", () => {
  it("monta busca de séries com idioma, página, ordem e todas as plataformas", () => {
    const u = new URL(
      urlDescobrir({ tipo: "serie", idioma: "es", ordem: "lancamento", pagina: 3, generos: [], plataformas: [] }, "k"),
    );
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
      urlDescobrir(
        { tipo: "filme", idioma: "zh", ordem: "nota", pagina: 1, generos: [35, 18], plataformas: ["119", "8"] },
        "k",
      ),
    );
    expect(u.pathname).toBe("/3/discover/movie");
    expect(u.searchParams.get("with_watch_providers")).toBe("119|8");
    expect(u.searchParams.get("with_genres")).toBe("35|18");
    expect(u.searchParams.get("sort_by")).toBe("vote_average.desc");
  });
});

describe("busca por nome", () => {
  it("monta a URL do search/multi com o texto e a página", () => {
    const u = new URL(urlBuscar("  amélie ", 2, "k"));
    expect(u.pathname).toBe("/3/search/multi");
    expect(u.searchParams.get("query")).toBe("amélie");
    expect(u.searchParams.get("page")).toBe("2");
  });

  it("fica só com filmes e séries de idiomas do app", () => {
    const base = { overview: "", poster_path: null, vote_average: 7, genre_ids: [35] };
    const r = filtrarBusca([
      { ...base, id: 1, media_type: "movie", title: "Amélie", original_language: "fr", release_date: "2001-04-25" },
      { ...base, id: 2, media_type: "tv", name: "Dark", original_language: "de", first_air_date: "2017-12-01" },
      { ...base, id: 3, media_type: "movie", title: "Parasita", original_language: "ko" },
      { ...base, id: 4, media_type: "person", name: "Alguém", original_language: "en" },
    ]);
    expect(r.map((t) => [t.id, t.tipo, t.ano])).toEqual([
      [1, "filme", 2001],
      [2, "serie", 2017],
    ]);
  });
});
