// Aba Importar: coloca no app legendas .srt/.vtt que já estão no aparelho,
// para um título da Minha lista: filme ou episódio avulso (um arquivo por
// idioma) ou uma temporada inteira de uma vez (vários arquivos por idioma,
// pareados pelo episódio que aparece no nome). A legenda de estudo pode ter
// outro idioma que o do título (ex.: série em inglês estudada em mandarim);
// o português é sempre o segundo lado.
import { ArrowPathIcon, ArrowUpTrayIcon, CheckCircleIcon, MinusCircleIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cabecalho } from "../components/Cabecalho";
import { IDIOMAS } from "../lib/catalogo";
import { chaveManual, montarLegenda, parear } from "../lib/importar";
import { decodificarTexto, lerSrt } from "../lib/legenda";
import { buscarTemporadas, type Temporada } from "../lib/tmdb";
import { useLista } from "../store/ListaContexto";
import { chaveLegenda, gravarLegenda, lerLegenda } from "../store/legendas";
import { Segmentado } from "../ui/Segmentado";
import { Selecao } from "../ui/Selecao";

type Modo = "avulso" | "conjunto";
interface Fonte {
  nome: string;
  arquivo: File;
}
const comoFontes = (fs: FileList | null): Fonte[] =>
  Array.from(fs ?? [], (arquivo) => ({ nome: arquivo.name, arquivo }));

async function lerFonte(f: Fonte, idioma: string) {
  const falas = lerSrt(decodificarTexto(await f.arquivo.arrayBuffer(), idioma));
  if (!falas.length) throw new Error(`“${f.nome}” não parece ser uma legenda .srt ou .vtt.`);
  return { nome: f.nome, falas };
}

