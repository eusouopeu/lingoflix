import { cn } from "./cn";

export function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
  rotulo,
}: {
  opcoes: { valor: T; nome: string }[];
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex rounded-app bg-card-2 p-1">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={o.valor === valor}
          onClick={() => onChange(o.valor)}
          className={cn(
            "h-9 flex-1 cursor-pointer rounded-[12px] text-xs font-semibold transition-colors duration-150",
            o.valor === valor ? "bg-card text-caneta" : "text-sub"
          )}
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}
