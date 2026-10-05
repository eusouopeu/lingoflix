import { describe, expect, it, vi } from "vitest";
import { escolherMotor, preencherPares } from "./tradutor";

describe("escolherMotor", () => {
  it("usa o preferido quando dá", () => {
    expect(escolherMotor("aparelho", true, true)).toBe("aparelho");
    expect(escolherMotor("claude", true, true)).toBe("claude");
  });
  it("cai para o outro", () => {
    expect(escolherMotor("aparelho", false, true)).toBe("claude"); // navegador
    expect(escolherMotor("claude", true, false)).toBe("aparelho"); // sem chave
  });
  it("nenhum disponível", () => {
    expect(escolherMotor("aparelho", false, false)).toBeNull();
  });
});

describe("preencherPares", () => {
  it("completa só o lado vazio, no sentido certo", async () => {
    const traduzir = vi.fn(async (texto: string, de: string, para: string) => `${texto}:${de}>${para}`);
    const r = await preencherPares(
      [
        { termo: "dog", traducao: "" },
        { termo: "", traducao: "gato" },
        { termo: "fish", traducao: "peixe", classe: "substantivo" },
      ],
      "en",
      traduzir,
    );
    expect(r).toEqual([
      { termo: "dog", traducao: "dog:en>pt" },
      { termo: "gato:pt>en", traducao: "gato" },
      { termo: "fish", traducao: "peixe", classe: "substantivo" },
    ]);
    expect(traduzir).toHaveBeenCalledTimes(2);
  });
});
