// Cartão da Minha lista (mock do Pedro, 02/10/2026): miniatura do pôster ao
// lado do título, metadados e ações. ⓘ abre o painel da sinopse (gêneros,
// nível, texto justificado); ✎ abre o vocabulário (pares termo → tradução,
// com contador e exportação). Só um painel aberto por vez.
import {
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
import { contarPalavras, limparPares, textoExportacao, type Par } from "../lib/vocabulario";
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
        className
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
            <Acao icone={InformationCircleIcon} rotulo="Sinopse" alterna ativo={painel === "info"} onClick={() => alternarPainel("info")} />
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

const VAZIO: Par = { termo: "", traducao: "" };
const comLinhaNova = (pares: Par[]) => [...pares, VAZIO];

function Vocabulario({ item }: { item: ItemLista }) {
  const lista = useLista();
  const [pares, setPares] = useState<Par[]>(() => comLinhaNova(item.vocabulario));
  const [copiado, setCopiado] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const espera = useRef<number>(undefined);
  const ultimo = useRef(item);
  ultimo.current = item;

  const salvar = (ps: Par[]) => {
    const limpos = limparPares(ps);
    if (JSON.stringify(limpos) !== JSON.stringify(ultimo.current.vocabulario)) lista.atualizar(ultimo.current, { vocabulario: limpos });
  };

  // grava enquanto digita (com folga), para não perder nada se o app fechar
  useEffect(() => {
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => salvar(pares), 500);
    return () => window.clearTimeout(espera.current);
  }, [pares]); // eslint-disable-line react-hooks/exhaustive-deps

  const mudar = (i: number, campo: keyof Par, valor: string) =>
    setPares((ps) => {
      const novos = ps.map((p, j) => (j === i ? { ...p, [campo]: valor } : p));
      // sempre sobra uma linha em branco no fim para a próxima palavra
      const fim = novos[novos.length - 1];
      return fim.termo || fim.traducao ? comLinhaNova(novos) : novos;
    });

  const exportar = async () => {
    const texto = textoExportacao(item.titulo, pares);
    try {
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import("@capacitor/share");
        await Share.share({ title: `Vocabulário: ${item.titulo}`, text: texto, dialogTitle: "Exportar vocabulário" });
      } else if (navigator.share) {
        await navigator.share({ title: `Vocabulário: ${item.titulo}`, text: texto });
      } else {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 1500);
      }
    } catch {
      /* compartilhamento cancelado */
    }
  };

  const n = contarPalavras(pares);

  return (
    <div
      ref={caixa}
      className="animate-surge bg-cartao-verso px-3 pt-1.5 pb-3"
      onBlur={(e) => {
        // saiu do painel: grava já e tira as linhas que ficaram vazias no meio
        if (caixa.current?.contains(e.relatedTarget as Node)) return;
        salvar(pares);
        setPares((ps) => comLinhaNova(limparPares(ps)));
      }}
    >
      <div className="flex items-center justify-end gap-1 text-xs font-semibold text-sub">
        <span aria-live="polite">
          {n} {n === 1 ? "palavra" : "palavras"}
        </span>
        <button
          type="button"
          aria-label={copiado ? "Copiado" : "Exportar vocabulário"}
          title="Exportar vocabulário"
          onClick={exportar}
          disabled={n === 0}
          className={cn(
            "inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-[color,transform] duration-150 active:scale-90 disabled:opacity-40",
            copiado ? "text-ok" : "text-sub"
          )}
        >
          {copiado ? <CheckIcon className="size-5" aria-hidden /> : <ArrowUpTrayIcon className="size-5" aria-hidden />}
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {pares.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              value={p.termo}
              onChange={(e) => mudar(i, "termo", e.target.value)}
              lang={item.idioma}
              aria-label={`Palavra ${i + 1}`}
              placeholder={i === pares.length - 1 ? "Palavra" : undefined}
              className="h-8 min-w-0 flex-1 rounded-app-sm bg-card px-2 text-sm text-ink placeholder:text-sub"
            />
            <ArrowRightIcon className="size-4 shrink-0 text-sub" aria-hidden />
            <input
              value={p.traducao}
              onChange={(e) => mudar(i, "traducao", e.target.value)}
              lang="pt-BR"
              aria-label={`Tradução ${i + 1}`}
              placeholder={i === pares.length - 1 ? "Tradução" : undefined}
              className="h-8 min-w-0 flex-1 rounded-app-sm bg-card px-2 text-sm text-ink placeholder:text-sub"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
