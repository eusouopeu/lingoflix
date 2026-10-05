// Tela própria do vocabulário de um título (mock do Pedro, 03/10/2026):
// cabeçalho com voltar, contador e exportação; cartão do título; atalhos para
// o anterior/próximo da Minha lista; e a tabela de pares idioma ⇄ português.
// Cobre a tela inteira (inclusive a barra de abas) e fecha com o voltar do
// Android, via histórico do navegador.
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  ArrowUpTrayIcon,
  BookmarkIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolido, CheckCircleIcon as CheckSolido } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import { Metadados, Poster, TituloEOriginal, useDetalhes } from "../components/partesTitulo";
import { csvAnki } from "../lib/anki";
import { nomeArquivo, salvarArquivo } from "../lib/arquivo";
import { IDIOMAS } from "../lib/catalogo";
import { analisarPares, mensagemErro } from "../lib/claude";
import { contarPalavras, limparPares, type Par } from "../lib/vocabulario";
import { useAjustes } from "../store/ajustes";
import { useLista } from "../store/ListaContexto";
import { paraTitulo, type ItemLista } from "../store/lista";
import { BotaoIcone } from "../ui/BotaoIcone";
import { cn } from "../ui/cn";

const nomeIdioma = (codigo: string) => IDIOMAS.find((l) => l.codigo === codigo)?.nome ?? codigo;

