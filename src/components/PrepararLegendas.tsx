// Primeira etapa da tela Legendas: obtém a legenda original e a em português
// (OpenSubtitles ou arquivo importado), casa as duas e grava. Volta a aparecer
// pelo botão "Fontes" para trocar uma delas.
import { ArrowPathIcon, ArrowUpTrayIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { IDIOMAS } from "../lib/catalogo";
import { alinharLegendas } from "../lib/claude";
import { casarPorTempo, decodificarTexto, estimarDeslocamento, lerSrt, type Fala } from "../lib/legenda";
import { baixar, buscarOpcoes, codigosOS, ErroLegenda, escolher, type Alvo, type Opcao } from "../lib/opensubtitles";
import { useAjustes } from "../store/ajustes";
import { gravarLegenda, type Legenda } from "../store/legendas";
import type { ItemLista } from "../store/lista";
import { CAMPO } from "../ui/Selecao";

type Lado = "original" | "pt";
interface Fonte {
  falas: Fala[];
  nome: string;
}

const CODIGOS_PT = ["pt-br", "pt-pt"];

export function PrepararLegendas({
  item,
  alvo,
  chave,
  atual,
  onPronto,
}: {
  item: ItemLista;
  alvo: Alvo;
  chave: string; // chave da legenda (store/legendas)
  atual: Legenda | null; // já montada antes: veio trocar uma fonte
  onPronto: (l: Legenda) => void;
}) {
  const { ajustes } = useAjustes();
  const codigosOrig = codigosOS(item.idioma);
  const [fontes, setFontes] = useState<Record<Lado, Fonte | null>>({
    original: atual ? { falas: atual.original, nome: atual.origem.original } : null,
    pt: atual?.pt.length ? { falas: atual.pt, nome: atual.origem.pt } : null,
  });
  const [opcoes, setOpcoes] = useState<Opcao[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const nomeIdioma = IDIOMAS.find((l) => l.codigo === item.idioma)?.nome ?? item.idioma;

  const baixarOpcao = async (lado: Lado, o: Opcao) => {
    setOcupado(lado === "original" ? `Baixando a legenda em ${nomeIdioma}…` : "Baixando a legenda em português…");
    const falas = lerSrt(await baixar(ajustes.chaveOpenSubtitles, o.fileId));
    if (!falas.length) throw new ErroLegenda("nada", "O arquivo baixado não tem falas.");
    const f = { falas, nome: o.nome || `OpenSubtitles ${o.fileId}` };
    setFontes((x) => ({ ...x, [lado]: f }));
    return f;
  };

  const montar = async (orig: Fonte, pt: Fonte | null) => {
    const ptFalas = pt?.falas ?? [];
    const deslocamento = ptFalas.length ? estimarDeslocamento(orig.falas, ptFalas) : 0;
    let casamento = casarPorTempo(orig.falas, ptFalas, deslocamento);
    let ia = false;
    if (ajustes.sincronizarIA && ajustes.chaveClaude && ptFalas.length) {
      setOcupado("Sincronizando as legendas com o Claude…");
      try {
        const movidas = ptFalas.map((f) => ({ ...f, inicio: f.inicio + deslocamento, fim: f.fim + deslocamento }));
        casamento = await alinharLegendas(ajustes.chaveClaude, orig.falas, movidas, casamento);
        ia = true;
      } catch (e) {
        console.error(e);
      }
    }
    const mesmaOriginal = atual?.origem.original === orig.nome;
    const l: Legenda = {
      chave,
      original: orig.falas,
      pt: ptFalas,
      casamento,
      deslocamento,
      ia,
      origem: { original: orig.nome, pt: pt?.nome ?? "" },
      posicao: mesmaOriginal ? atual.posicao : 0,
      termos: mesmaOriginal ? atual.termos : {},
    };
    await gravarLegenda(l);
    onPronto(l);
  };

  // primeira vez: busca e baixa as duas sozinho
  const iniciou = useRef(false);
  useEffect(() => {
    if (iniciou.current || !ajustes.chaveOpenSubtitles) return;
    iniciou.current = true;
    (async () => {
      try {
        setOcupado("Procurando legendas no OpenSubtitles…");
        const ops = await buscarOpcoes(ajustes.chaveOpenSubtitles, alvo, [...codigosOrig, ...CODIGOS_PT]);
        setOpcoes(ops);
        if (atual) return;
        const o = escolher(ops, codigosOrig[0]);
        const p = escolher(ops, "pt-br");
        if (!o) throw new ErroLegenda("nada", `Nenhuma legenda em ${nomeIdioma} encontrada. Importe um arquivo .srt.`);
        const fo = await baixarOpcao("original", o);
        const fp = p ? await baixarOpcao("pt", p) : null;
        if (fp) await montar(fo, fp);
        else setErro("Nenhuma legenda em português encontrada. Importe uma ou abra só com a original.");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível buscar as legendas.");
      } finally {
        setOcupado(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executar = async (fn: () => Promise<unknown>) => {
    setErro(null);
    try {
      await fn();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(null);
    }
  };

  const importar = (lado: Lado, arquivo?: File) =>
    arquivo &&
    executar(async () => {
      const falas = lerSrt(decodificarTexto(await arquivo.arrayBuffer()));
      if (!falas.length) throw new ErroLegenda("nada", `“${arquivo.name}” não parece ser uma legenda .srt ou .vtt.`);
      setFontes((x) => ({ ...x, [lado]: { falas, nome: arquivo.name } }));
    });

  const original = fontes.original;
  return (
    <div className="flex flex-col gap-3">
      <Slot
        titulo={nomeIdioma}
        fonte={fontes.original}
        opcoes={opcoes?.filter((o) => codigosOrig.includes(o.idioma)) ?? []}
        desativado={!!ocupado}
        onOpcao={(o) => executar(() => baixarOpcao("original", o))}
        onArquivo={(a) => importar("original", a)}
      />
      <Slot
        titulo="Português"
        fonte={fontes.pt}
        opcoes={opcoes?.filter((o) => CODIGOS_PT.includes(o.idioma)) ?? []}
        desativado={!!ocupado}
        onOpcao={(o) => executar(() => baixarOpcao("pt", o))}
        onArquivo={(a) => importar("pt", a)}
      />

      {!ajustes.chaveOpenSubtitles && (
        <p className="text-sm text-sub">
          Para buscar as legendas sozinho, adicione a chave do OpenSubtitles em Ajustes. Sem ela, importe os arquivos
          .srt.
        </p>
      )}
      <div aria-live="polite" className="min-h-5 text-sm font-semibold">
        {ocupado ? (
          <p className="flex items-center gap-2 text-sub">
            <ArrowPathIcon className="size-4 animate-spin" aria-hidden /> {ocupado}
          </p>
        ) : (
          erro && <p className="text-erro">{erro}</p>
        )}
      </div>

      <button
        type="button"
        disabled={!original || !!ocupado}
        onClick={() => original && executar(() => montar(original, fontes.pt))}
        className="h-12 cursor-pointer rounded-full bg-caneta-500 text-sm font-bold text-on-caneta transition-transform duration-150 active:scale-[0.98] disabled:opacity-40"
      >
        {fontes.pt || !original ? "Abrir legendas" : "Abrir só com a original"}
      </button>
    </div>
  );
}

function Slot({
  titulo,
  fonte,
  opcoes,
  desativado,
  onOpcao,
  onArquivo,
}: {
  titulo: string;
  fonte: Fonte | null;
  opcoes: Opcao[];
  desativado: boolean;
  onOpcao: (o: Opcao) => void;
  onArquivo: (a?: File) => void;
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
          <ArrowUpTrayIcon className="size-4" aria-hidden /> Importar .srt
        </button>
        <input
          ref={entrada}
          type="file"
          hidden
          onChange={(e) => {
            onArquivo(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="flex min-w-0 items-center gap-1.5 text-xs text-sub">
        {fonte ? (
          <>
            <CheckCircleIcon className="size-4 shrink-0 text-ok" aria-hidden />
            <span className="truncate">
              {fonte.nome} · {fonte.falas.length} falas
            </span>
          </>
        ) : (
          "Nenhuma legenda ainda."
        )}
      </p>
      {opcoes.length > 0 && (
        <select
          aria-label={`Outra legenda em ${titulo} no OpenSubtitles`}
          disabled={desativado}
          value=""
          onChange={(e) => {
            const o = opcoes.find((x) => String(x.fileId) === e.target.value);
            if (o) onOpcao(o);
          }}
          className={`${CAMPO} appearance-none disabled:opacity-40`}
        >
          <option value="">Trocar por outra do OpenSubtitles ({opcoes.length})…</option>
          {opcoes.map((o) => (
            <option key={o.fileId} value={o.fileId}>
              {o.nome || o.fileId} · {o.downloads} downloads
            </option>
          ))}
        </select>
      )}
    </section>
  );
}
