import type { ItemLista } from "../store/lista";
import { filtrarLista } from "./filtros";

const item = (p: Partial<ItemLista>): ItemLista => ({
  chave: `filme-${p.id}`,
  id: 0,
  tipo: "filme",
  titulo: "T",
  tituloOriginal: "O",
  poster: null,
  idioma: "fr",
  nivel: 1,
  status: "quero",
  vocabulario: [],
  atualizado: 0,
  generos: [],
  plataformas: [],
  nota: 7,
  ano: 2000,
  sinopse: "",
  ...p,
});

const itens = [
  item({ id: 1, idioma: "fr", generos: [35], plataformas: ["8"], nota: 6, ano: 2020, atualizado: 3 }),
  item({
    id: 2,
    idioma: "fr",
    tipo: "serie",
    chave: "serie-2",
    generos: [18],
    plataformas: ["119"],
    nota: 9,
    ano: 2010,
    atualizado: 2,
  }),
  item({
    id: 3,
    idioma: "zh",
    nivel: 2,
    generos: [18, 35],
    plataformas: ["8", "350"],
    nota: 8,
    ano: 2024,
    atualizado: 1,
  }),
];
const vazio = { tipo: null, idioma: null, nivel: null, generos: [], plataformas: [], ordem: "adicionado" as const };
const ids = (xs: ItemLista[]) => xs.map((x) => x.id);

describe("filtrarLista", () => {
  it("combina tipo, idioma, nível, gêneros (OU) e streaming (OU)", () => {
    expect(ids(filtrarLista(itens, vazio))).toEqual([1, 2, 3]);
    expect(ids(filtrarLista(itens, { ...vazio, tipo: "serie" }))).toEqual([2]);
    expect(ids(filtrarLista(itens, { ...vazio, idioma: "fr", nivel: 1 }))).toEqual([1, 2]);
    expect(ids(filtrarLista(itens, { ...vazio, generos: [35] }))).toEqual([1, 3]);
    expect(ids(filtrarLista(itens, { ...vazio, plataformas: ["119", "350"] }))).toEqual([2, 3]);
    expect(ids(filtrarLista(itens, { ...vazio, generos: [18], plataformas: ["8"] }))).toEqual([3]);
  });

  it("ordena por nota ou lançamento", () => {
    expect(ids(filtrarLista(itens, { ...vazio, ordem: "nota" }))).toEqual([2, 3, 1]);
    expect(ids(filtrarLista(itens, { ...vazio, ordem: "lancamento" }))).toEqual([3, 1, 2]);
  });
});
