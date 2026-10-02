// Lista pessoal: "Quero ver" e "Já vi". Cada item guarda anotações de
// vocabulário (palavras e expressões aprendidas com o título).
import { BookmarkIcon, CheckCircleIcon, FilmIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PencilSquareIcon as PencilSolido } from "@heroicons/react/24/solid";
import { useState } from "react";
import { IMG } from "../lib/tmdb";
import { useLista } from "../store/ListaContexto";
import type { ItemLista, Status } from "../store/lista";
import { BotaoIcone } from "../ui/BotaoIcone";
import { Segmentado } from "../ui/Segmentado";
import { SeloNivel } from "../ui/SeloNivel";

export function MinhaLista() {
  const { itens } = useLista();
  const [aba, setAba] = useState<Status>("quero");
  const daAba = itens.filter((i) => i.status === aba);
  const conta = (s: Status) => itens.filter((i) => i.status === s).length;

  return (
    <>
      <header className="sticky top-0 z-10 bg-card-blur pt-[var(--safe-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pt-3 pb-3">
          <h1 className="text-2xl font-bold tracking-tight">Minha lista</h1>
          <Segmentado
            rotulo="Situação"
            valor={aba}
            onChange={setAba}
            opcoes={[
              { valor: "quero", nome: `Quero ver · ${conta("quero")}` },
              { valor: "visto", nome: `Já vi · ${conta("visto")}` },
            ]}
          />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)]">
        {daAba.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-sub">
            <FilmIcon className="size-10" aria-hidden />
            <p>{aba === "quero" ? "Marque títulos com o marcador para vê-los aqui." : "Títulos marcados como vistos aparecem aqui."}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {daAba.map((i) => (
              <Linha key={i.chave} item={i} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function Linha({ item }: { item: ItemLista }) {
  const lista = useLista();
  const [notasAbertas, setNotasAbertas] = useState(false);
  const [notas, setNotas] = useState(item.notas);
  const original = item.tituloOriginal !== item.titulo ? item.tituloOriginal : null;

  return (
    <li className="animate-surge">
      <div className="flex gap-3">
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-app-sm bg-card-2">
          {item.poster && <img src={`${IMG}/w154${item.poster}`} alt="" loading="lazy" className="h-full w-full object-cover" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold">{item.titulo}</h2>
              {original && (
                <p className="truncate text-sm text-sub" lang={item.idioma}>
                  {original}
                </p>
              )}
            </div>
            <SeloNivel nivel={item.nivel} idioma={item.idioma} className="mt-1" />
          </div>
          <div className="mt-auto -ml-2.5 flex items-center">
            {item.status === "quero" ? (
              <BotaoIcone icone={CheckCircleIcon} rotulo="Marcar como visto" onClick={() => lista.atualizar(item, { status: "visto" })} />
            ) : (
              <BotaoIcone icone={BookmarkIcon} rotulo="Voltar para quero ver" onClick={() => lista.atualizar(item, { status: "quero" })} />
            )}
            <BotaoIcone
              icone={PencilSquareIcon}
              iconeAtivo={PencilSolido}
              ativo={notasAbertas || item.notas.length > 0}
              rotulo="Anotações de vocabulário"
              onClick={() => setNotasAbertas(!notasAbertas)}
            />
            <BotaoIcone icone={TrashIcon} rotulo="Remover da lista" onClick={() => lista.remover(item.chave)} className="ml-auto" />
          </div>
        </div>
      </div>
      {notasAbertas && (
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={() => notas !== item.notas && lista.atualizar(item, { notas })}
          rows={4}
          aria-label="Anotações de vocabulário"
          placeholder="Palavras e expressões do filme…"
          lang={item.idioma}
          className="mt-2 w-full animate-surge resize-y rounded-app-sm bg-card-2 p-3 text-base text-ink placeholder:text-sub"
        />
      )}
    </li>
  );
}
