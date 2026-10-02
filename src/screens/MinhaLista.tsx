// Lista pessoal: "Quero ver" e "Já vi". Cada item guarda anotações de
// vocabulário (palavras e expressões aprendidas com o título).
import { FilmIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PencilSquareIcon as PencilSolido } from "@heroicons/react/24/solid";
import { useState } from "react";
import { Cabecalho } from "../components/Cabecalho";
import { CartaoTitulo } from "../components/CartaoTitulo";
import { contarAjustes, PainelFiltros } from "../components/PainelFiltros";
import { ORDENS_LISTA } from "../lib/catalogo";
import { filtrarLista, type FiltrosLista } from "../lib/filtros";
import { useLista } from "../store/ListaContexto";
import { paraTitulo, type ItemLista, type Status } from "../store/lista";
import { BotaoIcone } from "../ui/BotaoIcone";
import { Segmentado } from "../ui/Segmentado";
import { GRADE } from "./Explorar";

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
      <main className="mx-auto max-w-5xl px-4 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)]">
        {daAba.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-sub">
            <FilmIcon className="size-10" aria-hidden />
            <p>{filtrando ? "Nenhum título da lista com esses filtros." : aba === "quero" ? "Marque títulos com o marcador para vê-los aqui." : "Títulos marcados como vistos aparecem aqui."}</p>
          </div>
        ) : (
          <ul className={`${GRADE} items-start`}>
            {daAba.map((i) => (
              <Cartao key={i.chave} item={i} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

// Mesmo cartão do Explorar (virar, nota, trailer, streamings, quero/já vi),
// com anotações de vocabulário e remover a mais.
function Cartao({ item }: { item: ItemLista }) {
  const lista = useLista();
  const [notasAbertas, setNotasAbertas] = useState(false);
  const [notas, setNotas] = useState(item.notas);

  return (
    <li className="animate-surge">
      <CartaoTitulo
        t={paraTitulo(item)}
        extras={
          <>
            <BotaoIcone
              icone={PencilSquareIcon}
              iconeAtivo={PencilSolido}
              ativo={notasAbertas || item.notas.length > 0}
              rotulo="Anotações de vocabulário"
              onClick={() => setNotasAbertas(!notasAbertas)}
              className="size-9"
            />
            <BotaoIcone
              icone={TrashIcon}
              rotulo="Remover da lista"
              onClick={() => lista.remover(item.chave)}
              className="-mr-2 ml-auto size-9"
            />
          </>
        }
        abaixo={
          notasAbertas && (
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              onBlur={() => notas !== item.notas && lista.atualizar(item, { notas })}
              rows={4}
              aria-label="Anotações de vocabulário"
              placeholder="Palavras e expressões…"
              lang={item.idioma}
              className="mt-1 mb-1 w-full animate-surge resize-y rounded-app-sm bg-cartao-verso p-2 text-sm text-ink placeholder:text-sub"
            />
          )
        }
      />
    </li>
  );
}
