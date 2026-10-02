// Lista pessoal: "Quero ver" e "Já vi". Cada item guarda anotações de
// vocabulário (palavras e expressões aprendidas com o título).
import { FilmIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Cabecalho } from "../components/Cabecalho";
import { CartaoLista } from "../components/CartaoLista";
import { contarAjustes, PainelFiltros } from "../components/PainelFiltros";
import { ORDENS_LISTA } from "../lib/catalogo";
import { filtrarLista, type FiltrosLista } from "../lib/filtros";
import { useLista } from "../store/ListaContexto";
import type { Status } from "../store/lista";
import { Segmentado } from "../ui/Segmentado";

export function MinhaLista() {
  const { itens } = useLista();
  const [aba, setAba] = useState<Status>("quero");
  const [f, setF] = useState<FiltrosLista>({ tipo: null, idioma: null, nivel: null, generos: [], plataformas: [], ordem: "adicionado" });
  const [ajustes, setAjustes] = useState(false);
  const filtrados = filtrarLista(itens, f);
  const daAba = filtrados.filter((i) => i.status === aba);
  const filtrando = daAba.length < itens.filter((i) => i.status === aba).length;
  const conta = (s: Status) => filtrados.filter((i) => i.status === s).length;

  return (
    <>
      <Cabecalho
        titulo="Minha lista"
        ajustes={ajustes}
        onAjustes={() => setAjustes(!ajustes)}
        ajustesAtivos={contarAjustes(f, "adicionado")}
      >
          <Segmentado
            rotulo="Situação"
            valor={aba}
            onChange={setAba}
            opcoes={[
              { valor: "quero", nome: `Quero ver · ${conta("quero")}` },
              { valor: "visto", nome: `Já vi · ${conta("visto")}` },
            ]}
          />
          <PainelFiltros id="lista" valores={f} onChange={setF} ajustes={ajustes} ordens={ORDENS_LISTA} permiteTodos />
      </Cabecalho>
      <main className="mx-auto max-w-2xl px-4 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)]">
        {daAba.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-sub">
            <FilmIcon className="size-10" aria-hidden />
            <p>{filtrando ? "Nenhum título da lista com esses filtros." : aba === "quero" ? "Marque títulos com o marcador para vê-los aqui." : "Títulos marcados como vistos aparecem aqui."}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {daAba.map((i) => (
              <CartaoLista key={i.chave} item={i} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
