import { describe, expect, it } from "vitest";
import {
  casarPorTempo,
  decodificarTexto,
  dividirPalavras,
  estimarDeslocamento,
  falaEm,
  formatarTempo,
  lerSrt,
  lerTempo,
  type Fala,
} from "./legenda";

const SRT =
  "﻿2\r\n00:00:05,000 --> 00:00:07,500\r\n<i>Second</i> line\r\n\r\n1\r\n00:00:01,000 --> 00:00:03,000\r\n{\\an8}Hello,\r\nworld!\r\n\r\nlixo sem tempo\r\n\r\n3\r\n00:01:00,000 --> 00:01:02,000\r\n\r\n";

describe("lerSrt", () => {
  it("lê blocos, limpa tags, junta linhas e ordena", () => {
    expect(lerSrt(SRT)).toEqual([
      { inicio: 1000, fim: 3000, texto: "Hello, world!" },
      { inicio: 5000, fim: 7500, texto: "Second line" },
    ]);
  });
  it("aceita WebVTT", () => {
    const vtt = "WEBVTT\n\n00:01.000 --> 00:02.500 align:start\nOi\n\n01:00:00.000 --> 01:00:01.000\nTchau";
    expect(lerSrt(vtt)).toEqual([
      { inicio: 1000, fim: 2500, texto: "Oi" },
      { inicio: 3600000, fim: 3601000, texto: "Tchau" },
    ]);
  });
});

const f = (inicio: number, fim: number, texto = ""): Fala => ({ inicio, fim, texto });

describe("falaEm", () => {
  const falas = [f(1000, 2000), f(3000, 4000), f(5000, 6000)];
  it("antes da primeira", () => expect(falaEm(falas, 500)).toBe(-1));
  it("dentro de uma fala", () => expect(falaEm(falas, 3500)).toBe(1));
  it("no intervalo fica com a anterior", () => expect(falaEm(falas, 4500)).toBe(1));
  it("depois da última", () => expect(falaEm(falas, 99999)).toBe(2));
  it("lista vazia", () => expect(falaEm([], 10)).toBe(-1));
});

describe("estimarDeslocamento", () => {
  it("recupera um atraso artificial", () => {
    const orig: Fala[] = [];
    let t = 0;
    for (let i = 0; i < 60; i++) {
      const dur = 1200 + ((i * 737) % 1800);
      orig.push(f(t, t + dur));
      t += dur + 300 + ((i * 311) % 2500);
    }
    const pt = orig.map((x) => f(x.inicio + 2300, x.fim + 2300));
    expect(Math.abs(estimarDeslocamento(orig, pt) - -2300)).toBeLessThanOrEqual(100);
  });
});

describe("casarPorTempo", () => {
  it("junta, divide e deixa vazio", () => {
    const orig = [f(0, 4000, "a"), f(5000, 6000, "b"), f(6000, 7000, "c"), f(20000, 21000, "d")];
    const pt = [f(0, 2000, "A1"), f(2000, 4000, "A2"), f(5000, 6800, "BC")];
    expect(casarPorTempo(orig, pt, 0)).toEqual(["A1 A2", "BC", "", ""]);
  });
  it("aplica o deslocamento", () => {
    expect(casarPorTempo([f(0, 1000, "a")], [f(3000, 4000, "A")], -3000)).toEqual(["A"]);
  });
});

describe("dividirPalavras", () => {
  it("separa palavras e pontuação, mantendo apóstrofos", () => {
    expect(dividirPalavras("Don't go, Anna!", "en")).toEqual([
      { texto: "Don't", palavra: true },
      { texto: " ", palavra: false },
      { texto: "go", palavra: true },
      { texto: ", ", palavra: false },
      { texto: "Anna", palavra: true },
      { texto: "!", palavra: false },
    ]);
  });
  it("chinês: um caractere por token", () => {
    expect(dividirPalavras("你好。", "zh")).toEqual([
      { texto: "你", palavra: true },
      { texto: "好", palavra: true },
      { texto: "。", palavra: false },
    ]);
  });
});

describe("tempo", () => {
  it("formata", () => {
    expect(formatarTempo(125000)).toBe("2:05");
    expect(formatarTempo(3735000)).toBe("1:02:15");
  });
  it("lê", () => {
    expect(lerTempo("1:02:15")).toBe(3735000);
    expect(lerTempo("62:15")).toBe(3735000);
    expect(lerTempo("75")).toBe(4500000);
    expect(lerTempo("abc")).toBeNull();
  });
});

describe("decodificarTexto", () => {
  it("UTF-8 e Windows-1252", () => {
    expect(decodificarTexto(new TextEncoder().encode("ação").buffer)).toBe("ação");
    expect(decodificarTexto(new Uint8Array([0x61, 0xe7, 0xe3, 0x6f]).buffer)).toBe("ação");
  });
});
