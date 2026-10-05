import { describe, expect, it } from "vitest";
import { janelas } from "./claude";
import type { Fala } from "./legenda";

const f = (inicio: number, fim: number): Fala => ({ inicio, fim, texto: "" });

describe("janelas", () => {
  it("divide a original em blocos e leva as falas em PT da mesma faixa", () => {
    const orig = Array.from({ length: 5 }, (_, i) => f(i * 10000, i * 10000 + 2000));
    const pt = [f(0, 1000), f(21000, 22000), f(34000, 36000), f(60000, 61000)];
    const js = janelas(orig, pt, 2);
    expect(js.map((j) => j.inicio)).toEqual([0, 2, 4]);
    expect(js.map((j) => j.orig.length)).toEqual([2, 2, 1]);
    // bloco 0: 0–12 s (+5 s de margem) → PT 0; bloco 1: 20–32 s ±5 → PT 1 e 2; bloco 2: 40–42 s ±5 → PT 2
    expect(js.map((j) => j.pt.map((p) => p.i))).toEqual([[0], [1, 2], [2]]);
  });
});
