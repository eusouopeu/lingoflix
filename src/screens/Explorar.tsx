import { useEffect, useState } from "react";
import { Cabecalho } from "../components/Cabecalho";
import { CartaoEsqueleto, CartaoTitulo } from "../components/CartaoTitulo";
import { contarAjustes, PainelFiltros, type ValoresFiltro } from "../components/PainelFiltros";
import { ORDENS, type Ordem } from "../lib/catalogo";
import { buscarPagina, type Titulo } from "../lib/tmdb";

export const GRADE = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5";

export function Explorar() {
  const [f, setF] = useState<ValoresFiltro<Ordem>>({
    tipo: "filme",
    idioma: "en",
    nivel: null,
    generos: [],
    plataformas: [],
    ordem: "popularidade",
  });
  const [ajustes, setAjustes] = useState(false);

  const [itens, setItens] = useState<Titulo[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // o nível filtra localmente; o resto refaz a busca a partir da página 1
  const chaveBusca = JSON.stringify([f.tipo, f.idioma, f.generos, f.plataformas, f.ordem]);

  useEffect(() => {
    setItens([]);
    setPagina(1);
  }, [chaveBusca]);

  useEffect(() => {
    // AbortController: resposta de um filtro antigo não sobrescreve a do novo.
    const ctl = new AbortController();
    setCarregando(true);
    setErro(null);
    buscarPagina(
      { tipo: f.tipo!, idioma: f.idioma!, ordem: f.ordem, pagina, generos: f.generos, plataformas: f.plataformas },
      ctl.signal,
    )
      .then((r) => {
        setTotalPaginas(r.totalPaginas);
        setItens((xs) => {
          if (pagina === 1) return r.itens;
          const vistos = new Set(xs.map((x) => x.id));
          return [...xs, ...r.itens.filter((x) => !vistos.has(x.id))];
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
  }, [chaveBusca, pagina]);

  const visiveis = f.nivel === null ? itens : itens.filter((t) => t.nivel === f.nivel);

  return (
    <>
      <Cabecalho
        titulo="CineGlota"
        ajustes={ajustes}
        onAjustes={() => setAjustes(!ajustes)}
        ajustesAtivos={contarAjustes(f, "popularidade")}
      >
        <PainelFiltros
          id="explorar"
          valores={f}
          onChange={setF}
          ajustes={ajustes}
          ordens={ORDENS}
          permiteTodos={false}
        />
      </Cabecalho>

      <main className="mx-auto max-w-5xl px-4 pt-2 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)]">
        {erro ? (
          <p role="alert" className="py-20 text-center text-erro">
            {erro}
          </p>
        ) : (
          <div className={GRADE} aria-busy={carregando}>
            {visiveis.map((t) => (
              <CartaoTitulo key={`${t.tipo}-${t.id}`} t={t} />
            ))}
            {carregando && Array.from({ length: pagina === 1 ? 6 : 4 }, (_, i) => <CartaoEsqueleto key={i} />)}
          </div>
        )}

        {!carregando && !erro && visiveis.length === 0 && (
          <p className="py-16 text-center text-sub">
            {itens.length > 0
              ? "Nenhum título deste nível nas páginas carregadas."
              : "Nada encontrado com esses filtros."}
          </p>
        )}

        {!carregando && !erro && pagina < totalPaginas && (
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
