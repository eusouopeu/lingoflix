// Backup da lista (com vocabulário e revisões) e dos dias de estudo em .json.
// A chave da API do Claude nunca entra no arquivo. Restaurar mescla: de cada
// título fica a versão mais recente (campo `atualizado`); nada é apagado.
import { z } from "zod";
import type { ItemLista } from "../store/lista";

const VERSAO = 1;

const RevisaoZ = z.object({
  repeticoes: z.number(),
  intervalo: z.number(),
  facilidade: z.number(),
  proxima: z.string(),
});

const ParZ = z.object({
  termo: z.string(),
  traducao: z.string(),
  classe: z.string().optional(),
  partes: z.string().optional(),
  revisao: RevisaoZ.optional(),
});

const ItemZ = z.object({
  chave: z.string(),
  id: z.number(),
  tipo: z.enum(["filme", "serie"]),
  titulo: z.string(),
  tituloOriginal: z.string(),
  poster: z.string().nullable(),
  idioma: z.string(),
  nivel: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  status: z.enum(["quero", "visto"]),
  vocabulario: z.array(ParZ),
  atualizado: z.number(),
  generos: z.array(z.number()),
  plataformas: z.array(z.string()),
  nota: z.number(),
  ano: z.number().nullable(),
  sinopse: z.string(),
});

const BackupZ = z.object({
  app: z.literal("cineglota"),
  versao: z.number().max(VERSAO),
  lista: z.array(ItemZ),
  diasEstudo: z.array(z.string()).default([]),
});

export type Backup = z.infer<typeof BackupZ>;

export function gerarBackup(lista: ItemLista[], diasEstudo: string[], agora = new Date()): string {
  return JSON.stringify(
    { app: "cineglota", versao: VERSAO, exportado: agora.toISOString(), lista, diasEstudo },
    null,
    1,
  );
}

export function lerBackup(texto: string): Backup {
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error("O arquivo não é um backup do CineGlota.");
  }
  const r = BackupZ.safeParse(dados);
  if (!r.success) throw new Error("O arquivo não é um backup do CineGlota.");
  return r.data;
}

// Itens do backup que entram na lista: novos, ou mais recentes que os atuais.
export function itensParaRestaurar(atuais: ItemLista[], backup: ItemLista[]): ItemLista[] {
  const porChave = new Map(atuais.map((i) => [i.chave, i]));
  return backup.filter((b) => {
    const a = porChave.get(b.chave);
    return !a || b.atualizado > a.atualizado;
  });
}

export const juntarDias = (a: string[], b: string[]) => [...new Set([...a, ...b])].sort();
