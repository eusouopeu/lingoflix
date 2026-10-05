import type { ItemLista } from "../store/lista";
import { gerarBackup, itensParaRestaurar, juntarDias, lerBackup } from "./backup";

const item = (chave: string, atualizado: number): ItemLista => ({
  chave,
  id: 1,
  tipo: "filme",
  titulo: "T",
  tituloOriginal: "O",
  poster: null,
  idioma: "fr",
  nivel: 1,
  status: "visto",
  vocabulario: [
    {
      termo: "chat",
      traducao: "gato",
      revisao: { repeticoes: 1, intervalo: 1, facilidade: 2.5, proxima: "2026-10-03" },
    },
  ],
  atualizado,
  generos: [35],
  plataformas: ["8"],
  nota: 7,
  ano: 2001,
  sinopse: "",
});

describe("backup", () => {
  it("ida e volta preserva lista, vocabulário, revisões e dias de estudo", () => {
    const texto = gerarBackup([item("filme-1", 5)], ["2026-10-01"]);
    expect(texto).not.toContain("chaveClaude");
    const b = lerBackup(texto);
    expect(b.lista).toEqual([item("filme-1", 5)]);
    expect(b.diasEstudo).toEqual(["2026-10-01"]);
  });

  it("recusa arquivo que não é backup", () => {
    expect(() => lerBackup("não é json")).toThrow(/backup do CineGlota/);
    expect(() => lerBackup(JSON.stringify({ app: "outro", lista: [] }))).toThrow(/backup do CineGlota/);
  });

  it("restaura só itens novos ou mais recentes; junta dias sem repetir", () => {
    const atuais = [item("filme-1", 10), item("filme-2", 10)];
    const backup = [item("filme-1", 5), item("filme-2", 20), item("filme-3", 1)];
    expect(itensParaRestaurar(atuais, backup).map((i) => i.chave)).toEqual(["filme-2", "filme-3"]);
    expect(juntarDias(["2026-10-02", "2026-10-01"], ["2026-10-01"])).toEqual(["2026-10-01", "2026-10-02"]);
  });
});