export function Importar() {
  const { itens } = useLista();
  const [chave, setChave] = useState("");
  const item = itens.find((i) => i.chave === chave) ?? itens[0];
  const [idioma, setIdioma] = useState<string | null>(null); // null: o do título
  const [modo, setModo] = useState<Modo>("avulso");
  const [temps, setTemps] = useState<Temporada[] | null>(null);
  const [t, setT] = useState(1);
  const [e, setE] = useState(1);
  const [orig, setOrig] = useState<Fonte[]>([]);
  const [pt, setPt] = useState<Fonte[]>([]);
  const [manual, setManual] = useState<Record<string, number>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ ok: string; erros: string[] } | null>(null);

  const serie = item?.tipo === "serie";
  const idiomaEstudo = idioma ?? item?.idioma ?? "en";
  const nomeIdioma = IDIOMAS.find((l) => l.codigo === idiomaEstudo)?.nome ?? idiomaEstudo;
  const temporada = temps?.find((x) => x.numero === t);

  useEffect(() => {
    setTemps(null);
    if (!item || item.tipo !== "serie") return;
    let vivo = true;
    buscarTemporadas(item.id)
      .then((ts) => {
        if (!vivo) return;
        setTemps(ts);
        if (ts[0] && !ts.some((x) => x.numero === t)) setT(ts[0].numero);
      })
      .catch(() => vivo && setTemps([]));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, item?.tipo]);

  const limpar = () => {
    setOrig([]);
    setPt([]);
    setManual({});
    setResultado(null);
  };

  const pareamento = useMemo(() => parear(orig, pt, t, manual), [orig, pt, t, manual]);

  // O que será gravado: [chave da legenda, rótulo, fonte original, fonte pt]
  const lote = useMemo(() => {
    if (!item) return [];
    if (!serie || modo === "avulso") {
      const rotulo = serie ? `T${t} · E${e}` : item.titulo;
      return [
        { chave: chaveLegenda(item.chave, serie ? t : undefined, serie ? e : undefined), rotulo, o: orig[0], p: pt[0] },
      ];
    }
    return pareamento.pares.map((p) => ({
      chave: chaveLegenda(item.chave, p.temporada, p.episodio),
      rotulo: `T${p.temporada} · E${p.episodio}`,
      o: p.original,
      p: p.pt,
    }));
  }, [item, serie, modo, t, e, orig, pt, pareamento.pares]);
  const prontos = lote.filter((x) => x.o);

  const importar = async () => {
    setResultado(null);
    const erros: string[] = [];
    let n = 0;
    for (const [i, x] of prontos.entries()) {
      setOcupado(`Importando ${x.rotulo} (${i + 1} de ${prontos.length})…`);
      try {
        const [o, p] = await Promise.all([lerFonte(x.o!, idiomaEstudo), x.p ? lerFonte(x.p, "pt") : null]);
        const anterior = await lerLegenda(x.chave);
        await gravarLegenda(montarLegenda(x.chave, idiomaEstudo, o, p, anterior));
        n++;
      } catch (err) {
        erros.push(`${x.rotulo}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setOcupado(null);
    setResultado({
      ok: n ? `${n} ${n === 1 ? "legenda importada" : "legendas importadas"}. Abra em Minha lista → Legendas.` : "",
      erros,
    });
    if (n) {
      setOrig([]);
      setPt([]);
      setManual({});
    }
  };

  if (!item) {
    return (
      <>
        <Cabecalho titulo="Importar legendas" />
        <main className="mx-auto max-w-2xl px-4 pt-6 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)]">
          <p className="text-center text-sm text-sub">
            Adicione o filme ou a série à Minha lista (em Explorar) para importar as legendas dele.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Cabecalho titulo="Importar legendas" />
      <main className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pt-2 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)]">
        <section className="flex flex-col gap-2 rounded-app bg-cartao p-3">
          <Selecao
            id="titulo-importar"
            rotulo="Título"
            valor={item.chave}
            onChange={(v) => {
              setChave(v);
              setIdioma(null);
              setModo("avulso");
              limpar();
            }}
            opcoes={itens.map((i) => ({ valor: i.chave, nome: i.titulo }))}
          />
          <Selecao
            id="idioma-importar"
            rotulo="Estudar em"
            valor={idiomaEstudo}
            onChange={(v) => {
              setIdioma(v);
              setResultado(null);
            }}
            opcoes={IDIOMAS.map((l) => ({ valor: l.codigo, nome: l.nome }))}
          />
          {serie && (
            <Segmentado
              rotulo="O que importar"
              valor={modo}
              onChange={(m) => {
                setModo(m);
                limpar();
              }}
              opcoes={[
                { valor: "avulso", nome: "Um episódio" },
                { valor: "conjunto", nome: "Vários episódios" },
              ]}
            />
          )}
          {serie && (
            <Selecao
              id="temporada-importar"
              rotulo="Temporada"
              valor={String(t)}
              onChange={(v) => setT(Number(v))}
              opcoes={(temps ?? [{ numero: t, nome: `Temporada ${t}`, episodios: 0 }]).map((x) => ({
                valor: String(x.numero),
                nome: x.nome,
              }))}
            />
          )}
          {serie && modo === "avulso" && (
            <Selecao
              id="episodio-importar"
              rotulo="Episódio"
              valor={String(e)}
              onChange={(v) => setE(Number(v))}
              opcoes={Array.from({ length: Math.max(temporada?.episodios ?? 0, e, 1) }, (_, i) => ({
                valor: String(i + 1),
                nome: `Episódio ${i + 1}`,
              }))}
            />
          )}
        </section>

        <Escolha
          titulo={nomeIdioma}
          multiplo={serie && modo === "conjunto"}
          fontes={orig}
          desativado={!!ocupado}
          onFontes={(f) => {
            setOrig(f);
            setResultado(null);
          }}
        />
        <Escolha
          titulo="Português"
          multiplo={serie && modo === "conjunto"}
          fontes={pt}
          desativado={!!ocupado}
          onFontes={(f) => {
            setPt(f);
            setResultado(null);
          }}
        />

        {serie && modo === "conjunto" && (orig.length > 0 || pt.length > 0) && (
          <section className="flex flex-col gap-2 rounded-app bg-cartao p-3">
            <h2 className="text-sm font-bold">Episódios encontrados</h2>
            {pareamento.pares.length > 0 && (
              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto text-sm">
                {pareamento.pares.map((p) => (
                  <li key={`${p.temporada}-${p.episodio}`} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 font-semibold tabular-nums">
                      T{p.temporada} · E{p.episodio}
                    </span>
                    <Marca ok={!!p.original} rotulo={nomeIdioma} />
                    <Marca ok={!!p.pt} rotulo="Português" />
                  </li>
                ))}
              </ul>
            )}
            {pareamento.repetidos > 0 && (
              <p className="text-xs text-sub">
                {pareamento.repetidos} arquivo(s) repetindo um episódio foram ignorados.
              </p>
            )}
            {pareamento.sem.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-erro">O nome não diz o episódio. Escolha:</p>
                {pareamento.sem.map(({ lado, arquivo }) => (
                  <label key={chaveManual(lado, arquivo.nome)} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-sub">{arquivo.nome}</span>
                    <select
                      aria-label={`Episódio de ${arquivo.nome}`}
                      value=""
                      onChange={(ev) =>
                        ev.target.value &&
                        setManual((m) => ({ ...m, [chaveManual(lado, arquivo.nome)]: Number(ev.target.value) }))
                      }
                      className="h-9 rounded-app-sm bg-card-2 px-2 text-ink"
                    >
                      <option value="">Episódio…</option>
                      {Array.from({ length: Math.max(temporada?.episodios ?? 0, 30) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </section>
        )}

        <div aria-live="polite" className="min-h-5 text-sm font-semibold">
          {ocupado ? (
            <p className="flex items-center gap-2 text-sub">
              <ArrowPathIcon className="size-4 animate-spin" aria-hidden /> {ocupado}
            </p>
          ) : (
            resultado && (
              <>
                {resultado.ok && <p className="text-ok">{resultado.ok}</p>}
                {resultado.erros.map((m) => (
                  <p key={m} className="text-erro">
                    {m}
                  </p>
                ))}
              </>
            )
          )}
        </div>

        <button
          type="button"
          disabled={prontos.length === 0 || !!ocupado}
          onClick={importar}
          className="h-12 cursor-pointer rounded-full bg-caneta-500 text-sm font-bold text-on-caneta transition-transform duration-150 active:scale-[0.98] disabled:opacity-40"
        >
          {prontos.length > 1 ? `Importar ${prontos.length} episódios` : "Importar"}
        </button>
      </main>
    </>
  );
}

function Marca({ ok, rotulo }: { ok: boolean; rotulo: string }) {
  const I = ok ? CheckCircleIcon : MinusCircleIcon;
  return (
    <span className={`flex items-center gap-1 text-xs ${ok ? "text-ok" : "text-sub"}`}>
      <I className="size-4" aria-hidden />
      {rotulo}
      {!ok && <span className="sr-only"> ausente</span>}
    </span>
  );
}

function Escolha({
  titulo,
  multiplo,
  fontes,
  desativado,
  onFontes,
}: {
  titulo: string;
  multiplo: boolean;
  fontes: Fonte[];
  desativado: boolean;
  onFontes: (f: Fonte[]) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <section className="flex flex-col gap-2 rounded-app bg-cartao p-3">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-sm font-bold">{titulo}</h2>
        <button
          type="button"
          disabled={desativado}
          onClick={() => entrada.current?.click()}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-card-2 px-3 text-xs font-semibold text-ink transition-transform duration-150 active:scale-95 disabled:opacity-40"
        >
          <ArrowUpTrayIcon className="size-4" aria-hidden /> {multiplo ? "Escolher arquivos" : "Escolher arquivo"}
        </button>
        <input
          ref={entrada}
          type="file"
          multiple={multiplo}
          accept=".srt,.vtt,text/*"
          hidden
          onChange={(ev) => {
            onFontes(comoFontes(ev.target.files));
            ev.target.value = "";
          }}
        />
      </div>
      <p className="truncate text-xs text-sub">
        {fontes.length === 0
          ? "Nenhum arquivo escolhido."
          : fontes.length === 1
            ? fontes[0].nome
            : `${fontes.length} arquivos escolhidos`}
      </p>
    </section>
  );
}
