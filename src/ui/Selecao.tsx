import { ChevronDownIcon } from "@heroicons/react/24/outline";

// <select> nativo (melhor no celular) com rótulo pequeno acima.
export function Selecao({
  rotulo,
  valor,
  onChange,
  opcoes,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: { valor: string; nome: string }[];
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-xs font-semibold text-sub">{rotulo}</span>
      <span className="relative">
        <select
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full cursor-pointer appearance-none rounded-app-sm bg-card-2 pr-9 pl-3 text-base text-ink"
        >
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.nome}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-3 right-3 size-5 text-sub" aria-hidden />
      </span>
    </label>
  );
}
