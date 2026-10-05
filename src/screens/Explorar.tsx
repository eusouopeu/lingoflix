// Aba Explorar: grade de títulos do TMDB. O filtro fica salvo nos ajustes
// (o app reabre onde parou). A lupa troca os filtros por uma busca por nome
// em todos os idiomas do app. Com a opção ligada, o nível vem do Claude.
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { Cabecalho } from "../components/Cabecalho";
import { CartaoEsqueleto, CartaoTitulo } from "../components/CartaoTitulo";
import { contarAjustes, PainelFiltros, type ValoresFiltro } from "../components/PainelFiltros";
import { ORDENS, type Ordem } from "../lib/catalogo";
import { buscarPagina, buscarPorNome, type Titulo } from "../lib/tmdb";
import { useAjustes, type FiltroExplorar } from "../store/ajustes";
import { useNiveisIA } from "../store/useNiveisIA";
import { BotaoIcone } from "../ui/BotaoIcone";

export const GRADE = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5";

const chaveTitulo = (t: Titulo) => `${t.tipo}-${t.id}`;

export function Explorar() {
  const { ajustes, pronto, mudar } = useAjustes();
  const f = ajustes.explorar;
  const setF = (v: ValoresFiltro<Ordem>) => mudar({ explorar: v as FiltroExplorar });
  const [painel, setPainel] = useState(false);

  // busca por nome: `texto` é o campo; `busca`, o texto firme (após a pausa)
  const [buscando, setBuscando] = useState(false);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setBusca(texto.trim().length >= 2 ? texto.trim() : ""), 400);
    return () => window.clearTimeout(id);
  }, [texto]);
  useEffect(() => {
    if (buscando) campo.current?.focus();
  }, [buscando]);

  const [itens, setItens] = useState<Titulo[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const comNivel = useNiveisIA(itens);

  // o nível filtra localmente; o resto refaz a busca a partir da página 1
  const chaveBusca = busca
    ? JSON.stringify(["nome", busca])
    : JSON.stringify([f.tipo, f.idioma, f.generos, f.plataformas, f.ordem]);

  useEffect(() => {
    setItens([]);
    setPagina(1);
  }, [chaveBusca]);

  useEffect(() => {
    // espera o filtro salvo: buscar com o padrão e logo depois com o salvo gastaria duas chamadas
    if (!pronto) return;
    // AbortController: resposta de um filtro antigo não sobrescreve a do novo.
    const ctl = new AbortController();
    setCarregando(true);
    setErro(null);
    const pedido = busca
      ? buscarPorNome(busca, pagina, ctl.signal)
      : buscarPagina(
          { tipo: f.tipo, idioma: f.idioma, ordem: f.ordem, pagina, generos: f.generos, plataformas: f.plataformas },
          ctl.signal,
        );
    pedido
      .then((r) => {
        setTotalPaginas(r.totalPaginas);
        setItens((xs) => {
          if (pagina === 1) return r.itens;
          const vistos = new Set(xs.map(chaveTitulo));
          return [...xs, ...r.itens.filter((x) => !vistos.has(chaveTitulo(x)))];
        });
        setCarregando(false);
      })
      .catch((e) => {
        if (ctl.signal.aborted) return;
        console.error(e);
        setErro("Não foi possível carregar. Verifique a conexão.");
        setCarregando(false);
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveBusca, pagina, pronto]);

  const titulos = itens.map(comNivel);
  // na busca por nome o filtro de nível fica escondido, então não se aplica
  const visiveis = busca || f.nivel === null ? titulos : titulos.filter((t) => t.nivel === f.nivel);

  const fecharBusca = () => {
    setBuscando(false);
    setTexto("");
    setBusca("");
  };

  return (
    <>
      <Cabecalho
        titulo="CineGlota"
        ajustes={buscando ? undefined : painel}
        onAjustes={buscando ? undefined : () => setPainel(!painel)}
        ajustesAtivos={contarAjustes(f, "popularidade")}
        acoes={
          <BotaoIcone
            icone={buscando ? XMarkIcon : MagnifyingGlassIcon}
            rotulo={buscando ? "Fechar busca" : "Buscar por nome"}
            onClick={buscando ? fecharBusca : () => setBuscando(true)}
          />
        }
      >
        {buscando ? (
          <div className="flex animate-surge flex-col gap-1.5">
            <input
              ref={campo}
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && fecharBusca()}
              aria-label="Nome do filme ou série"
              placeholder="Nome do filme ou série"
              enterKeyHint="search"
              className="h-11 w-full rounded-app-sm bg-card-2 px-3 text-base text-ink placeholder:text-sub"
            />
            <p className="px-1 text-xs text-sub">Em português ou no título original, em todos os idiomas do app.</p>
          </div>
        ) : (
          <PainelFiltros
            id="explorar"
            valores={f}
            onChange={setF}
            ajustes={painel}
            ordens={ORDENS}
            permiteTodos={false}
          />
        )}
      </Cabecalho>

      <main className="mx-auto max-w-5xl px-4 pt-2 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)]">
        {buscando && !busca ? (
          <p className="py-16 text-center text-sub">Digite pelo menos 2 letras.</p>
        ) : erro ? (
          <p role="alert" className="py-20 text-center text-erro">
            {erro}
          </p>
        ) : (
          <div className={GRADE} aria-busy={carregando}>
            {visiveis.map((t) => (
              <CartaoTitulo key={chaveTitulo(t)} t={t} />
            ))}
            {carregando && Array.from({ length: pagina === 1 ? 6 : 4 }, (_, i) => <CartaoEsqueleto key={i} />)}
          </div>
        )}

        {!carregando && !erro && visiveis.length === 0 && (!buscando || busca) && (
          <p className="py-16 text-center text-sub">
            {busca
              ? "Nenhum filme ou série com esse nome nos idiomas do app."
              : itens.length > 0
                ? "Nenhum título deste nível nas páginas carregadas."
                : "Nada encontrado com esses filtros."}
          </p>
        )}

        {!carregando && !erro && pagina < totalPaginas && (!buscando || busca) && (
          <button
            type="button"
            onClick={() => setPagina((p) => p + 1)}
            className="mx-auto mt-8 flex h-12 w-full max-w-xs cursor-pointer items-center justify-center rounded-app bg-caneta text-base font-semibold text-on-caneta transition-transform duration-150 active:scale-[0.98]"
          >
            Carregar mais
          </button>
        )}
      </main>
    </>
  );
}
