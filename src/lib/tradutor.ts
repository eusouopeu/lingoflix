// Porta única para traduzir palavras (toque nas legendas e tradução automática
// do vocabulário). Dois motores, escolhidos em Ajustes:
// - "aparelho": ML Kit no próprio celular (plugin local Tradutor.java, o mesmo
//   tradutor do Carboy) — grátis, instantâneo e offline depois de baixar o
//   modelo do idioma, mas só traduz (sem classe gramatical nem partes);
// - "claude": Claude Haiku (lib/claude), que gasta tokens da chave do usuário.
// Se o escolhido não estiver disponível (navegador, sem chave), usa o outro.
import { Capacitor, registerPlugin } from "@capacitor/core";
import { IDIOMAS } from "./catalogo";
import { analisarPares, explicarTermo, type Explicacao } from "./claude";
import type { Par } from "./vocabulario";

export type Motor = "aparelho" | "claude";

export interface Significado {
  traducao: string;
  classe?: Explicacao["classe"];
  partes?: string;
}

interface PluginTradutor {
  estado(o: { de: string; para: string }): Promise<{ pronto: boolean }>;
  baixar(o: { de: string; para: string }): Promise<void>;
  traduzir(o: { texto: string; de: string; para: string }): Promise<{ traducao: string }>;
}

const Tradutor = registerPlugin<PluginTradutor>("Tradutor");

export function escolherMotor(preferido: Motor, temAparelho: boolean, temChave: boolean): Motor | null {
  const ok = (m: Motor) => (m === "aparelho" ? temAparelho : temChave);
  if (ok(preferido)) return preferido;
  const outro: Motor = preferido === "aparelho" ? "claude" : "aparelho";
  return ok(outro) ? outro : null;
}

export interface Config {
  motor: Motor;
  chaveClaude: string;
}

export const motorDe = (c: Config) => escolherMotor(c.motor, Capacitor.isNativePlatform(), !!c.chaveClaude);

const nomeIdioma = (codigo: string) => IDIOMAS.find((l) => l.codigo === codigo)?.nome ?? codigo;

// Pares de idiomas cujos modelos já estão no aparelho (evita perguntar a cada toque).
const prontos = new Set<string>();
const cache = new Map<string, Promise<string>>();

// Tradução pelo ML Kit. `aoBaixar` avisa quando o modelo vai ser baixado (1ª vez).
export function traduzirNoAparelho(
  texto: string,
  de: string,
  para: string,
  aoBaixar?: (idioma: string) => void,
): Promise<string> {
  const k = `${de}|${para}|${texto.toLowerCase()}`;
  let p = cache.get(k);
  if (!p) {
    p = (async () => {
      const parIdiomas = `${de}|${para}`;
      if (!prontos.has(parIdiomas)) {
        const { pronto } = await Tradutor.estado({ de, para });
        if (!pronto) {
          aoBaixar?.(nomeIdioma(de === "pt" ? para : de));
          await Tradutor.baixar({ de, para });
        }
        prontos.add(parIdiomas);
      }
      return (await Tradutor.traduzir({ texto, de, para })).traducao;
    })();
    p.catch(() => cache.delete(k));
    cache.set(k, p);
  }
  return p;
}

// Significado de um termo da legenda (balão e folha).
export async function traduzirTermo(
  c: Config,
  idioma: string,
  termo: string,
  frase: string,
  aoBaixar?: (idioma: string) => void,
): Promise<Significado> {
  const motor = motorDe(c);
  if (motor === "aparelho") return { traducao: await traduzirNoAparelho(termo, idioma, "pt", aoBaixar) };
  if (motor === "claude") return explicarTermo(c.chaveClaude, idioma, termo, frase);
  throw new Error("Sem tradutor: adicione a chave do Claude em Ajustes.");
}

// Completa o lado vazio de cada par (idioma → PT ou PT → idioma); pares
// completos ficam como estão.
export async function preencherPares(
  pares: Par[],
  idioma: string,
  traduzir: (texto: string, de: string, para: string) => Promise<string>,
): Promise<Par[]> {
  return Promise.all(
    pares.map(async (p) => {
      const termo = p.termo.trim();
      const traducao = p.traducao.trim();
      if (termo && !traducao) return { ...p, traducao: await traduzir(termo, idioma, "pt") };
      if (!termo && traducao) return { ...p, termo: await traduzir(traducao, "pt", idioma) };
      return p;
    }),
  );
}

// Tradução automática do vocabulário: com o Claude também classifica; com o
// aparelho só completa o lado vazio.
export async function completarPares(c: Config, idioma: string, pares: Par[]): Promise<Par[]> {
  const motor = motorDe(c);
  if (motor === "claude") return analisarPares(c.chaveClaude, idioma, pares);
  if (motor === "aparelho") return preencherPares(pares, idioma, (t, de, para) => traduzirNoAparelho(t, de, para));
  throw new Error("Sem tradutor: adicione a chave do Claude em Ajustes.");
}
