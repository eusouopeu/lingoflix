// Nível pelo Claude para os títulos na tela: primeiro o cache, depois uma
// chamada por lote do que falta. Só com a opção ligada e chave salva; sem
// isso (ou se a chamada falhar) vale o nível da heurística.
import { useEffect, useRef, useState } from "react";
import { estimarNiveis } from "../lib/claude";
import type { Nivel } from "../lib/nivel";
import type { Titulo } from "../lib/tmdb";
import { useAjustes } from "./ajustes";
import { gravarNiveis, lerNiveis } from "./niveis";

const LOTE = 20;
const chave = (t: Pick<Titulo, "tipo" | "id">) => `${t.tipo}-${t.id}`;

export function useNiveisIA(titulos: Titulo[]) {
  const { ajustes } = useAjustes();
  const ativo = ajustes.nivelIA && !!ajustes.chaveClaude;
  const [niveis, setNiveis] = useState<Record<string, Nivel>>({});
  const pedidos = useRef(new Set<string>());
  const assinatura = titulos.map(chave).join(",");

  useEffect(() => {
    if (!ativo) return;
    const novos = titulos.filter((t) => !pedidos.current.has(chave(t)));
    if (!novos.length) return;
    novos.forEach((t) => pedidos.current.add(chave(t)));
    (async () => {
      const salvos = await lerNiveis(novos.map(chave));
      setNiveis((n) => ({ ...n, ...salvos }));
      const faltam = novos.filter((t) => !(chave(t) in salvos));
      for (let i = 0; i < faltam.length; i += LOTE) {
        const lote = faltam.slice(i, i + LOTE);
        try {
          const r = await estimarNiveis(ajustes.chaveClaude, lote);
          setNiveis((n) => ({ ...n, ...r }));
          await gravarNiveis(r);
        } catch (e) {
          // libera o lote para tentar de novo na próxima página carregada
          console.error(e);
          lote.forEach((t) => pedidos.current.delete(chave(t)));
        }
      }
    })().catch(console.error);
  }, [assinatura, ativo]); // eslint-disable-line react-hooks/exhaustive-deps

  // título com o nível trocado (e marcado) quando o Claude já respondeu
  return <T extends Titulo>(t: T): T => {
    const n = ativo ? niveis[chave(t)] : undefined;
    return n === undefined ? t : { ...t, nivel: n, nivelIA: true };
  };
}
