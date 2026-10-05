// Aba Estudo: revisão espaçada do vocabulário da lista, progresso por idioma
// (palavras, títulos vistos por nível, dias seguidos) e o baralho do Anki de
// um idioma inteiro.
import { AcademicCapIcon, ArrowPathIcon, ArrowUpTrayIcon, CheckIcon, FireIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Cabecalho } from "../components/Cabecalho";
import { SessaoRevisao, type Cartao } from "../components/SessaoRevisao";
import { csvAnkiIdioma } from "../lib/anki";
import { nomeArquivo, salvarArquivo } from "../lib/arquivo";
import { IDIOMAS } from "../lib/catalogo";
import { rotuloNivel } from "../lib/nivel";
import { progressoPorIdioma, sequencia } from "../lib/progresso";
import { diaLocal, ehNovo, venceu } from "../lib/revisao";
import { useAjustes } from "../store/ajustes";
import { useLista } from "../store/ListaContexto";
import type { ItemLista } from "../store/lista";
import { Ajuda } from "../ui/Ajuda";
import { Chip } from "../ui/Chip";
import { cn } from "../ui/cn";

const NOVAS_POR_SESSAO = 20;
const nomeIdioma = (codigo: string) => IDIOMAS.find((l) => l.codigo === codigo)?.nome ?? codigo;

