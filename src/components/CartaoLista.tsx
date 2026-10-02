// Cartão da Minha lista (mock do Pedro, 02/10/2026): miniatura do pôster ao
// lado do título, metadados e ações. ⓘ abre o painel da sinopse (gêneros,
// nível, texto justificado); ✎ abre o vocabulário (pares termo → tradução,
// com contador e exportação). Só um painel aberto por vez.
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowUpTrayIcon,
  BookmarkIcon,
  CheckCircleIcon,
  CheckIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolido, CheckCircleIcon as CheckSolido } from "@heroicons/react/24/solid";
import { Capacitor } from "@capacitor/core";
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { csvAnki } from "../lib/anki";
import { analisarPares, mensagemErro } from "../lib/claude";
import { contarPalavras, limparPares, type Par } from "../lib/vocabulario";
import { useAjustes } from "../store/ajustes";
import { useLista } from "../store/ListaContexto";
import { paraTitulo, type ItemLista } from "../store/lista";
import { cn } from "../ui/cn";
import { SeloNivel } from "../ui/SeloNivel";
import { Etiquetas, Logos, Metadados, Poster, TituloEOriginal, useDetalhes } from "./partesTitulo";

type Painel = "info" | "vocab" | null;
type Icone = ComponentType<SVGProps<SVGSVGElement>>;

function Acao({
  icone: I,
  rotulo,
  ativo,
  alterna,
  perigo,
  onClick,
  className,
}: {
  icone: Icone;
  rotulo: string;
  ativo?: boolean;
  alterna?: boolean;
  perigo?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={alterna ? !!ativo : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-app-sm transition-[background-color,color,transform] duration-150 active:scale-90",
        perigo ? "text-erro" : ativo ? (alterna ? "bg-caneta-200 text-caneta" : "text-caneta") : "text-sub",
        className,
      )}
    >
      <I className="size-[22px]" aria-hidden />
    </button>
  );
}

export function CartaoLista({ item }: { item: ItemLista }) {
  const t = paraTitulo(item);
  const { ref, det, sinopse, generos, nota } = useDetalhes<HTMLLIElement>(t);
  const lista = useLista();
  const [painel, setPainel] = useState<Painel>(null);
  const alternarPainel = (p: Painel) => setPainel(painel === p ? null : p);

  return (
    <li ref={ref} className="animate-surge overflow-hidden rounded-app bg-cartao">
      <div className="flex gap-3 p-2">
        <div className="aspect-[2/3] w-[68px] shrink-0 self-start overflow-hidden rounded-[10px] bg-cartao-verso">
          {item.poster && <Poster caminho={item.poster} largura="w154" className="h-full w-full object-cover" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col pt-0.5">
          <TituloEOriginal t={t} />
          <Metadados nota={nota} ano={item.ano} det={det} className="mt-1" />
          <div className="mt-1.5 -ml-1 flex items-center gap-0.5">
            <Acao
              icone={InformationCircleIcon}
              rotulo="Sinopse"
              alterna
              ativo={painel === "info"}
              onClick={() => alternarPainel("info")}
            />
            <Acao
              icone={PencilSquareIcon}
              rotulo="Vocabulário"
              alterna
              ativo={painel === "vocab"}
              onClick={() => alternarPainel("vocab")}
            />
            <Acao
              icone={item.status === "quero" ? BookmarkSolido : BookmarkIcon}
              rotulo="Quero ver"
              ativo={item.status === "quero"}
              onClick={() => lista.alternar(t, "quero", det)}
            />
            <Acao
              icone={item.status === "visto" ? CheckSolido : CheckCircleIcon}
              rotulo="Já vi"
              ativo={item.status === "visto"}
              onClick={() => lista.alternar(t, "visto", det)}
            />
            <Acao icone={TrashIcon} rotulo="Remover da lista" onClick={() => lista.remover(item.chave)} perigo />
            <Logos det={det} className="ml-auto" />
          </div>
        </div>
      </div>

      {painel === "info" && (
        <div className="animate-surge bg-cartao-verso px-3 pt-2.5 pb-3">
          <div className="flex items-start gap-2">
            <div className="flex flex-1 flex-wrap gap-1">
              <Etiquetas generos={generos} max={3} />
            </div>
            <SeloNivel nivel={item.nivel} idioma={item.idioma} neutro />
          </div>
          <p lang="pt-BR" className="mt-2 line-clamp-6 text-[13px] leading-[1.45] text-ink text-justify hyphens-auto">
            {sinopse || "Sinopse não disponível."}
          </p>
        </div>
      )}

      {painel === "vocab" && <Vocabulario item={item} />}
    </li>
  );
}

// Linha local do editor: o par mais uma chave estável (as linhas mudam de
// posição quando a tradução automática responde ou linhas vazias saem).
type Linha = Par & { k: number; traduzindo?: boolean };
let proxima = 0;
const linha = (p: Par = { termo: "", traducao: "" }): Linha => ({ ...p, k: proxima++ });
const semChave = (ls: Linha[]): Par[] => ls.map(({ k: _k, traduzindo: _t, ...p }) => p);
const comLinhaNova = (ls: Linha[]) => {
  const fim = ls[ls.length - 1];
  return !fim || fim.termo || fim.traducao ? [...ls, linha()] : ls;
};

async function salvarArquivo(nome: string, conteudo: string, titulo: string) {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const { uri } = await Filesystem.writeFile({
      path: nome,
      data: conteudo,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: titulo, files: [uri], dialogTitle: "Exportar baralho" });
    return;
  }
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  a.click();
  URL.revokeObjectURL(url);
}

