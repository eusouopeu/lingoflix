// Sessão de revisão (aba Estudo): um cartão por vez, frente conforme os
// Ajustes. "Mostrar resposta" vira o cartão; os quatro botões dão a nota do
// SM-2. "Errei" devolve o cartão ao fim da fila desta mesma sessão.
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { revisar, diaLocal, type Resposta } from "../lib/revisao";
import type { Par } from "../lib/vocabulario";
import { useAjustes } from "../store/ajustes";
import { useLista } from "../store/ListaContexto";
import { BotaoIcone } from "../ui/BotaoIcone";
import { cn } from "../ui/cn";

export interface Cartao {
  chave: string; // item da lista de onde o par veio
  titulo: string;
  idioma: string;
  par: Par;
}

const BOTOES: { r: Resposta; nome: string; cor: string }[] = [
  { r: "errei", nome: "Errei", cor: "bg-nota-baixa" },
  { r: "dificil", nome: "Difícil", cor: "bg-tag-ambar" },
  { r: "bom", nome: "Bom", cor: "bg-nota-alta" },
  { r: "facil", nome: "Fácil", cor: "bg-tag-azul" },
];

const mesmoPar = (a: Par, b: Par) => a.termo === b.termo && a.traducao === b.traducao;

export function SessaoRevisao({ cartoes, onFim }: { cartoes: Cartao[]; onFim: () => void }) {
  const { ajustes, marcarEstudo } = useAjustes();
  const lista = useLista();
  const [fila, setFila] = useState(cartoes);
  const [virado, setVirado] = useState(false);
  const [feitos, setFeitos] = useState(0);
  const [erros, setErros] = useState(0);

  const atual = fila[0];

  const responder = (r: Resposta) => {
    const item = lista.itens.find((i) => i.chave === atual.chave);
    const revisao = revisar(atual.par.revisao, r, diaLocal());
    if (item) {
      const vocabulario = item.vocabulario.map((p) => (mesmoPar(p, atual.par) ? { ...p, revisao } : p));
      lista.atualizar(item, { vocabulario });
    }
    marcarEstudo();
    const resto = fila.slice(1);
    if (r === "errei") {
      setErros((n) => n + 1);
      setFila([...resto, { ...atual, par: { ...atual.par, revisao } }]);
    } else {
      setFeitos((n) => n + 1);
      setFila(resto);
    }
    setVirado(false);
  };

  if (!atual)
    return (
      <div className="flex animate-surge flex-col items-center gap-3 rounded-app bg-cartao px-4 py-10 text-center">
        <CheckCircleIcon className="size-12 text-ok" aria-hidden />
        <p className="text-lg font-bold">Revisão concluída</p>
        <p className="text-sm text-sub">
          {feitos} {feitos === 1 ? "cartão revisado" : "cartões revisados"}
          {erros > 0 && ` · ${erros} ${erros === 1 ? "erro repassado" : "erros repassados"}`}
        </p>
        <button
          type="button"
          onClick={onFim}
          className="mt-2 h-11 cursor-pointer rounded-app bg-caneta px-6 text-sm font-semibold text-on-caneta transition-transform duration-150 active:scale-[0.98]"
        >
          Voltar
        </button>
      </div>
    );

  const estudo = (
    <span lang={atual.idioma} className="text-2xl font-bold">
      {atual.par.termo}
    </span>
  );
  const pt = (
    <span lang="pt-BR" className="text-2xl font-bold">
      {atual.par.traducao}
    </span>
  );
  const [frente, verso] = ajustes.frente === "pt" ? [pt, estudo] : [estudo, pt];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center text-xs font-semibold text-sub">
        <span aria-live="polite" className="flex-1">
          Faltam {fila.length} · {atual.titulo}
        </span>
        <BotaoIcone icone={XMarkIcon} rotulo="Encerrar revisão" onClick={onFim} className="-mr-2 size-9" />
      </div>

      <button
        type="button"
        onClick={() => setVirado(true)}
        disabled={virado}
        aria-label={virado ? undefined : "Mostrar resposta"}
        className="flex min-h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-app bg-cartao px-4 py-8 text-center disabled:cursor-default"
      >
        {frente}
        {virado ? (
          <div className="flex animate-surge flex-col items-center gap-1 border-t border-line pt-4">
            {verso}
            {(atual.par.classe || atual.par.partes) && (
              <span className="text-xs text-sub">
                {[atual.par.classe, atual.par.partes && `(${atual.par.partes})`].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm font-semibold text-caneta">Toque para ver a resposta</span>
        )}
      </button>

      <div className={cn("grid grid-cols-4 gap-2", !virado && "invisible")}>
        {BOTOES.map((b) => (
          <button
            key={b.r}
            type="button"
            onClick={() => responder(b.r)}
            disabled={!virado}
            className={cn(
              "h-12 cursor-pointer rounded-app-sm text-sm font-semibold text-on-caneta transition-transform duration-150 active:scale-95",
              b.cor,
            )}
          >
            {b.nome}
          </button>
        ))}
      </div>
    </div>
  );
}
