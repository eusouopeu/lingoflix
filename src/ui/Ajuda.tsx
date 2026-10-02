// ⓘ ao lado do texto a que se refere; abre balão flutuante (portal) preso às
// margens de 12px. Fecha com outro toque, toque fora, Esc ou rolagem.
// Mesmo comportamento do Ajuda do rotinas (_shared/design-standards.md).
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

const MARGEM = 12;
const LARGURA = 280;

export function Ajuda({ children, rotulo = "Como funciona" }: { children: ReactNode; rotulo?: string }) {
  const [aberta, setAberta] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const balao = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!aberta || !botao.current) return;
    const r = botao.current.getBoundingClientRect();
    const largura = Math.min(LARGURA, window.innerWidth - MARGEM * 2);
    const left = Math.min(Math.max(MARGEM, r.left + r.width / 2 - largura / 2), window.innerWidth - MARGEM - largura);
    const altura = balao.current?.offsetHeight || 80;
    const acima = r.bottom + 6 + altura > window.innerHeight - MARGEM && r.top - 6 - altura > MARGEM;
    setPos({ left, top: acima ? r.top - 6 - altura : r.bottom + 6 });
  }, [aberta]);

  useEffect(() => {
    if (!aberta) return;
    const fora = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!balao.current?.contains(t) && !botao.current?.contains(t)) setAberta(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    const fechar = () => setAberta(false);
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("pointerdown", fora, true);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [aberta]);

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-expanded={aberta}
        aria-label={rotulo}
        title={rotulo}
        onClick={(e) => {
          e.stopPropagation();
          setPos(null);
          setAberta(!aberta);
        }}
        className={cn(
          "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[color,transform] duration-150 active:scale-90",
          aberta ? "text-caneta" : "text-sub"
        )}
      >
        <InformationCircleIcon className="size-5" aria-hidden />
      </button>
      {aberta &&
        createPortal(
          <div
            ref={balao}
            role="tooltip"
            className={cn(
              "fixed z-50 rounded-app-sm bg-ink px-3 py-2.5 text-sm leading-[1.45] text-card",
              pos ? "animate-surge" : "invisible"
            )}
            style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, width: Math.min(LARGURA, window.innerWidth - MARGEM * 2) }}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}
