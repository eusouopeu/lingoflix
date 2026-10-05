import { describe, expect, it } from "vitest";
import { erroPorStatus, escolher, opcoesDe, urlBusca, type Opcao } from "./opensubtitles";

describe("urlBusca", () => {
  it("filme pelo id do TMDB, parâmetros em ordem alfabética", () => {
    expect(urlBusca({ tipo: "filme", id: 550 }, ["pt-br", "en"])).toBe(
      "https://api.opensubtitles.com/api/v1/subtitles?languages=en%2Cpt-br&order_by=download_count&tmdb_id=550",
    );
  });
  it("episódio pela série, temporada e episódio", () => {
    expect(urlBusca({ tipo: "serie", id: 1396, temporada: 2, episodio: 3 }, ["en"])).toBe(
      "https://api.opensubtitles.com/api/v1/subtitles?episode_number=3&languages=en&order_by=download_count&parent_tmdb_id=1396&season_number=2",
    );
  });
});

const op = (fileId: number, idioma: string, downloads: number): Opcao => ({ fileId, idioma, nome: "", downloads });

describe("escolher", () => {
  it("fica com a mais baixada do idioma", () => {
    expect(escolher([op(1, "en", 10), op(2, "en", 50), op(3, "pt-br", 99)], "en")?.fileId).toBe(2);
  });
  it("pt-br cai para pt", () => {
    expect(escolher([op(1, "pt-pt", 10), op(2, "en", 50)], "pt-br")?.fileId).toBe(1);
    expect(escolher([op(1, "en", 10)], "pt-br")).toBeNull();
  });
});

describe("opcoesDe", () => {
  it("lê a resposta da busca", () => {
    const r = {
      data: [
        { attributes: { language: "en", download_count: 7, release: "Rel", files: [{ file_id: 9 }] } },
        { attributes: { language: "en", download_count: 1, release: "Sem arquivo", files: [] } },
      ],
    };
    expect(opcoesDe(r)).toEqual([{ fileId: 9, idioma: "en", nome: "Rel", downloads: 7 }]);
  });
});

describe("erroPorStatus", () => {
  it("classifica", () => {
    expect(erroPorStatus(401).tipo).toBe("chave");
    expect(erroPorStatus(403).tipo).toBe("chave");
    expect(erroPorStatus(406).tipo).toBe("limite");
    expect(erroPorStatus(429).tipo).toBe("limite");
    expect(erroPorStatus(500).tipo).toBe("conexao");
  });
});
