// Cartão da Minha lista (mock do Pedro, 02/10/2026): miniatura do pôster ao
// lado do título, metadados e ações. ⓘ abre o painel da sinopse (gêneros,
// nível, texto justificado); ✎ abre a tela do vocabulário (screens/Vocabulario).
import {
  BookmarkIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolido, CheckCircleIcon as CheckSolido } from "@heroicons/react/24/solid";
import { useState, type ComponentType, type SVGProps } from "react";
import { contarPalavras } from "../lib/vocabulario";
import { useLista } from "../store/ListaContexto";
import { paraTitulo, type ItemLista } from "../store/lista";
import { cn } from "../ui/cn";
import { SeloNivel } from "../ui/SeloNivel";
import { Etiquetas, Logos, Metadados, Poster, TituloEOriginal, useDetalhes } from "./partesTitulo";

type Painel = "info" | null;
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

// `nivelIA`: o nível do item já veio do Claude (useNiveisIA na Minha lista).
export function CartaoLista({
  item,
  nivelIA,
  onVocabulario,
}: {
  item: ItemLista;
  nivelIA?: boolean;
  onVocabulario: () => void;
}) {
  const t = { ...paraTitulo(item), nivelIA };
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
              rotulo={`Vocabulário (${contarPalavras(item.vocabulario)})`}
              ativo={item.vocabulario.length > 0}
              onClick={onVocabulario}
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
            <Logos t={t} det={det} className="ml-auto" />
          </div>
        </div>
      </div>

      {painel === "info" && (
        <div className="animate-surge bg-cartao-verso px-3 pt-2.5 pb-3">
          <div className="flex items-start gap-2">
            <div className="flex flex-1 flex-wrap gap-1">
              <Etiquetas generos={generos} max={3} />
            </div>
            <SeloNivel nivel={t.nivel} idioma={item.idioma} ia={t.nivelIA} neutro />
          </div>
          <p lang="pt-BR" className="mt-2 line-clamp-6 text-[13px] leading-[1.45] text-ink text-justify hyphens-auto">
            {sinopse || "Sinopse não disponível."}
          </p>
        </div>
      )}
    </li>
  );
}