const nomeArquivo = (titulo: string) =>
  `cineglota-${
    titulo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "vocabulario"
  }.csv`;

function Vocabulario({ item }: { item: ItemLista }) {
  const lista = useLista();
  const { ajustes } = useAjustes();
  const [linhas, setLinhas] = useState<Linha[]>(() => comLinhaNova(item.vocabulario.map((p) => linha(p))));
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [exportado, setExportado] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const espera = useRef<number>(undefined);
  const ultimo = useRef(item);
  ultimo.current = item;
  const auto = ajustes.traducaoAuto && !!ajustes.chaveClaude;

  const salvar = (ls: Linha[]) => {
    const limpos = limparPares(semChave(ls));
    if (JSON.stringify(limpos) !== JSON.stringify(ultimo.current.vocabulario))
      lista.atualizar(ultimo.current, { vocabulario: limpos });
  };

  // grava enquanto digita (com folga), para não perder nada se o app fechar
  useEffect(() => {
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => salvar(linhas), 500);
    return () => window.clearTimeout(espera.current);
  }, [linhas]); // eslint-disable-line react-hooks/exhaustive-deps

  const mudar = (k: number, campo: "termo" | "traducao", valor: string) =>
    // editar à mão descarta a classe/partes antigas: serão refeitas
    setLinhas((ls) =>
      comLinhaNova(ls.map((l) => (l.k === k ? { ...l, [campo]: valor, classe: undefined, partes: undefined } : l))),
    );

  // Saiu da linha: com a tradução automática ligada, completa o lado vazio e
  // classifica a palavra (só se ainda não tiver classe).
  const traduzir = async (k: number) => {
    const l = linhas.find((x) => x.k === k);
    if (!auto || !l || l.traduzindo || l.classe || !(l.termo.trim() || l.traducao.trim())) return;
    setLinhas((ls) => ls.map((x) => (x.k === k ? { ...x, traduzindo: true } : x)));
    setErro(null);
    try {
      const [r] = await analisarPares(ajustes.chaveClaude, item.idioma, [l]);
      setLinhas((ls) =>
        ls.map((x) =>
          x.k !== k
            ? x
            : // se o usuário digitou enquanto a resposta vinha, o que ele digitou vence
              {
                ...x,
                termo: x.termo.trim() || r.termo,
                traducao: x.traducao.trim() || r.traducao,
                classe: r.classe,
                partes: r.partes,
                traduzindo: false,
              },
        ),
      );
    } catch (e) {
      setErro(mensagemErro(e));
      setLinhas((ls) => ls.map((x) => (x.k === k ? { ...x, traduzindo: false } : x)));
    }
  };

  const exportar = async () => {
    setExportando(true);
    setErro(null);
    try {
      let pares = limparPares(semChave(linhas));
      // pares sem classe (escritos com a tradução automática desligada) são
      // classificados agora, numa chamada só, se houver chave
      const faltam = pares.filter((p) => !p.classe || !p.termo || !p.traducao);
      if (ajustes.chaveClaude && faltam.length) {
        try {
          const prontos = await analisarPares(ajustes.chaveClaude, item.idioma, faltam);
          pares = pares.map((p) => (faltam.includes(p) ? prontos[faltam.indexOf(p)] : p));
          setLinhas(comLinhaNova(pares.map((p) => linha(p))));
          lista.atualizar(ultimo.current, { vocabulario: pares });
        } catch (e) {
          setErro(`${mensagemErro(e)} Exportado sem classificar.`);
        }
      }
      await salvarArquivo(
        nomeArquivo(item.titulo),
        csvAnki(pares, { idioma: item.idioma, nivel: item.nivel, frente: ajustes.frente }),
        `Vocabulário: ${item.titulo}`,
      );
      setExportado(true);
      window.setTimeout(() => setExportado(false), 1500);
    } catch {
      /* compartilhamento cancelado */
    } finally {
      setExportando(false);
    }
  };

  const n = contarPalavras(semChave(linhas));
  const prontos = semChave(linhas).filter((p) => p.termo.trim() && p.traducao.trim()).length;

  return (
    <div
      ref={caixa}
      className="animate-surge bg-cartao-verso px-3 pt-1.5 pb-3"
      onBlur={(e) => {
        // saiu do painel: grava já e tira as linhas que ficaram vazias no meio
        if (caixa.current?.contains(e.relatedTarget as Node)) return;
        salvar(linhas);
        setLinhas((ls) => comLinhaNova(ls.filter((l) => l.termo.trim() || l.traducao.trim() || l.traduzindo)));
      }}
    >
      <div className="flex items-center gap-1 text-xs font-semibold text-sub">
        <p role="status" className="min-w-0 flex-1 truncate text-erro">
          {erro}
        </p>
        <span aria-live="polite">
          {n} {n === 1 ? "palavra" : "palavras"}
        </span>
        <button
          type="button"
          aria-label={exportado ? "Baralho exportado" : "Exportar baralho para o Anki (.csv)"}
          title="Exportar baralho para o Anki (.csv)"
          onClick={exportar}
          disabled={prontos === 0 || exportando}
          className={cn(
            "inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-[color,transform] duration-150 active:scale-90 disabled:opacity-40",
            exportado ? "text-ok" : "text-sub",
          )}
        >
          {exportando ? (
            <ArrowPathIcon className="size-5 animate-spin" aria-hidden />
          ) : exportado ? (
            <CheckIcon className="size-5" aria-hidden />
          ) : (
            <ArrowUpTrayIcon className="size-5" aria-hidden />
          )}
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {linhas.map((l, i) => (
          <li
            key={l.k}
            onBlur={(e) => {
              if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) traduzir(l.k);
            }}
          >
            <div className="flex items-center gap-2">
              <input
                value={l.termo}
                onChange={(e) => mudar(l.k, "termo", e.target.value)}
                lang={item.idioma}
                aria-label={`Palavra ${i + 1}`}
                placeholder={l.traduzindo && !l.termo ? "traduzindo…" : i === linhas.length - 1 ? "Palavra" : undefined}
                className={cn(CAMPO_VOCAB, l.traduzindo && !l.termo && "animate-pulse")}
              />
              <ArrowRightIcon className="size-4 shrink-0 text-sub" aria-hidden />
              <input
                value={l.traducao}
                onChange={(e) => mudar(l.k, "traducao", e.target.value)}
                lang="pt-BR"
                aria-label={`Tradução ${i + 1}`}
                placeholder={
                  l.traduzindo && !l.traducao ? "traduzindo…" : i === linhas.length - 1 ? "Tradução" : undefined
                }
                className={cn(CAMPO_VOCAB, l.traduzindo && !l.traducao && "animate-pulse")}
              />
            </div>
            {(l.classe || l.partes) && (
              <p className="mt-0.5 truncate pl-2 text-[11px] text-sub">
                {[l.classe, l.partes && `(${l.partes})`].filter(Boolean).join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const CAMPO_VOCAB = "h-8 min-w-0 flex-1 rounded-app-sm bg-card px-2 text-sm text-ink placeholder:text-sub";
