import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { AdjustmentsHorizontalIcon as AjustesSolido } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { CartaoEsqueleto, CartaoTitulo } from "../components/CartaoTitulo";
import { GENEROS, IDIOMAS, ORDENS, PLATAFORMAS, type Ordem, type Tipo } from "../lib/catalogo";
import { rotuloNivel, type Nivel } from "../lib/nivel";
import { buscarPagina, type Titulo } from "../lib/tmdb";
import { Ajuda } from "../ui/Ajuda";
import { BotaoIcone } from "../ui/BotaoIcone";
import { Chip } from "../ui/Chip";
import { Segmentado } from "../ui/Segmentado";
import { Selecao } from "../ui/Selecao";

const TIPOS: { valor: Tipo; nome: string }[] = [
  { valor: "filme", nome: "Filmes" },
  { valor: "serie", nome: "Séries" },
];

const GRADE = "grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

export function Explorar() {
  const [tipo, setTipo] = useState<Tipo>("filme");
  const [idioma, setIdioma] = useState("en");
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [genero, setGenero] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("popularidade");
  const [ajustes, setAjustes] = useState(false);

  const [itens, setItens] = useState<Titulo[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtro novo recomeça da página 1.
  useEffect(() => {
    setItens([]);
    setPagina(1);
  }, [tipo, idioma, genero, plataforma, ordem]);

  useEffect(() => {
    // AbortController: resposta de um filtro antigo não sobrescreve a do novo.
    const ctl = new AbortController();
    setCarregando(true);
    setErro(null);
    buscarPagina(
      { tipo, idioma, ordem, pagina, genero: genero ? Number(genero) : undefined, plataforma: plataforma || undefined },
      ctl.signal
    )
      .then((r) => {
        setTotalPaginas(r.totalPaginas);
        setItens((xs) => {
          const vistos = new Set(xs.map((x) => x.id));
          return [...(pagina === 1 ? [] : xs), ...r.itens.filter((x) => pagina === 1 || !vistos.has(x.id))];
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
  }, [tipo, idioma, genero, plataforma, ordem, pagina]);

  const visiveis = nivel === null ? itens : itens.filter((t) => t.nivel === nivel);
  const ajustesAtivos = [genero, plataforma, ordem !== "popularidade"].filter(Boolean).length;
  const temMais = pagina < totalPaginas;

  return (
    <>
      <header className="sticky top-0 z-10 bg-card-blur pt-[var(--safe-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 pt-3 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">CineGlota</h1>
            <span className="relative">
              <BotaoIcone
                icone={AdjustmentsHorizontalIcon}
                iconeAtivo={AjustesSolido}
                ativo={ajustes}
                rotulo="Gênero, streaming e ordem"
                onClick={() => setAjustes(!ajustes)}
              />
              {ajustesAtivos > 0 && (
                <span className="pointer-events-none absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-caneta text-[10px] font-bold text-on-caneta">
                  {ajustesAtivos}
                </span>
              )}
            </span>
          </div>

          {ajustes && (
            <div className="flex animate-surge flex-wrap gap-3">
              <Selecao
                rotulo="Gênero"
                valor={genero}
                onChange={setGenero}
                opcoes={[{ valor: "", nome: "Todos" }, ...GENEROS[tipo].map((g) => ({ valor: String(g.id), nome: g.nome }))]}
              />
              <Selecao
                rotulo="Streaming"
                valor={plataforma}
                onChange={setPlataforma}
                opcoes={[{ valor: "", nome: "Todos" }, ...PLATAFORMAS.map((p) => ({ valor: p.id, nome: p.nome }))]}
              />
              <Selecao rotulo="Ordem" valor={ordem} onChange={(v) => setOrdem(v as Ordem)} opcoes={ORDENS} />
            </div>
          )}

          <Segmentado
            rotulo="Tipo"
            opcoes={TIPOS}
            valor={tipo}
            onChange={(v) => {
              setTipo(v);
              setGenero("");
            }}
          />

          <div role="group" aria-label="Idioma" className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4">
            {IDIOMAS.map((l) => (
              <Chip key={l.codigo} ativo={idioma === l.codigo} rotulo={l.nome} onClick={() => setIdioma(l.codigo)}>
                {l.codigo.toUpperCase()}
              </Chip>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div role="group" aria-label="Nível" className="sem-barra -ml-4 flex flex-1 gap-2 overflow-x-auto pl-4">
              <Chip ativo={nivel === null} onClick={() => setNivel(null)}>
                Todos
              </Chip>
              {([0, 1, 2] as Nivel[]).map((n) => (
                <Chip key={n} ativo={nivel === n} onClick={() => setNivel(nivel === n ? null : n)}>
                  {rotuloNivel(n, idioma)}
                </Chip>
              ))}
            </div>
            <Ajuda rotulo="Sobre o nível">
              Nível estimado pelo gênero e pela época do título: animação e família tendem a ter fala simples; drama,
              história e crime concentram vocabulário denso. {idioma === "zh" ? "Mandarim usa a escala HSK." : "Escala QECR."}
            </Ajuda>
          </div>
        </div>
      </header>

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
            {carregando && Array.from({ length: pagina === 1 ? 10 : 4 }, (_, i) => <CartaoEsqueleto key={i} />)}
          </div>
        )}

        {!carregando && !erro && visiveis.length === 0 && (
          <p className="py-16 text-center text-sub">
            {itens.length > 0 ? "Nenhum título deste nível nas páginas carregadas." : "Nada encontrado com esses filtros."}
          </p>
        )}

        {!carregando && !erro && temMais && (
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
