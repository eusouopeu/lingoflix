// Filtros compartilhados por Explorar e Minha lista. Explorar exige tipo e
// idioma (a busca no TMDB precisa deles); a lista aceita "todos" nos dois.
import { GENEROS, IDIOMAS, PLATAFORMAS, TODOS_GENEROS, type Tipo } from "../lib/catalogo";
import { rotuloNivel, type Nivel } from "../lib/nivel";
import { Ajuda } from "../ui/Ajuda";
import { Chip } from "../ui/Chip";
import { MultiSelecao } from "../ui/MultiSelecao";
import { Segmentado } from "../ui/Segmentado";
import { Selecao } from "../ui/Selecao";

export interface ValoresFiltro<O extends string> {
  tipo: Tipo | null;
  idioma: string | null;
  nivel: Nivel | null;
  generos: number[];
  plataformas: string[];
  ordem: O;
}

export function contarAjustes<O extends string>(f: ValoresFiltro<O>, ordemPadrao: O) {
  return [f.generos.length > 0, f.plataformas.length > 0, f.ordem !== ordemPadrao].filter(Boolean).length;
}

export function PainelFiltros<O extends string>({
  id,
  valores: f,
  onChange,
  ajustes,
  ordens,
  permiteTodos,
}: {
  id: string;
  valores: ValoresFiltro<O>;
  onChange: (f: ValoresFiltro<O>) => void;
  ajustes: boolean;
  ordens: { valor: O; nome: string }[];
  permiteTodos: boolean;
}) {
  const muda = (m: Partial<ValoresFiltro<O>>) => onChange({ ...f, ...m });
  const generos = f.tipo ? GENEROS[f.tipo] : TODOS_GENEROS;
  const tipos = [
    ...(permiteTodos ? [{ valor: "todos", nome: "Todos" }] : []),
    { valor: "filme", nome: "Filmes" },
    { valor: "serie", nome: "Séries" },
  ];

  return (
    <>
      {ajustes && (
        <div className="flex animate-surge flex-col gap-2">
          <MultiSelecao
            id={`${id}-genero`}
            rotulo="Gênero"
            valores={f.generos}
            onChange={(generos) => muda({ generos })}
            opcoes={generos.map((g) => ({ valor: g.id, nome: g.nome }))}
          />
          <MultiSelecao
            id={`${id}-streaming`}
            rotulo="Streaming"
            valores={f.plataformas}
            onChange={(plataformas) => muda({ plataformas })}
            opcoes={PLATAFORMAS.map((p) => ({ valor: p.id, nome: p.nome }))}
          />
          <Selecao id={`${id}-ordem`} rotulo="Ordem" valor={f.ordem} onChange={(v) => muda({ ordem: v as O })} opcoes={ordens} />
        </div>
      )}

      <Segmentado
        rotulo="Tipo"
        opcoes={tipos}
        valor={f.tipo ?? "todos"}
        onChange={(v) => {
          const tipo = v === "todos" ? null : (v as Tipo);
          // gênero de série não existe em filme (e vice-versa): mantém só os comuns
          const validos = new Set((tipo ? GENEROS[tipo] : TODOS_GENEROS).map((g) => g.id));
          muda({ tipo, generos: f.generos.filter((g) => validos.has(g)) });
        }}
      />

      <div role="group" aria-label="Idioma" className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4">
        {permiteTodos && (
          <Chip ativo={f.idioma === null} onClick={() => muda({ idioma: null })}>
            Todos
          </Chip>
        )}
        {IDIOMAS.map((l) => (
          <Chip
            key={l.codigo}
            ativo={f.idioma === l.codigo}
            rotulo={l.nome}
            onClick={() => muda({ idioma: permiteTodos && f.idioma === l.codigo ? null : l.codigo })}
          >
            {l.codigo.toUpperCase()}
          </Chip>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <div role="group" aria-label="Nível" className="sem-barra -ml-4 flex flex-1 gap-2 overflow-x-auto pl-4">
          <Chip ativo={f.nivel === null} onClick={() => muda({ nivel: null })}>
            Todos
          </Chip>
          {([0, 1, 2] as Nivel[]).map((n) => (
            <Chip key={n} ativo={f.nivel === n} onClick={() => muda({ nivel: f.nivel === n ? null : n })}>
              {rotuloNivel(n, f.idioma ?? "")}
            </Chip>
          ))}
        </div>
        <Ajuda rotulo="Sobre o nível">
          Nível estimado pelo gênero e pela época do título: animação e família tendem a ter fala simples; drama, história
          e crime concentram vocabulário denso. Mandarim usa a escala HSK; os demais idiomas, o QECR.
        </Ajuda>
      </div>
    </>
  );
}
