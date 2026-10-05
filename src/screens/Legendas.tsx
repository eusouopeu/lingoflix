// Tela Legendas: legenda original e em português do filme/episódio que passa
// na TV, para acompanhar pelo celular. Slider e lista para ir a qualquer fala,
// modo "acompanhar" (relógio que anda junto com o filme), toque nas palavras
// para ver o significado e salvar no vocabulário. Cobre a tela inteira e
// fecha com o voltar do Android, como a tela do vocabulário.
import { AdjustmentsHorizontalIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";
import { BackwardIcon, ForwardIcon, PauseIcon, PlayIcon } from "@heroicons/react/24/solid";
import { useEffect, useMemo, useRef, useState } from "react";
import { FalaTocavel } from "../components/FalaTocavel";
import { FolhaTermo } from "../components/FolhaTermo";
import { PrepararLegendas } from "../components/PrepararLegendas";
import type { Explicacao } from "../lib/claude";
import { casarPorTempo, dividirPalavras, falaEm, formatarTempo, lerTempo } from "../lib/legenda";
import { useLista } from "../store/ListaContexto";
import { chaveLegenda, gravarLegenda, lerLegenda, type Legenda } from "../store/legendas";
import type { ItemLista } from "../store/lista";
import { BotaoIcone } from "../ui/BotaoIcone";
import { cn } from "../ui/cn";

export function Legendas({
  chaveTitulo,
  temporada,
  episodio,
  onFechar,
}: {
  chaveTitulo: string;
  temporada?: number;
  episodio?: number;
  onFechar: () => void;
}) {
  const { itens } = useLista();
  const item = itens.find((i) => i.chave === chaveTitulo);

  const fechar = useRef(onFechar);
  fechar.current = onFechar;
  useEffect(() => {
    history.pushState({ legendas: true }, "");
    const aoVoltar = () => fechar.current();
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  useEffect(() => {
    if (!item) history.back();
  }, [item]);

  if (!item) return null;
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-paper pt-[var(--safe-top)]">
      <Conteudo item={item} temporada={temporada} episodio={episodio} onVoltar={() => history.back()} />
    </div>
  );
}

function Conteudo({
  item,
  temporada,
  episodio,
  onVoltar,
}: {
  item: ItemLista;
  temporada?: number;
  episodio?: number;
  onVoltar: () => void;
}) {
  const chave = chaveLegenda(item.chave, temporada, episodio);
  const [leg, setLeg] = useState<Legenda | null>(null);
  const [fase, setFase] = useState<"lendo" | "preparar" | "pronto">("lendo");
  const [versao, setVersao] = useState(0); // remonta o leitor quando as fontes mudam

  useEffect(() => {
    lerLegenda(chave)
      .then((l) => {
        setLeg(l);
        setFase(l ? "pronto" : "preparar");
      })
      .catch(() => setFase("preparar"));
  }, [chave]);

  const episodioRotulo = temporada != null && episodio != null ? `T${temporada} · E${episodio}` : null;

  return (
    <>
      <header className="mx-auto flex w-full max-w-2xl items-center gap-1 px-4 pt-2 pb-2">
        <BotaoIcone icone={ChevronLeftIcon} rotulo="Voltar" onClick={onVoltar} className="-ml-2.5 text-ink" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg leading-tight font-bold">{item.titulo}</h1>
          <p className="truncate text-xs font-semibold text-sub">
            {episodioRotulo ? `${episodioRotulo} · ` : ""}Legendas
            {leg?.ia && " · sincronizadas com IA"}
          </p>
        </div>
        {fase === "pronto" && (
          <BotaoIcone
            icone={AdjustmentsHorizontalIcon}
            rotulo="Fontes das legendas"
            onClick={() => setFase("preparar")}
            className="-mr-2.5"
          />
        )}
      </header>

      {fase === "preparar" && (
        <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-[calc(var(--safe-bottom)+24px)]">
          <PrepararLegendas
            item={item}
            alvo={{ tipo: item.tipo, id: item.id, temporada, episodio }}
            chave={chave}
            atual={leg}
            onPronto={(l) => {
              setLeg(l);
              setVersao((v) => v + 1);
              setFase("pronto");
            }}
          />
        </main>
      )}
      {fase === "pronto" && leg && <Leitor key={versao} item={item} inicial={leg} onMudar={setLeg} />}
    </>
  );
}

function Leitor({ item, inicial, onMudar }: { item: ItemLista; inicial: Legenda; onMudar: (l: Legenda) => void }) {
  const [leg, setLegLocal] = useState(inicial);
  const [pos, setPos] = useState(inicial.posicao);
  const [tocando, setTocando] = useState(false);
  const [sel, setSel] = useState<{ fala: number; termo: string } | null>(null);
  const [tempoTV, setTempoTV] = useState("");
  const base = useRef({ pos: inicial.posicao, em: 0 });
  const ultimo = useRef({ leg, pos });
  ultimo.current = { leg, pos };

  const falas = leg.original;
  const duracao = falas.length ? falas[falas.length - 1].fim : 0;
  const atual = falaEm(falas, pos);
  const tokens = useMemo(
    () => (atual >= 0 ? dividirPalavras(falas[atual].texto, item.idioma) : []),
    [falas, atual, item.idioma],
  );

  const salvar = (l: Legenda) => {
    setLegLocal(l);
    onMudar(l);
    gravarLegenda(l).catch(console.error);
  };
  const salvarPosicao = () => {
    const { leg: l, pos: p } = ultimo.current;
    gravarLegenda({ ...l, posicao: p }).catch(console.error);
  };

  const ir = (ms: number) => {
    const t = Math.max(0, Math.min(duracao, ms));
    base.current = { pos: t, em: performance.now() };
    setPos(t);
  };
  const tocar = () => {
    base.current = { pos, em: performance.now() };
    setTocando(true);
  };
  const pausar = () => {
    setTocando(false);
    salvarPosicao();
  };

  // relógio do modo acompanhar
  useEffect(() => {
    if (!tocando) return;
    const id = window.setInterval(() => {
      const t = base.current.pos + performance.now() - base.current.em;
      if (t >= duracao) {
        setPos(duracao);
        setTocando(false);
      } else setPos(t);
    }, 200);
    return () => clearInterval(id);
  }, [tocando, duracao]);

  // tela acesa enquanto acompanha; app em segundo plano pausa
  useEffect(() => {
    if (!tocando) return;
    let trava: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request("screen")
      .then((t) => (trava = t))
      .catch(() => {});
    const aoEsconder = () => {
      if (document.hidden) {
        setTocando(false);
        salvarPosicao();
      }
    };
    document.addEventListener("visibilitychange", aoEsconder);
    return () => {
      trava?.release().catch(() => {});
      document.removeEventListener("visibilitychange", aoEsconder);
    };
  }, [tocando]);

  // grava onde parou ao sair
  useEffect(
    () => () => {
      salvarPosicao();
      onMudar({ ...ultimo.current.leg, posicao: ultimo.current.pos }); // ao abrir as fontes
    },
    [],
  );

  // lista acompanha a fala atual, a não ser que o usuário esteja rolando
  const lista = useRef<HTMLUListElement>(null);
  const rolouEm = useRef(0);
  useEffect(() => {
    if (atual < 0 || Date.now() - rolouEm.current < 4000) return;
    lista.current
      ?.querySelector<HTMLElement>(`[data-fala="${atual}"]`)
      ?.scrollIntoView({ block: "center", behavior: tocando ? "smooth" : "auto" });
  }, [atual]);

  const ajustarPt = (delta: number) => {
    const deslocamento = leg.deslocamento + delta;
    salvar({ ...leg, deslocamento, casamento: casarPorTempo(falas, leg.pt, deslocamento), ia: false });
  };

  const abrirTermo = (ini: number, fim: number) => {
    if (atual < 0) return;
    if (tocando) pausar();
    const termo = tokens
      .slice(ini, fim + 1)
      .map((t) => t.texto)
      .join("")
      .trim();
    setSel({ fala: atual, termo });
  };

  const temPt = leg.pt.length > 0;

  return (
    <>
      {/* fala atual */}
      <section aria-live="polite" className="mx-auto w-full max-w-2xl px-4">
        <div className="flex min-h-[150px] flex-col justify-center rounded-app bg-cartao px-4 py-3">
          {atual >= 0 ? (
            <>
              <FalaTocavel
                key={atual}
                tokens={tokens}
                idioma={item.idioma}
                onSelecionar={abrirTermo}
                className="text-xl leading-snug font-semibold"
              />
              {temPt && (
                <p lang="pt-BR" className="mt-2 text-base leading-snug text-sub">
                  {leg.casamento[atual] || "—"}
                </p>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-sub">Ainda não começou. Aperte ▶ junto com o filme.</p>
          )}
        </div>
      </section>

      {/* todas as falas */}
      <ul
        ref={lista}
        onTouchMove={() => (rolouEm.current = Date.now())}
        onWheel={() => (rolouEm.current = Date.now())}
        className="mx-auto mt-2 w-full max-w-2xl flex-1 overflow-y-auto px-4"
      >
        {falas.map((f, i) => (
          <li key={i} data-fala={i}>
            <button
              type="button"
              onClick={() => {
                rolouEm.current = 0;
                ir(f.inicio);
              }}
              className={cn(
                "flex w-full cursor-pointer gap-3 rounded-app-sm px-2 py-1.5 text-left text-sm",
                i === atual && "bg-caneta-soft",
              )}
            >
              <span className="w-14 shrink-0 pt-px font-mono text-xs text-sub tabular-nums">
                {formatarTempo(f.inicio)}
              </span>
              <span className="min-w-0 flex-1">
                <span lang={item.idioma} className={cn("block", i === atual && "font-semibold text-caneta")}>
                  {f.texto}
                </span>
                {temPt && leg.casamento[i] && (
                  <span lang="pt-BR" className="block text-sub">
                    {leg.casamento[i]}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* controles */}
      <footer className="mx-auto w-full max-w-2xl px-4 pt-2 pb-[calc(var(--safe-bottom)+12px)]">
        <div className="flex items-center gap-2 text-xs text-sub tabular-nums">
          <span className="w-14">{formatarTempo(pos)}</span>
          <input
            type="range"
            aria-label="Momento do filme"
            min={0}
            max={duracao}
            step={1000}
            value={pos}
            onChange={(e) => ir(Number(e.target.value))}
            className="h-8 flex-1 cursor-pointer accent-[var(--caneta)]"
          />
          <span className="w-14 text-right">{formatarTempo(duracao)}</span>
        </div>
        <div className="mt-1 flex items-center justify-center gap-4">
          <BotaoIcone
            icone={BackwardIcon}
            rotulo="Fala anterior"
            onClick={() => atual > 0 && ir(falas[atual - 1].inicio)}
          />
          <button
            type="button"
            aria-label={tocando ? "Pausar" : "Acompanhar o filme"}
            title={tocando ? "Pausar" : "Acompanhar o filme"}
            onClick={tocando ? pausar : tocar}
            className="inline-flex size-14 cursor-pointer items-center justify-center rounded-full bg-caneta-500 text-on-caneta transition-transform duration-150 active:scale-90"
          >
            {tocando ? <PauseIcon className="size-7" aria-hidden /> : <PlayIcon className="size-7" aria-hidden />}
          </button>
          <BotaoIcone
            icone={ForwardIcon}
            rotulo="Próxima fala"
            onClick={() => atual < falas.length - 1 && ir(falas[atual + 1].inicio)}
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <form
            className="flex min-w-0 flex-1 items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const t = lerTempo(tempoTV);
              if (t != null) {
                ir(t);
                setTempoTV("");
              }
            }}
          >
            <input
              value={tempoTV}
              onChange={(e) => setTempoTV(e.target.value)}
              inputMode="numeric"
              placeholder="Tempo na TV"
              aria-label="Tempo que aparece na TV"
              className="h-9 min-w-0 flex-1 rounded-full bg-card-2 px-3 text-sm text-ink placeholder:text-sub"
            />
            <button
              type="submit"
              disabled={lerTempo(tempoTV) == null}
              className="h-9 cursor-pointer rounded-full bg-card-2 px-3 text-xs font-semibold text-ink disabled:opacity-40"
            >
              Ir
            </button>
          </form>
          {temPt && (
            <div className="flex items-center gap-1" role="group" aria-label="Ajuste da legenda em português">
              <button
                type="button"
                aria-label="Português meio segundo antes"
                onClick={() => ajustarPt(-500)}
                className="size-9 cursor-pointer rounded-full bg-card-2 text-sm font-bold text-ink"
              >
                −
              </button>
              <span className="w-14 text-center text-xs whitespace-nowrap text-sub tabular-nums">
                PT {leg.deslocamento >= 0 ? "+" : "−"}
                {(Math.abs(leg.deslocamento) / 1000).toFixed(1).replace(".", ",")}s
              </span>
              <button
                type="button"
                aria-label="Português meio segundo depois"
                onClick={() => ajustarPt(500)}
                className="size-9 cursor-pointer rounded-full bg-card-2 text-sm font-bold text-ink"
              >
                +
              </button>
            </div>
          )}
        </div>
      </footer>

      {sel && (
        <FolhaTermo
          item={item}
          termo={sel.termo}
          fala={falas[sel.fala].texto}
          falaPt={leg.casamento[sel.fala] ?? ""}
          explicacao={leg.termos[`${sel.fala}|${sel.termo}`]}
          onExplicado={(e: Explicacao) => {
            const l = ultimo.current.leg;
            salvar({ ...l, termos: { ...l.termos, [`${sel.fala}|${sel.termo}`]: e } });
          }}
          onFechar={() => setSel(null)}
        />
      )}
    </>
  );
}
