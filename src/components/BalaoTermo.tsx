// Balão sobre a palavra tocada na legenda: tradução na hora (tradutor do
// aparelho ou Claude, conforme Ajustes) e + para salvar no vocabulário. Tocar
// na tradução abre a folha completa; tocar fora (sem ser noutra palavra) fecha.
import { ArrowPathIcon, CheckIcon, ChevronRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { mensagemErro } from "../lib/claude";
import { traduzirTermo, type Significado } from "../lib/tradutor";
import { useAjustes } from "../store/ajustes";
import type { ItemLista } from "../store/lista";
import { useSalvarTermo } from "./FolhaTermo";

const MARGEM = 16;

export function BalaoTermo({
  item,
  termo,
  fala,
  caixa,
  conhecido,
  onTraduzido,
  onDetalhes,
  onFechar,
}: {
  item: ItemLista;
  termo: string;
  fala: string;
  caixa: DOMRect; // onde está o termo na tela
  conhecido?: Significado; // já traduzido antes (guardado com a legenda)
  onTraduzido: (s: Significado) => void;
  onDetalhes: (s: Significado | null) => void;
  onFechar: () => void;
}) {
  const { ajustes } = useAjustes();
  const [sig, setSig] = useState<Significado | null>(conhecido ?? null);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { salvo, salvar } = useSalvarTermo(item, termo);
  const balao = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; seta: number; abaixo: boolean } | null>(null);

  useEffect(() => {
    if (sig) return;
    let vivo = true;
    traduzirTermo({ motor: ajustes.tradutor, chaveClaude: ajustes.chaveClaude }, item.idioma, termo, fala, (idioma) =>
      setBaixando(idioma),
    )
      .then((s) => {
        if (!vivo) return;
        setSig(s);
        onTraduzido(s);
      })
      .catch((e) => vivo && setErro(mensagemErro(e)))
      .finally(() => vivo && setBaixando(null));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // acima do termo, centralizado nele e preso dentro da tela; a seta aponta para o termo
  useLayoutEffect(() => {
    const el = balao.current;
    if (!el) return;
    const largura = el.offsetWidth;
    const centro = caixa.left + caixa.width / 2;
    const left = Math.min(Math.max(MARGEM, centro - largura / 2), window.innerWidth - MARGEM - largura);
    const acima = caixa.top - el.offsetHeight - 10;
    // sem espaço em cima (termo colado no topo): vai para baixo dele
    const abaixo = acima < MARGEM;
    const seta = Math.min(Math.max(12, centro - left), largura - 12);
    setPos({ left, top: abaixo ? caixa.bottom + 10 : acima, seta, abaixo });
  }, [caixa, sig, baixando, erro]);

  // toque fora fecha (toque noutra palavra troca o balão: quem cuida é a fala)
  useEffect(() => {
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Element;
      if (!balao.current?.contains(alvo) && !alvo.closest?.("[data-i]")) onFechar();
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [onFechar]);

  return (
    <div
      ref={balao}
      role="dialog"
      aria-label={`Tradução de ${termo}`}
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
      className="fixed z-40 flex max-w-[min(320px,calc(100vw-32px))] animate-surge items-stretch rounded-app-sm bg-ink text-paper shadow-lg"
    >
      <button
        type="button"
        onClick={() => onDetalhes(sig)}
        className="flex min-w-0 cursor-pointer flex-col items-start py-2 pr-1 pl-3 text-left"
      >
        <span lang={item.idioma} className="text-xs opacity-70">
          {termo}
        </span>
        {sig ? (
          <span lang="pt-BR" className="flex items-center gap-0.5 text-base leading-tight font-semibold">
            {sig.traducao}
            <ChevronRightIcon className="size-4 shrink-0 opacity-60" aria-label="Mais detalhes" />
          </span>
        ) : erro ? (
          <span className="text-sm font-semibold">{erro}</span>
        ) : (
          <span className="flex items-center gap-1.5 text-sm">
            <ArrowPathIcon className="size-4 animate-spin" aria-hidden />
            {baixando ? `Baixando o tradutor de ${baixando} (~30 MB)…` : "Traduzindo…"}
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label={salvo ? "Está no vocabulário" : "Salvar no vocabulário"}
        title={salvo ? "Está no vocabulário" : "Salvar no vocabulário"}
        disabled={salvo}
        onClick={() => salvar(sig)}
        className="flex w-11 shrink-0 cursor-pointer items-center justify-center rounded-r-app-sm border-l border-paper/20 transition-colors active:bg-paper/10"
      >
        {salvo ? <CheckIcon className="size-5" aria-hidden /> : <PlusIcon className="size-5" aria-hidden />}
      </button>
      {pos && (
        <span
          aria-hidden
          style={{ left: pos.seta - 6 }}
          className={`absolute size-3 rotate-45 bg-ink ${pos.abaixo ? "-top-1.5" : "-bottom-1.5"}`}
        />
      )}
    </div>
  );
}
