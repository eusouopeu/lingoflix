// Folha inferior da tela Legendas: significado do termo tocado no contexto da
// fala (Claude Haiku) e o botão que o salva no vocabulário do título, de onde
// ele segue para a revisão (aba Estudo) e para o baralho do Anki.
import { ArrowPathIcon, CheckIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { explicarTermo, mensagemErro } from "../lib/claude";
import { traduzirTermo, type Significado } from "../lib/tradutor";
import { useAjustes } from "../store/ajustes";
import { useLista } from "../store/ListaContexto";
import type { ItemLista } from "../store/lista";
import { BotaoIcone } from "../ui/BotaoIcone";

const NOME_CLASSE: Record<string, string> = {
  substantivo: "substantivo",
  verbo: "verbo",
  adjetivo: "adjetivo",
  adverbio: "advérbio",
  pronome: "pronome",
  preposicao: "preposição",
  conjuncao: "conjunção",
  interjeicao: "interjeição",
  artigo: "artigo",
  numeral: "numeral",
  expressao: "expressão",
};

// Salvar o termo no vocabulário do título (folha e balão). Sem tradução, o par
// fica com ela vazia: a tradução automática do vocabulário completa depois.
export function useSalvarTermo(item: ItemLista, termo: string) {
  const lista = useLista();
  const { marcarEstudo } = useAjustes();
  const salvo = item.vocabulario.some((p) => p.termo.trim().toLowerCase() === termo.toLowerCase());
  const salvar = (s: Significado | null) => {
    if (salvo) return;
    lista.atualizar(item, {
      vocabulario: [
        ...item.vocabulario,
        { termo, traducao: s?.traducao ?? "", classe: s?.classe, partes: s?.partes || undefined },
      ],
    });
    marcarEstudo();
  };
  return { salvo, salvar };
}

// A folha completa usa o Claude quando há chave (classe, partes e tradução no
// contexto da fala); sem chave, a tradução do aparelho. `previa` é o que o
// balão já mostrou, exibido enquanto o Claude responde.
export function FolhaTermo({
  item,
  termo,
  fala,
  falaPt,
  explicacao: inicial,
  previa,
  onExplicado,
  onFechar,
}: {
  item: ItemLista;
  termo: string;
  fala: string;
  falaPt: string;
  explicacao?: Significado; // já consultada antes (guardada com a legenda)
  previa?: Significado | null;
  onExplicado: (e: Significado) => void;
  onFechar: () => void;
}) {
  const { ajustes } = useAjustes();
  const completa = (e?: Significado | null) => !!e?.classe;
  const [exp, setExp] = useState<Significado | null>(inicial ?? previa ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const chave = ajustes.chaveClaude;
  const { salvo, salvar } = useSalvarTermo(item, termo);

  useEffect(() => {
    if (completa(exp) || (exp && !chave)) return;
    let vivo = true;
    const pedido = chave
      ? explicarTermo(chave, item.idioma, termo, fala)
      : traduzirTermo({ motor: "aparelho", chaveClaude: "" }, item.idioma, termo, fala);
    pedido
      .then((e) => {
        if (!vivo) return;
        setExp(e);
        onExplicado(e);
      })
      .catch((e) => vivo && !exp && setErro(mensagemErro(e)));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo, fala]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal aria-label={termo}>
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-paper/70" />
      <div className="relative animate-surge rounded-t-app bg-card px-4 pt-3 pb-[calc(var(--safe-bottom)+16px)]">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p lang={item.idioma} className="text-2xl font-bold break-words">
              {termo}
            </p>
            {exp?.classe ? (
              <p className="text-xs font-semibold text-sub">
                {NOME_CLASSE[exp.classe] ?? exp.classe}
                {exp.partes && ` · ${exp.partes}`}
              </p>
            ) : (
              exp &&
              chave &&
              !erro && (
                <p className="flex items-center gap-1.5 text-xs text-sub">
                  <ArrowPathIcon className="size-3 animate-spin" aria-hidden /> Buscando mais detalhes…
                </p>
              )
            )}
          </div>
          <BotaoIcone icone={XMarkIcon} rotulo="Fechar" onClick={onFechar} className="-mt-1 -mr-2.5" />
        </div>

        <div aria-live="polite" className="mt-2 min-h-7 text-lg">
          {exp ? (
            <p lang="pt-BR">{exp.traducao}</p>
          ) : erro ? (
            <p className="text-sm font-semibold text-erro">{erro}</p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-sub">
              <ArrowPathIcon className="size-4 animate-spin" aria-hidden /> Buscando o significado…
            </p>
          )}
        </div>

        <div className="mt-3 rounded-app-sm bg-card-2 px-3 py-2 text-sm">
          <p lang={item.idioma}>{fala}</p>
          {falaPt && (
            <p lang="pt-BR" className="mt-1 text-sub">
              {falaPt}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => salvar(exp)}
          disabled={salvo}
          className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-caneta-500 text-sm font-bold text-on-caneta transition-transform duration-150 active:scale-[0.98] disabled:bg-card-2 disabled:text-ok"
        >
          {salvo ? (
            <>
              <CheckIcon className="size-5" aria-hidden /> Está no vocabulário
            </>
          ) : (
            <>
              <PlusIcon className="size-5" aria-hidden /> Salvar no vocabulário
            </>
          )}
        </button>
      </div>
    </div>
  );
}
