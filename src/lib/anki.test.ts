import { csvAnki, csvAnkiIdioma } from "./anki";

const pares = [
  { termo: "firefly", traducao: "vaga-lume", classe: "substantivo", partes: "fogo + mosca" },
  { termo: "run", traducao: "correr", classe: "verbo" },
  { termo: 'say "hi"; bye', traducao: "dizer oi", classe: "expressao" },
  { termo: "sozinho", traducao: "" }, // incompleto: fica de fora
  { termo: "many", traducao: "muitos" }, // sem classe: só a tag de idioma/nível
];

describe("csv para o Anki", () => {
  it("frente em português: pt; estudado + partes; tags idioma::nível e classe", () => {
    const linhas = csvAnki(pares, { idioma: "en", nivel: 0, frente: "pt" }).split("\n");
    expect(linhas.slice(0, 3)).toEqual(["#separator:semicolon", "#html:true", "#tags column:3"]);
    expect(linhas.slice(3)).toEqual([
      "vaga-lume;firefly<br>(fogo + mosca);ingles::A2 substantivo",
      "correr;run;ingles::A2 verbo",
      'dizer oi;"say ""hi""; bye";ingles::A2 expressao',
      "muitos;many;ingles::A2",
    ]);
  });

  it("frente no idioma estudado inverte as duas primeiras colunas; mandarim usa HSK sem espaço", () => {
    const linhas = csvAnki([{ termo: "蝴蝶", traducao: "borboleta", classe: "substantivo" }], {
      idioma: "zh",
      nivel: 1,
      frente: "estudo",
    }).split("\n");
    expect(linhas[3]).toBe("蝴蝶;borboleta;mandarim::HSK4 substantivo");
  });
});

describe("baralho de um idioma", () => {
  it("junta os títulos do idioma, sem repetir termo (vale o mais recente), com o nível de cada título", () => {
    const { csv, total } = csvAnkiIdioma(
      [
        { idioma: "en", nivel: 0, atualizado: 1, vocabulario: [{ termo: "Run", traducao: "correr (antigo)" }] },
        {
          idioma: "en",
          nivel: 2,
          atualizado: 2,
          vocabulario: [
            { termo: "run", traducao: "correr" },
            { termo: "go", traducao: "" },
          ],
        },
        { idioma: "fr", nivel: 1, atualizado: 3, vocabulario: [{ termo: "chat", traducao: "gato" }] },
      ],
      "en",
      "estudo",
    );
    expect(total).toBe(1);
    expect(csv.split("\n").slice(3)).toEqual(["run;correr;ingles::C1"]);
  });
});
