// Tradução automática do vocabulário e nível de dificuldade dos títulos com o
// Claude Haiku 4.5 (pedido do Pedro: sempre o Haiku). A chave é do próprio
// usuário, guardada só no aparelho (aba Ajustes), e a chamada sai direto do
// app para a API.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { IDIOMAS, NOME_GENERO } from "./catalogo";
import type { Nivel } from "./nivel";
import type { Titulo } from "./tmdb";
import type { Par } from "./vocabulario";

const MODELO = "claude-haiku-4-5";

export const CLASSES = [
  "substantivo",
  "verbo",
  "adjetivo",
  "adverbio",
  "pronome",
  "preposicao",
  "conjuncao",
  "interjeicao",
  "artigo",
  "numeral",
  "expressao",
] as const;

const Resposta = z.object({
  pares: z.array(
    z.object({
      termo: z.string(),
      traducao: z.string(),
      classe: z.enum(CLASSES),
      partes: z.string(),
    }),
  ),
});

const sistema = (idioma: string) =>
  `Você ajuda um brasileiro que estuda ${idioma} anotando palavras de filmes e séries.
Para cada par recebido, na mesma ordem:
- "termo" é a palavra ou expressão em ${idioma}; "traducao" é o equivalente em português do Brasil.
- Se um dos dois vier vazio, preencha-o com a tradução mais comum. Nunca altere um lado que já veio preenchido.
- "classe": a classe gramatical do termo em ${idioma} (use "expressao" para locuções e frases).
- "partes": quando o termo for composto ou derivado de partes com significado próprio (palavras compostas, radicais, caracteres chineses), o significado de cada parte em português separado por " + " (ex.: firefly → "fogo + mosca"). Caso contrário, string vazia.`;

function cliente(chave: string) {
  // dangerouslyAllowBrowser: o app roda no aparelho com a chave do próprio usuário
  return new Anthropic({ apiKey: chave, dangerouslyAllowBrowser: true, maxRetries: 1 });
}

// Completa e classifica os pares. Devolve a mesma quantidade, na mesma ordem.
export async function analisarPares(chave: string, codigoIdioma: string, pares: Par[]): Promise<Par[]> {
  const idioma = IDIOMAS.find((l) => l.codigo === codigoIdioma)?.nome ?? codigoIdioma;
  const resposta = await cliente(chave).messages.parse({
    model: MODELO,
    max_tokens: 4000,
    system: sistema(idioma),
    messages: [
      {
        role: "user",
        content: JSON.stringify({ pares: pares.map((p) => ({ termo: p.termo.trim(), traducao: p.traducao.trim() })) }),
      },
    ],
    output_config: { format: zodOutputFormat(Resposta) },
  });
  const saida = resposta.parsed_output?.pares;
  if (!saida || saida.length !== pares.length) throw new Error("Resposta incompleta da API");
  return pares.map((p, i) => ({
    ...p,
    // o lado que o usuário escreveu fica como está
    termo: p.termo.trim() || saida[i].termo,
    traducao: p.traducao.trim() || saida[i].traducao,
    classe: saida[i].classe,
    partes: saida[i].partes || undefined,
  }));
}

const ESCALA = ["facil", "intermediario", "avancado"] as const;

const RespostaNiveis = z.object({
  niveis: z.array(z.object({ k: z.string(), nivel: z.enum(ESCALA) })),
});

const SISTEMA_NIVEL = `Você classifica filmes e séries pela dificuldade do áudio original para um brasileiro que estuda o idioma em que o título é falado.
Use o que você sabe do título (diálogos, ritmo da fala, gírias, sotaques, jargão técnico, linguagem de época); a sinopse e os gêneros ajudam quando você não o conhece.
- "facil": fala clara e lenta, vocabulário do dia a dia (QECR A2 / HSK 3). Ex.: animações infantis, sitcoms simples.
- "intermediario": conversa natural com alguma gíria ou ritmo rápido (QECR B1 / HSK 4).
- "avancado": diálogo denso, rápido, técnico, de época ou com sotaques fortes (QECR C1 / HSK 6).
Responda um item por título recebido, com o mesmo "k".`;

// Nível de cada título (chave "tipo-id" → 0/1/2). Títulos que a resposta
// deixar de fora simplesmente não voltam (ficam com a heurística).
export async function estimarNiveis(chave: string, titulos: Titulo[]): Promise<Record<string, Nivel>> {
  const entrada = titulos.map((t) => ({
    k: `${t.tipo}-${t.id}`,
    titulo: t.tituloOriginal || t.titulo,
    tipo: t.tipo === "filme" ? "filme" : "série",
    idioma: IDIOMAS.find((l) => l.codigo === t.idioma)?.nome ?? t.idioma,
    ano: t.ano,
    generos: t.generos.map((g) => NOME_GENERO[g]).filter(Boolean),
    sinopse: t.sinopse.slice(0, 300),
  }));
  const resposta = await cliente(chave).messages.parse({
    model: MODELO,
    max_tokens: 2000,
    system: SISTEMA_NIVEL,
    messages: [{ role: "user", content: JSON.stringify({ titulos: entrada }) }],
    output_config: { format: zodOutputFormat(RespostaNiveis) },
  });
  const pedidos = new Set(entrada.map((e) => e.k));
  return Object.fromEntries(
    (resposta.parsed_output?.niveis ?? [])
      .filter((n) => pedidos.has(n.k))
      .map((n) => [n.k, ESCALA.indexOf(n.nivel) as Nivel]),
  );
}

export function mensagemErro(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "Chave da API inválida.";
  if (e instanceof Anthropic.RateLimitError) return "Limite de uso da API atingido. Tente mais tarde.";
  if (e instanceof Anthropic.APIConnectionError) return "Sem conexão com a API.";
  if (e instanceof Anthropic.APIError) return `Erro da API (${e.status}).`;
  return "Não foi possível traduzir.";
}
