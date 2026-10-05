import type { ItemLista } from "../store/lista";
import { progressoPorIdioma, sequencia } from "./progresso";

const item = (m: Partial<ItemLista>): ItemLista => ({
  chave: `filme-${Math.random()}`,
  id: 1,
  tipo: "filme",
  titulo: "T",
  tituloOriginal: "O",
  poster: null,
  idioma: "en",
  nivel: 1,
  status: "visto",
  vocabulario: [],
  atualizado: 1,
  generos: [],
  plataformas: [],
  nota: 0,
  ano: null,
  sinopse: "",
  ...m,
});

const maduro = { repeticoes: 4, intervalo: 30, facilidade: 2.5, proxima: "2026-11-01" };

describe("progresso", () => {
  it("conta palavras completas, aprendidas e títulos por nível, por idioma", () => {
    const p = progressoPorIdioma([
      item({
        nivel: 0,
        vocabulario: [
          { termo: "run", traducao: "correr", revisao: maduro },
          { termo: "go", traducao: "ir" },
          { termo: "sozinho", traducao: "" },
        ],
      }),
      item({ nivel: 2 }),
      item({ status: "quero" }),
      item({ idioma: "fr", vocabulario: [{ termo: "chat", traducao: "gato" }] }),
    ]);
    expect(p.map((x) => x.idioma)).toEqual(["en", "fr"]);
    expect(p[0]).toEqual({ idioma: "en", palavras: 2, aprendidas: 1, vistos: [1, 0, 1], quero: 1 });
  });

  it("sequência de dias: conta até hoje, ou até ontem se hoje ainda não estudou", () => {
    const dias = ["2026-09-29", "2026-09-30", "2026-10-01"];
    expect(sequencia(dias, "2026-10-01")).toBe(3);
    expect(sequencia(dias, "2026-10-02")).toBe(3);
    expect(sequencia(dias, "2026-10-03")).toBe(0);
    expect(sequencia([], "2026-10-03")).toBe(0);
  });
});
