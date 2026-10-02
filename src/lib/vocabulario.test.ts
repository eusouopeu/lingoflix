import { contarPalavras, limparPares, migrarNotas, textoExportacao } from "./vocabulario";

describe("vocabulário", () => {
  it("converte anotações em texto livre (versões anteriores) em pares", () => {
    expect(migrarNotas("Friend - Amigo\nClap = Aplaudir\n\nUseful → Útil\nsozinha")).toEqual([
      { termo: "Friend", traducao: "Amigo" },
      { termo: "Clap", traducao: "Aplaudir" },
      { termo: "Useful", traducao: "Útil" },
      { termo: "sozinha", traducao: "" },
    ]);
    expect(migrarNotas("")).toEqual([]);
  });

  it("descarta pares vazios, conta palavras e monta o texto de exportação", () => {
    const pares = limparPares([
      { termo: " Friend ", traducao: "Amigo " },
      { termo: "", traducao: "" },
      { termo: "Many", traducao: "" },
    ]);
    expect(pares).toEqual([
      { termo: "Friend", traducao: "Amigo" },
      { termo: "Many", traducao: "" },
    ]);
    expect(contarPalavras(pares)).toBe(2);
    expect(textoExportacao("Vingadores: Ultimato", pares)).toBe("Vingadores: Ultimato\n\nFriend — Amigo\nMany");
  });
});
