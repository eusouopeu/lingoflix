// Barra superior das duas abas: título, tema claro/escuro e o botão que
// recolhe os ajustes (gênero, streaming, ordem), com contador do que está ativo.
import { AdjustmentsHorizontalIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { AdjustmentsHorizontalIcon as AjustesSolido } from "@heroicons/react/24/solid";
import { useSyncExternalStore, type ReactNode } from "react";
import { aplicarTema, assinarTema, temaAtual } from "../lib/tema";
import { BotaoIcone } from "../ui/BotaoIcone";

export function Cabecalho({
  titulo,
  ajustes,
  onAjustes,
  ajustesAtivos,
  children,
}: {
  titulo: string;
  ajustes: boolean;
  onAjustes: () => void;
  ajustesAtivos: number;
  children: ReactNode;
}) {
  const tema = useSyncExternalStore(assinarTema, temaAtual);
  const escuro = tema === "escuro";
  return (
    <header className="sticky top-0 z-10 bg-card-blur pt-[var(--safe-top)] backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 pt-2 pb-3">
        <div className="flex items-center">
          <h1 className="flex-1 text-2xl font-bold tracking-tight">{titulo}</h1>
          <BotaoIcone
            icone={escuro ? SunIcon : MoonIcon}
            rotulo={escuro ? "Usar tema claro" : "Usar tema escuro"}
            onClick={() => {
              aplicarTema(escuro ? "claro" : "escuro");
            }}
          />
          <span className="relative">
            <BotaoIcone
              icone={AdjustmentsHorizontalIcon}
              iconeAtivo={AjustesSolido}
              ativo={ajustes}
              rotulo="Gênero, streaming e ordem"
              onClick={onAjustes}
            />
            {ajustesAtivos > 0 && (
              <span className="pointer-events-none absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-caneta text-[10px] font-bold text-on-caneta">
                {ajustesAtivos}
              </span>
            )}
          </span>
        </div>
        {children}
      </div>
    </header>
  );
}