// `ordem`: chaves dos títulos como estavam na Minha lista ao abrir, para o
// anterior/próximo não pular quando um título muda de aba.
export function Vocabulario({
  chave,
  ordem,
  onTrocar,
  onFechar,
}: {
  chave: string;
  ordem: string[];
  onTrocar: (chave: string) => void;
  onFechar: () => void;
}) {
  const { itens } = useLista();
  const item = itens.find((i) => i.chave === chave);
  const presentes = ordem.filter((c) => itens.some((i) => i.chave === c));
  const pos = presentes.indexOf(chave);
  const vizinho = (d: number) => itens.find((i) => i.chave === presentes[pos + d]);

  // voltar do Android (e do navegador) fecha a tela
  const fechar = useRef(onFechar);
  fechar.current = onFechar;
  useEffect(() => {
    history.pushState({ vocabulario: true }, "");
    const aoVoltar = () => fechar.current();
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  // título removido da lista enquanto a tela estava aberta
  useEffect(() => {
    if (!item) history.back();
  }, [item]);

  if (!item) return null;
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-paper">
      <Conteudo
        key={item.chave}
        item={item}
        anterior={vizinho(-1)}
        proximo={vizinho(1)}
        onTrocar={onTrocar}
        onVoltar={() => history.back()}
      />
    </div>
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

function Conteudo({
  item,
  anterior,
  proximo,
  onTrocar,
  onVoltar,
}: {
  item: ItemLista;
  anterior?: ItemLista;
  proximo?: ItemLista;
  onTrocar: (chave: string) => void;
  onVoltar: () => void;
}) {
  const lista = useLista();
  const { ajustes, marcarEstudo } = useAjustes();
  const t = paraTitulo(item);
  const { ref, det, nota } = useDetalhes<HTMLDivElement>(t);
  const [linhas, setLinhas] = useState<Linha[]>(() => comLinhaNova(item.vocabulario.map((p) => linha(p))));
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [exportado, setExportado] = useState(false);
  const tabela = useRef<HTMLDivElement>(null);
  const espera = useRef<number>(undefined);
  const ultimo = useRef(item);
  ultimo.current = item;
  const auto = ajustes.traducaoAuto && !!ajustes.chaveClaude;

  const salvar = (ls: Linha[]) => {
    const limpos = limparPares(semChave(ls));
    if (JSON.stringify(limpos) === JSON.stringify(ultimo.current.vocabulario)) return;
    // palavra nova conta como dia de estudo (aba Estudo)
    if (contarPalavras(limpos) > contarPalavras(ultimo.current.vocabulario)) marcarEstudo();
    lista.atualizar(ultimo.current, { vocabulario: limpos });
  };

  // grava enquanto digita (com folga), para não perder nada se o app fechar
  useEffect(() => {
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => salvar(linhas), 500);
    return () => window.clearTimeout(espera.current);
  }, [linhas]); // eslint-disable-line react-hooks/exhaustive-deps

  // trocar de título ou sair da tela grava o que estiver pendente
  const linhasAtuais = useRef(linhas);
  linhasAtuais.current = linhas;
  useEffect(() => () => salvar(linhasAtuais.current), []); // eslint-disable-line react-hooks/exhaustive-deps

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
        "Exportar baralho",
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
    <div className="mx-auto max-w-2xl px-4 pt-[var(--safe-top)] pb-[calc(var(--safe-bottom)+24px)]">
      <header className="flex items-center gap-1 pt-2 pb-2">
        <BotaoIcone icone={ChevronLeftIcon} rotulo="Voltar" onClick={onVoltar} className="-ml-2.5 text-ink" />
        <h1 className="flex-1 text-2xl font-bold tracking-tight">Vocabulário</h1>
        <span aria-live="polite" className="text-sm font-semibold text-sub">
          {n} {n === 1 ? "palavra" : "palavras"}
        </span>
        <button
          type="button"
          aria-label={exportado ? "Baralho exportado" : "Exportar baralho para o Anki (.csv)"}
          title="Exportar baralho para o Anki (.csv)"
          onClick={exportar}
          disabled={prontos === 0 || exportando}
          className={cn(
            "-mr-2.5 inline-flex size-11 cursor-pointer items-center justify-center rounded-full transition-[color,transform] duration-150 active:scale-90 disabled:opacity-40",
            exportado ? "text-ok" : "text-sub",
          )}
        >
          {exportando ? (
            <ArrowPathIcon className="size-6 animate-spin" aria-hidden />
          ) : exportado ? (
            <CheckIcon className="size-6" aria-hidden />
          ) : (
            <ArrowUpTrayIcon className="size-6" aria-hidden />
          )}
        </button>
      </header>

      <div ref={ref} className="flex gap-3 overflow-hidden rounded-app bg-cartao">
        <div className="aspect-[2/3] w-[72px] shrink-0 overflow-hidden bg-cartao-verso">
          {item.poster && <Poster caminho={item.poster} largura="w154" className="h-full w-full object-cover" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pr-2">
          <TituloEOriginal t={t} />
          <div className="mt-1 flex items-center gap-1">
            <Metadados nota={nota} ano={item.ano} det={det} className="min-w-0 flex-1" />
            <BotaoIcone
              icone={item.status === "quero" ? BookmarkSolido : BookmarkIcon}
              rotulo="Quero ver"
              ativo={item.status === "quero"}
              onClick={() => item.status !== "quero" && lista.alternar(t, "quero", det)}
              className="size-8"
            />
            <BotaoIcone
              icone={item.status === "visto" ? CheckSolido : CheckCircleIcon}
              rotulo="Já vi"
              ativo={item.status === "visto"}
              onClick={() => item.status !== "visto" && lista.alternar(t, "visto", det)}
              className="size-8"
            />
          </div>
        </div>
      </div>

      {(anterior || proximo) && (
        <nav aria-label="Outros títulos" className="mt-2 flex items-center gap-2">
          {anterior && <Vizinho item={anterior} lado="anterior" onClick={() => onTrocar(anterior.chave)} />}
          {proximo && <Vizinho item={proximo} lado="proximo" onClick={() => onTrocar(proximo.chave)} />}
        </nav>
      )}

      <p role="status" className="mt-3 min-h-4 text-xs font-semibold text-erro">
        {erro}
      </p>

      <div
        ref={tabela}
        className="mt-1 rounded-app bg-cartao px-3 pt-3 pb-3"
        onBlur={(e) => {
          // saiu da tabela: grava já e tira as linhas que ficaram vazias no meio
          if (tabela.current?.contains(e.relatedTarget as Node)) return;
          salvar(linhas);
          setLinhas((ls) => comLinhaNova(ls.filter((l) => l.termo.trim() || l.traducao.trim() || l.traduzindo)));
        }}
      >
        <div className="mb-1.5 flex items-center gap-2 text-center text-xs font-bold tracking-wider text-sub uppercase">
          <span className="flex-1">{nomeIdioma(item.idioma)}</span>
          <span className="w-4" aria-hidden />
          <span className="flex-1">Português</span>
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
                  placeholder={
                    l.traduzindo && !l.termo ? "traduzindo…" : i === linhas.length - 1 ? "Palavra" : undefined
                  }
                  className={cn(CAMPO, l.traduzindo && !l.termo && "animate-pulse")}
                />
                <ArrowsRightLeftIcon className="size-4 shrink-0 text-sub" aria-hidden />
                <input
                  value={l.traducao}
                  onChange={(e) => mudar(l.k, "traducao", e.target.value)}
                  lang="pt-BR"
                  aria-label={`Tradução ${i + 1}`}
                  placeholder={
                    l.traduzindo && !l.traducao ? "traduzindo…" : i === linhas.length - 1 ? "Tradução" : undefined
                  }
                  className={cn(CAMPO, l.traduzindo && !l.traducao && "animate-pulse")}
                />
              </div>
              {(l.classe || l.partes) && (
                <p className="mt-0.5 truncate pl-3 text-[11px] text-sub">
                  {[l.classe, l.partes && `(${l.partes})`].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Vizinho({ item, lado, onClick }: { item: ItemLista; lado: "anterior" | "proximo"; onClick: () => void }) {
  const proximo = lado === "proximo";
  const Seta = proximo ? ArrowRightIcon : ArrowLeftIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${proximo ? "Próximo" : "Anterior"}: ${item.titulo}`}
      className={cn(
        "flex min-w-0 flex-1 cursor-pointer items-center gap-2 transition-transform duration-150 active:scale-95",
        proximo && "ml-auto flex-row-reverse text-right",
      )}
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-app-sm bg-cartao text-ink">
        <Seta className="size-5" aria-hidden />
      </span>
      <span className="line-clamp-2 text-sm leading-tight font-semibold text-sub">{item.titulo}</span>
    </button>
  );
}

const CAMPO = "h-10 min-w-0 flex-1 rounded-app-sm bg-card px-3 text-base text-ink placeholder:text-sub";
