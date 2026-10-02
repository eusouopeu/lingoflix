import { ChevronDownIcon } from "@heroicons/react/24/outline";

// Linha de filtro: rótulo curto à esquerda, controle ocupando o resto.
export function LinhaFiltro({ rotulo, id, children }: { rotulo: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="w-20 shrink-0 text-xs font-semibold text-sub">
        {rotulo}
      </label>
      <div className="relative min-w-0 flex-1">{children}</div>
    </div>
  );
}

export const CAMPO =
  "flex h-10 w-full cursor-pointer items-center rounded-app-sm bg-card-2 pr-9 pl-3 text-left text-sm text-ink";

// <select> nativo (melhor no celular) para escolha única.
export function Selecao({
  id,
  rotulo,
  valor,
  onChange,
  opcoes,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: { valor: string; nome: string }[];
}) {
  return (
    <LinhaFiltro rotulo={rotulo} id={id}>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)} className={`${CAMPO} appearance-none`}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.nome}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-2.5 right-3 size-5 text-sub" aria-hidden />
    </LinhaFiltro>
  );
}