function Secao({ titulo, ajuda, children }: { titulo: string; ajuda?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-app bg-cartao p-4">
      <div className="flex h-5 items-center">
        <h2 className="flex-1 text-sm font-bold text-sub">{titulo}</h2>
        {ajuda && (
          <span className="-mr-3">
            <Ajuda rotulo={`Sobre ${titulo.toLowerCase()}`}>{ajuda}</Ajuda>
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

// Cartões de hoje: os vencidos (mais atrasados primeiro) e até 20 novos.
function cartoesDeHoje(itens: ItemLista[], idioma: string | null, hoje: string) {
  const todos: Cartao[] = itens
    .filter((i) => idioma === null || i.idioma === idioma)
    .flatMap((i) =>
      i.vocabulario
        .filter((p) => p.termo.trim() && p.traducao.trim())
        .map((par) => ({ chave: i.chave, titulo: i.titulo, idioma: i.idioma, par })),
    );
  const vencidos = todos
    .filter((c) => venceu(c.par, hoje))
    .sort((a, b) => a.par.revisao!.proxima.localeCompare(b.par.revisao!.proxima));
  const novos = todos.filter((c) => ehNovo(c.par));
  return { vencidos, novos, sessao: [...vencidos, ...novos.slice(0, NOVAS_POR_SESSAO)] };
}

export function Estudo() {
  const { itens } = useLista();
  const { ajustes } = useAjustes();
  const hoje = diaLocal();
  const [idioma, setIdioma] = useState<string | null>(null);
  const [sessao, setSessao] = useState<Cartao[] | null>(null);

  const progresso = progressoPorIdioma(itens);
  const comPalavras = progresso.filter((p) => p.palavras > 0).map((p) => p.idioma);
  // idioma escolhido que deixou de ter palavras volta para "todos"
  const filtro = idioma && comPalavras.includes(idioma) ? idioma : null;
  const { vencidos, novos, sessao: deHoje } = cartoesDeHoje(itens, filtro, hoje);
  const dias = sequencia(ajustes.diasEstudo, hoje);

  return (
    <>
      <Cabecalho titulo="Estudo" />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-2 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)]">
        {sessao ? (
          <SessaoRevisao cartoes={sessao} onFim={() => setSessao(null)} />
        ) : itens.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-sub">
            <AcademicCapIcon className="size-10" aria-hidden />
            <p>Marque títulos e anote palavras no vocabulário da Minha lista para estudar aqui.</p>
          </div>
        ) : (
          <>
            <Secao
              titulo="Revisão"
              ajuda="Repetição espaçada (SM-2): cada acerto afasta a próxima revisão da palavra; um erro a traz de volta amanhã. Por sessão entram todas as palavras vencidas e até 20 novas."
            >
              {comPalavras.length === 0 && (
                <p className="text-sm text-sub">
                  Abra o vocabulário (✎) de um título da Minha lista e anote palavras com a tradução.
                </p>
              )}
              {comPalavras.length > 1 && (
                <div role="group" aria-label="Idioma" className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4">
                  <Chip ativo={filtro === null} onClick={() => setIdioma(null)}>
                    Todos
                  </Chip>
                  {comPalavras.map((c) => (
                    <Chip
                      key={c}
                      ativo={filtro === c}
                      rotulo={nomeIdioma(c)}
                      onClick={() => setIdioma(filtro === c ? null : c)}
                    >
                      {c.toUpperCase()}
                    </Chip>
                  ))}
                </div>
              )}
              {comPalavras.length > 0 && (
                <>
                  <div className="flex items-baseline gap-4">
                    <Numero valor={vencidos.length} rotulo="para revisar" />
                    <Numero valor={novos.length} rotulo={novos.length === 1 ? "nova" : "novas"} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSessao(deHoje)}
                    disabled={deHoje.length === 0}
                    className="h-12 cursor-pointer rounded-app bg-caneta text-base font-semibold text-on-caneta transition-transform duration-150 active:scale-[0.98] disabled:cursor-default disabled:opacity-40"
                  >
                    {deHoje.length
                      ? `Revisar ${deHoje.length} ${deHoje.length === 1 ? "cartão" : "cartões"}`
                      : "Tudo em dia"}
                  </button>
                </>
              )}
            </Secao>

            <Secao titulo="Progresso">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <FireIcon className={cn("size-6", dias ? "text-trailer" : "text-sub")} aria-hidden />
                {dias === 0
                  ? "Revise ou anote uma palavra hoje para começar uma sequência."
                  : `${dias} ${dias === 1 ? "dia seguido" : "dias seguidos"} de estudo`}
              </p>
              <ul className="flex flex-col gap-2">
                {progresso.map((p) => (
                  <li key={p.idioma} className="rounded-app-sm bg-card px-3 py-2.5">
                    <p className="text-sm font-bold">{nomeIdioma(p.idioma)}</p>
                    <p className="mt-0.5 text-xs text-sub">
                      {p.palavras} {p.palavras === 1 ? "palavra" : "palavras"} · {p.aprendidas}{" "}
                      {p.aprendidas === 1 ? "aprendida" : "aprendidas"} · {p.quero} para ver
                    </p>
                    <div className="mt-1.5 flex gap-1.5">
                      {p.vistos.map((n, nivel) => (
                        <span
                          key={nivel}
                          className="rounded-full bg-card-2 px-2 py-0.5 text-[11px] font-semibold text-ink"
                          title={`Títulos vistos de nível ${rotuloNivel(nivel as 0 | 1 | 2, p.idioma)}`}
                        >
                          {rotuloNivel(nivel as 0 | 1 | 2, p.idioma)}: {n} {n === 1 ? "visto" : "vistos"}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Secao>

            {comPalavras.length > 0 && (
              <Secao
                titulo="Baralho do Anki"
                ajuda="Um .csv com o vocabulário de todos os títulos do idioma, sem repetir palavra. Mesmo formato do baralho de cada título: frente; verso; tags (idioma::nível e classe gramatical)."
              >
                <ul className="flex flex-col gap-1">
                  {comPalavras.map((c) => (
                    <BaralhoIdioma key={c} idioma={c} itens={itens} />
                  ))}
                </ul>
              </Secao>
            )}
          </>
        )}
      </main>
    </>
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <p className="text-sm text-sub">
      <span className="mr-1 text-3xl font-bold text-ink">{valor}</span>
      {rotulo}
    </p>
  );
}

function BaralhoIdioma({ idioma, itens }: { idioma: string; itens: ItemLista[] }) {
  const { ajustes } = useAjustes();
  const [estado, setEstado] = useState<"livre" | "exportando" | "feito">("livre");
  const { csv, total } = csvAnkiIdioma(itens, idioma, ajustes.frente);

  const exportar = async () => {
    setEstado("exportando");
    try {
      await salvarArquivo(nomeArquivo(`baralho ${nomeIdioma(idioma)}`), csv, "Exportar baralho");
      setEstado("feito");
      window.setTimeout(() => setEstado("livre"), 1500);
    } catch {
      setEstado("livre"); // compartilhamento cancelado
    }
  };

  return (
    <li className="flex items-center gap-2">
      <span className="flex-1 text-sm font-semibold">
        {nomeIdioma(idioma)}{" "}
        <span className="font-normal text-sub">
          · {total} {total === 1 ? "cartão" : "cartões"}
        </span>
      </span>
      <button
        type="button"
        onClick={exportar}
        disabled={estado !== "livre"}
        aria-label={`Exportar baralho de ${nomeIdioma(idioma)} (.csv)`}
        title="Exportar baralho (.csv)"
        className={cn(
          "inline-flex size-11 cursor-pointer items-center justify-center rounded-full transition-[color,transform] duration-150 active:scale-90",
          estado === "feito" ? "text-ok" : "text-sub",
        )}
      >
        {estado === "exportando" ? (
          <ArrowPathIcon className="size-5 animate-spin" aria-hidden />
        ) : estado === "feito" ? (
          <CheckIcon className="size-5" aria-hidden />
        ) : (
          <ArrowUpTrayIcon className="size-5" aria-hidden />
        )}
      </button>
    </li>
  );
}
