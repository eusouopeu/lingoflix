import { describe, expect, it } from "vitest";
import { chaveManual, episodioDoNome, montarLegenda, parear, type Arquivo } from "./importar";

describe("episodioDoNome", () => {
  it.each([
    ["Avatar.The.Last.Airbender.S03E05.WEB.srt", { temporada: 3, episodio: 5 }],
    ["avatar_s3_e12.srt", { temporada: 3, episodio: 12 }],
    ["Avatar 3x07 The Headband.srt", { temporada: 3, episodio: 7 }],
    ["降世神通 第3季第08集.srt", { temporada: 3, episodio: 8 }],
    ["降世神通 第9集.srt", { episodio: 9 }],
    ["Avatar - Episode 4.srt", { episodio: 4 }],
    ["E21.zh.srt", { episodio: 21 }],
  ])("%s", (nome, esperado) => expect(episodioDoNome(nome)).toEqual(esperado));

  it("sem pista no nome", () => {
    expect(episodioDoNome("legenda.srt")).toBeNull();
    expect(episodioDoNome("Avatar 720p x264.srt")).toBeNull();
  });
});

const arq = (nome: string): Arquivo => ({ nome, falas: [{ inicio: 0, fim: 1000, texto: nome }] });

describe("parear", () => {
  it("junta idioma estudado e português pelo episódio", () => {
    const r = parear([arq("S03E02.zh.srt"), arq("S03E01.zh.srt")], [arq("S03E01.pt.srt"), arq("S03E03.pt.srt")], 3);
    expect(r.pares.map((p) => [p.episodio, !!p.original, !!p.pt])).toEqual([
      [1, true, true],
      [2, true, false],
      [3, false, true],
    ]);
    expect(r.sem).toEqual([]);
  });

  it("nome só com o episódio usa a temporada escolhida", () => {
    const r = parear([arq("ep05.srt")], [], 3);
    expect(r.pares[0]).toMatchObject({ temporada: 3, episodio: 5 });
  });

  it("arquivo sem pista fica à parte até escolherem o episódio", () => {
    const solto = arq("legenda.srt");
    expect(parear([solto], [], 3).sem).toHaveLength(1);
    const r = parear([solto], [], 3, { [chaveManual("original", "legenda.srt")]: 7 });
    expect(r.sem).toEqual([]);
    expect(r.pares[0]).toMatchObject({ temporada: 3, episodio: 7 });
  });

  it("conta os arquivos repetidos do mesmo episódio", () => {
    const r = parear([arq("S03E01.a.srt"), arq("S03E01.b.srt")], [], 3);
    expect(r.repetidos).toBe(1);
    expect(r.pares[0].original?.nome).toBe("S03E01.a.srt");
  });
});

describe("montarLegenda", () => {
  const orig: Arquivo = { nome: "o.srt", falas: [{ inicio: 1000, fim: 3000, texto: "你好" }] };
  const pt: Arquivo = { nome: "p.srt", falas: [{ inicio: 1000, fim: 3000, texto: "Olá" }] };

  it("casa as falas e guarda o idioma", () => {
    const l = montarLegenda("serie-246-s3e1", "zh", orig, pt, null);
    expect(l).toMatchObject({
      idioma: "zh",
      casamento: ["Olá"],
      origem: { original: "o.srt", pt: "p.srt" },
      posicao: 0,
    });
  });

  it("sem português, só a original", () => {
    const l = montarLegenda("k", "zh", orig, null, null);
    expect(l.pt).toEqual([]);
    expect(l.casamento).toEqual([""]);
  });

  it("mantém a posição se a original é a mesma", () => {
    const antes = { ...montarLegenda("k", "zh", orig, pt, null), posicao: 5000 };
    expect(montarLegenda("k", "zh", orig, pt, antes).posicao).toBe(5000);
    expect(montarLegenda("k", "zh", { ...orig, nome: "outra.srt" }, pt, antes).posicao).toBe(0);
  });
});
