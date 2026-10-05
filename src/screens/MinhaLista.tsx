// Lista pessoal: "Quero ver" e "Já vi". Cada item guarda anotações de
// vocabulário (palavras e expressões aprendidas com o título).
import { FilmIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Cabecalho } from "../components/Cabecalho";
import { CartaoLista } from "../components/CartaoLista";
import { SeletorEpisodio } from "../components/SeletorEpisodio";
import { contarAjustes, PainelFiltros } from "../components/PainelFiltros";
import { ORDENS_LISTA } from "../lib/catalogo";
import { filtrarLista, type FiltrosLista } from "../lib/filtros";
import { useLista } from "../store/ListaContexto";
import { paraTitulo, type Status } from "../store/lista";
import { useNiveisIA } from "../store/useNiveisIA";
import { Segmentado } from "../ui/Segmentado";
import { Legendas } from "./Legendas";
import { Vocabulario } from "./Vocabulario";

export function MinhaLista() {
  const { itens: salvos } = useLista();
  // com a opção ligada, o nível do Claude vale também para filtrar a lista
  const comNivel = useNiveisIA(salvos.map(paraTitulo));
  const ia = new Set<string>();
  const itens = salvos.map((i) => {
    const t = comNivel(paraTitulo(i));
    if (!t.nivelIA) return i;
    ia.add(i.chave);
    return { ...i, nivel: t.nivel };
  });
  const [aba, setAba] = useState<Status>("quero");
  const [f, setF] = useState<FiltrosLista>({
    tipo: null,
    idioma: null,
    nivel: null,
    generos: [],
    plataformas: [],
    ordem: "adicionado",
  });
  const [ajustes, setAjustes] = useState(false);
  // tela do vocabulário aberta: título atual e a ordem da lista ao abrir
  const [vocab, setVocab] = useState<{ chave: string; ordem: string[] } | null>(null);
  // legendas: série escolhe o episódio antes (`episodio` vazio = no seletor)
  const [legendas, setLegendas] = useState<{ chave: string; temporada?: number; episodio?: number } | null>(null);
  const daSerie = legendas && salvos.find((i) => i.chave === legendas.chave)?.tipo === "serie";
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
            <p>
              {filtrando
                ? "Nenhum título da lista com esses filtros."
                : aba === "quero"
                  ? "Marque títulos com o marcador para vê-los aqui."
                  : "Títulos marcados como vistos aparecem aqui."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {daAba.map((i) => (
              <CartaoLista
                key={i.chave}
                item={i}
                nivelIA={ia.has(i.chave)}
                onVocabulario={() => setVocab({ chave: i.chave, ordem: daAba.map((x) => x.chave) })}
                onLegendas={() => setLegendas({ chave: i.chave })}
              />
            ))}
          </ul>
        )}
      </main>
      {legendas && daSerie && legendas.episodio == null && (
        <SeletorEpisodio
          item={salvos.find((i) => i.chave === legendas.chave)!}
          onEscolher={(temporada, episodio) => setLegendas({ ...legendas, temporada, episodio })}
          onFechar={() => setLegendas(null)}
        />
      )}
      {legendas && (!daSerie || legendas.episodio != null) && (
        <Legendas
          chaveTitulo={legendas.chave}
          temporada={legendas.temporada}
          episodio={legendas.episodio}
          onFechar={() => setLegendas(null)}
        />
      )}
      {vocab && (
        <Vocabulario
          chave={vocab.chave}
          ordem={vocab.ordem}
          onTrocar={(chave) => setVocab({ ...vocab, chave })}
          onFechar={() => setVocab(null)}
        />
      )}
    </>
  );
}
