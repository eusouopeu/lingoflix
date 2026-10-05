// Fala da legenda com cada palavra tocável (tela Legendas). Toque seleciona a
// palavra. Segurar começa uma expressão: arrastando, ela se estende até onde o
// dedo soltar; sem arrastar, o próximo toque marca a última palavra.
import { useRef, useState } from "react";
import type { Token } from "../lib/legenda";
import { cn } from "../ui/cn";

const SEGURAR_MS = 350;

interface Faixa {
  ancora: number;
  ate: number;
  arrastando: boolean;
}

export function FalaTocavel({
  tokens,
  idioma,
  onSelecionar,
  className,
}: {
  tokens: Token[];
  idioma: string;
  onSelecionar: (ini: number, fim: number) => void;
  className?: string;
}) {
  // âncora da expressão em andamento e a palavra até onde ela vai
  // (a ref acompanha o estado: o soltar do dedo pode chegar antes do novo render)
  const [faixa, setFaixaEstado] = useState<Faixa | null>(null);
  const faixaRef = useRef<Faixa | null>(null);
  const setFaixa = (f: Faixa | null) => {
    faixaRef.current = f;
    setFaixaEstado(f);
  };
  const toque = useRef<{ i: number; x: number; y: number; timer: number; longo: boolean } | null>(null);

  const indiceEm = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-i]");
    return el ? Number(el.dataset.i) : null;
  };

  const terminar = (ini: number, fim: number) => {
    setFaixa(null);
    onSelecionar(Math.min(ini, fim), Math.max(ini, fim));
  };

  const [a, b] = faixa ? [Math.min(faixa.ancora, faixa.ate), Math.max(faixa.ancora, faixa.ate)] : [-1, -1];

  return (
    <div>
      <p
        lang={idioma}
        className={cn("touch-none select-none [-webkit-touch-callout:none]", className)}
        onContextMenu={(e) => e.preventDefault()}
        onPointerMove={(e) => {
          const t = toque.current;
          if (!t) return;
          if (!t.longo) {
            // mexeu antes de segurar: é rolagem, não toque
            if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10) {
              clearTimeout(t.timer);
              toque.current = null;
            }
            return;
          }
          const i = indiceEm(e.clientX, e.clientY);
          const f = faixaRef.current;
          if (i != null && f) setFaixa({ ...f, ate: i, arrastando: f.arrastando || i !== f.ancora });
        }}
        onPointerUp={() => {
          const t = toque.current;
          toque.current = null;
          if (!t) return;
          clearTimeout(t.timer);
          const faixa = faixaRef.current;
          if (t.longo) {
            // arrastou: a expressão está pronta; senão espera o toque na última palavra
            if (faixa?.arrastando) terminar(faixa.ancora, faixa.ate);
            return;
          }
          if (faixa) terminar(faixa.ancora, t.i);
          else terminar(t.i, t.i);
        }}
        onPointerCancel={() => {
          if (toque.current) clearTimeout(toque.current.timer);
          toque.current = null;
        }}
      >
        {tokens.map((tk, i) =>
          tk.palavra ? (
            <span
              key={i}
              data-i={i}
              onPointerDown={(e) => {
                const timer = window.setTimeout(() => {
                  if (!toque.current) return;
                  toque.current.longo = true;
                  navigator.vibrate?.(15);
                  setFaixa({ ancora: i, ate: i, arrastando: false });
                }, SEGURAR_MS);
                toque.current = { i, x: e.clientX, y: e.clientY, timer, longo: false };
                // o arrasto continua chegando ao <p> mesmo fora da palavra
                (e.currentTarget.parentElement as HTMLElement).setPointerCapture?.(e.pointerId);
              }}
              className={cn(
                "cursor-pointer rounded-[4px] transition-colors duration-100",
                i >= a && i <= b ? "bg-caneta-200 text-caneta" : "active:bg-caneta-soft",
              )}
            >
              {tk.texto}
            </span>
          ) : (
            <span key={i} className={cn(i > a && i < b && "bg-caneta-200")}>
              {tk.texto}
            </span>
          ),
        )}
      </p>
      {faixa && !faixa.arrastando && (
        <p role="status" className="mt-1 flex items-center gap-2 text-xs font-semibold text-caneta">
          Toque na última palavra da expressão
          <button type="button" onClick={() => setFaixa(null)} className="cursor-pointer text-sub underline">
            cancelar
          </button>
        </p>
      )}
    </div>
  );
}
