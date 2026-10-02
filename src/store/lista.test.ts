import { criarListaWeb, type ItemLista } from "./lista";

const item = (id: number, status: ItemLista["status"]): ItemLista => ({
  chave: `filme-${id}`,
  id,
  tipo: "filme",
  titulo: "T",
  tituloOriginal: "O",
  poster: null,
  idioma: "fr",
  nivel: 1,
  status,
  notas: "",
  atualizado: id,
});

describe("lista pessoal (web)", () => {
  beforeEach(() => localStorage.clear());

  it("salva, atualiza status/notas e remove, persistindo entre instâncias", async () => {
    const a = criarListaWeb();
    await a.salvar(item(1, "quero"));
    await a.salvar(item(2, "quero"));
    await a.salvar({ ...item(1, "visto"), notas: "bonjour" });
    const b = criarListaWeb();
    const todos = await b.todos();
    expect(todos).toHaveLength(2);
    expect(todos.find((i) => i.id === 1)).toMatchObject({ status: "visto", notas: "bonjour" });
    await b.remover("filme-2");
    expect((await criarListaWeb().todos()).map((i) => i.id)).toEqual([1]);
  });
});
