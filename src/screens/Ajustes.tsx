// Aba Ajustes: chave da API do Claude (Haiku 4.5), tradução automática do
// vocabulário, nível pelo Claude, frente dos flashcards e backup da lista.
import { CheckCircleIcon, ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { Cabecalho } from "../components/Cabecalho";
import { nomeArquivo, salvarArquivo } from "../lib/arquivo";
import { gerarBackup, itensParaRestaurar, juntarDias, lerBackup } from "../lib/backup";
import { analisarPares, mensagemErro } from "../lib/claude";
import { diaLocal } from "../lib/revisao";
import { useAjustes } from "../store/ajustes";
import { useLista } from "../store/ListaContexto";
import { Ajuda } from "../ui/Ajuda";
import { cn } from "../ui/cn";
import { Segmentado } from "../ui/Segmentado";
import { Switch } from "../ui/Switch";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-app bg-cartao p-4">
      <h2 className="text-sm font-bold text-sub">{titulo}</h2>
      {children}
    </section>
  );
}

export function Ajustes() {
  const { ajustes, mudar } = useAjustes();
  const [chave, setChave] = useState<string | null>(null); // rascunho enquanto edita
  const [visivel, setVisivel] = useState(false);
  const [teste, setTeste] = useState<{ ok: boolean; msg: string } | "testando" | null>(null);
  const valorChave = chave ?? ajustes.chaveClaude;

  const salvarChave = () => {
    if (chave !== null && chave.trim() !== ajustes.chaveClaude) {
      mudar({ chaveClaude: chave.trim(), ...(chave.trim() ? {} : { traducaoAuto: false, nivelIA: false }) });
      setTeste(null);
    }
    setChave(null);
  };

  const testar = async () => {
    setTeste("testando");
    try {
      const [r] = await analisarPares(valorChave.trim(), "en", [{ termo: "firefly", traducao: "" }]);
      setTeste({ ok: true, msg: `Funcionando: firefly → ${r.traducao}` });
    } catch (e) {
      setTeste({ ok: false, msg: mensagemErro(e) });
    }
  };

  return (
    <>
      <Cabecalho titulo="Ajustes" />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-2 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)]">
        <Secao titulo="Tradução automática">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center">
              <label htmlFor="chave-claude" className="text-sm font-semibold">
                Chave da API do Claude
              </label>
              <Ajuda rotulo="Sobre a chave">
                Usa o modelo Claude Haiku 4.5. Crie a chave em console.anthropic.com; o uso é cobrado na sua conta. A
                chave fica salva só neste aparelho.
              </Ajuda>
            </div>
            <div className="relative">
              <input
                id="chave-claude"
                type={visivel ? "text" : "password"}
                value={valorChave}
                onChange={(e) => setChave(e.target.value)}
                onBlur={salvarChave}
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-ant-…"
                className="h-11 w-full rounded-app-sm bg-card pr-11 pl-3 font-mono text-sm text-ink placeholder:text-sub"
              />
              <button
                type="button"
                aria-label={visivel ? "Esconder chave" : "Mostrar chave"}
                title={visivel ? "Esconder chave" : "Mostrar chave"}
                onClick={() => setVisivel(!visivel)}
                className="absolute top-0 right-0 inline-flex size-11 cursor-pointer items-center justify-center text-sub"
              >
                {visivel ? <EyeSlashIcon className="size-5" aria-hidden /> : <EyeIcon className="size-5" aria-hidden />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={testar}
                disabled={!valorChave.trim() || teste === "testando"}
                className="h-9 cursor-pointer rounded-full bg-card-2 px-4 text-xs font-semibold text-ink transition-transform duration-150 active:scale-95 disabled:opacity-40"
              >
                {teste === "testando" ? "Testando…" : "Testar chave"}
              </button>
              {teste && teste !== "testando" && (
                <p
                  role="status"
                  className={cn(
                    "flex min-w-0 animate-surge items-center gap-1 text-xs font-semibold",
                    teste.ok ? "text-ok" : "text-erro",
                  )}
                >
                  {teste.ok ? (
                    <CheckCircleIcon className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <ExclamationCircleIcon className="size-4 shrink-0" aria-hidden />
                  )}
                  <span className="truncate">{teste.msg}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span id="rotulo-auto" className="text-sm font-semibold">
              Traduzir automaticamente
            </span>
            <Ajuda rotulo="Sobre a tradução automática">
              No vocabulário, preencha só a palavra ou só a tradução: ao sair da linha, o outro lado é completado. A
              palavra também ganha classe gramatical e o significado das partes, usados no baralho do Anki.
            </Ajuda>
            <span className="flex-1" />
            <Switch
              idRotulo="rotulo-auto"
              ligado={ajustes.traducaoAuto && !!ajustes.chaveClaude}
              desativado={!ajustes.chaveClaude}
              onChange={(traducaoAuto) => mudar({ traducaoAuto })}
            />
          </div>

          <div className="flex items-center gap-2">
            <span id="rotulo-nivel" className="text-sm font-semibold">
              Nível pelo Claude
            </span>
            <Ajuda rotulo="Sobre o nível pelo Claude">
              O Claude avalia a dificuldade do áudio original de cada título (ritmo, gírias, sotaques, jargão) em vez da
              estimativa pelo gênero. Os títulos são avaliados em lotes conforme aparecem, e cada resultado fica
              guardado no aparelho, sem novo custo. O selo ganha uma faísca.
            </Ajuda>
            <span className="flex-1" />
            <Switch
              idRotulo="rotulo-nivel"
              ligado={ajustes.nivelIA && !!ajustes.chaveClaude}
              desativado={!ajustes.chaveClaude}
              onChange={(nivelIA) => mudar({ nivelIA })}
            />
          </div>
        </Secao>

        <Secao titulo="Flashcards (Anki)">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center">
              <span className="text-sm font-semibold">Frente do cartão</span>
              <Ajuda rotulo="Sobre o baralho">
                O baralho .csv exportado no vocabulário tem 3 colunas: frente; verso; tags (idioma::nível e classe
                gramatical). O lado do idioma estudado traz o significado das partes da palavra, quando houver.
              </Ajuda>
            </div>
            <Segmentado
              rotulo="Frente do cartão"
              valor={ajustes.frente}
              onChange={(frente) => mudar({ frente })}
              opcoes={[
                { valor: "pt", nome: "Português" },
                { valor: "estudo", nome: "Idioma estudado" },
              ]}
            />
          </div>
        </Secao>

        <Backup />
      </main>
    </>
  );
}

// Backup em .json (lista, vocabulário, revisões e dias de estudo; nunca a
// chave da API). Restaurar mescla: fica a versão mais recente de cada título.
function Backup() {
  const { itens, importar } = useLista();
  const { ajustes, mudar } = useAjustes();
  const arquivo = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);

  const exportar = async () => {
    setAviso(null);
    try {
      await salvarArquivo(
        nomeArquivo(`backup ${diaLocal()}`, "json"),
        gerarBackup(itens, ajustes.diasEstudo),
        "Salvar backup",
        "application/json",
      );
    } catch {
      /* compartilhamento cancelado */
    }
  };

  const restaurar = async (f: File | undefined) => {
    if (!f) return;
    try {
      const b = lerBackup(await f.text());
      const novos = itensParaRestaurar(itens, b.lista);
      await importar(novos);
      mudar((a) => ({ diasEstudo: juntarDias(a.diasEstudo, b.diasEstudo) }));
      setAviso({
        ok: true,
        msg: novos.length
          ? `${novos.length} ${novos.length === 1 ? "título restaurado" : "títulos restaurados"}.`
          : "A lista já estava em dia com o backup.",
      });
    } catch (e) {
      setAviso({ ok: false, msg: e instanceof Error ? e.message : "Não foi possível restaurar." });
    } finally {
      if (arquivo.current) arquivo.current.value = "";
    }
  };

  return (
    <Secao titulo="Backup">
      <div className="flex items-center">
        <p className="flex-1 text-sm text-sub">
          {itens.length} {itens.length === 1 ? "título" : "títulos"} na lista
        </p>
        <Ajuda rotulo="Sobre o backup">
          A lista fica só neste aparelho e some se o app for desinstalado. O backup (.json) guarda títulos, vocabulário,
          revisões e dias de estudo; a chave da API não entra. Restaurar não apaga nada: junta o backup à lista e, para
          cada título, fica a versão mais recente.
        </Ajuda>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={exportar}
          disabled={itens.length === 0}
          className="h-10 flex-1 cursor-pointer rounded-full bg-card-2 px-4 text-sm font-semibold text-ink transition-transform duration-150 active:scale-95 disabled:opacity-40"
        >
          Fazer backup
        </button>
        <button
          type="button"
          onClick={() => arquivo.current?.click()}
          className="h-10 flex-1 cursor-pointer rounded-full bg-card-2 px-4 text-sm font-semibold text-ink transition-transform duration-150 active:scale-95"
        >
          Restaurar
        </button>
        <input
          ref={arquivo}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => restaurar(e.target.files?.[0])}
        />
      </div>
      {aviso && (
        <p
          role="status"
          className={cn(
            "flex animate-surge items-center gap-1 text-xs font-semibold",
            aviso.ok ? "text-ok" : "text-erro",
          )}
        >
          {aviso.ok ? (
            <CheckCircleIcon className="size-4 shrink-0" aria-hidden />
          ) : (
            <ExclamationCircleIcon className="size-4 shrink-0" aria-hidden />
          )}
          {aviso.msg}
        </p>
      )}
    </Secao>
  );
}
