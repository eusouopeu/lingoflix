// Busca e download de legendas na API REST do OpenSubtitles (tela Legendas).
// A chave é do próprio usuário (aba Ajustes). No aparelho as chamadas saem
// pelo HTTP nativo do Capacitor, que não esbarra no CORS da WebView.
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import type { Tipo } from "./catalogo";

const BASE = "https://api.opensubtitles.com/api/v1";

export interface Alvo {
  tipo: Tipo;
  id: number;
  temporada?: number;
  episodio?: number;
}

export interface Opcao {
  fileId: number;
  idioma: string; // código do OpenSubtitles: "en", "pt-br", "zh-cn"…
  nome: string; // nome do release, para escolher outra
  downloads: number;
}

export class ErroLegenda extends Error {
  constructor(
    public tipo: "chave" | "limite" | "nada" | "conexao",
    msg: string,
  ) {
    super(msg);
  }
}

export function erroPorStatus(status: number): ErroLegenda {
  if (status === 401 || status === 403) return new ErroLegenda("chave", "Chave do OpenSubtitles inválida.");
  if (status === 406 || status === 429)
    return new ErroLegenda("limite", "Limite diário de downloads do OpenSubtitles atingido.");
  return new ErroLegenda("conexao", `Erro do OpenSubtitles (${status}).`);
}

// Idioma do app (ISO 639-1) → códigos do OpenSubtitles.
export function codigosOS(idioma: string): string[] {
  if (idioma === "pt") return ["pt-br", "pt-pt"];
  if (idioma === "zh") return ["zh-cn", "zh-tw"];
  return [idioma];
}

// A API redireciona se os parâmetros não vierem em minúsculas e em ordem alfabética.
export function urlBusca(alvo: Alvo, idiomas: string[]): string {
  const p: Record<string, string> = {
    languages: [...idiomas].sort().join(","),
    order_by: "download_count",
  };
  if (alvo.tipo === "serie") {
    p.parent_tmdb_id = String(alvo.id);
    if (alvo.temporada != null) p.season_number = String(alvo.temporada);
    if (alvo.episodio != null) p.episode_number = String(alvo.episodio);
  } else p.tmdb_id = String(alvo.id);
  const q = new URLSearchParams(Object.entries(p).sort(([a], [b]) => a.localeCompare(b)));
  return `${BASE}/subtitles?${q}`;
}

interface RespostaBusca {
  data?: {
    attributes: { language: string; download_count: number; release?: string; files: { file_id: number }[] };
  }[];
}

export function opcoesDe(r: RespostaBusca): Opcao[] {
  return (r.data ?? [])
    .filter((d) => d.attributes.files.length > 0)
    .map(({ attributes: a }) => ({
      fileId: a.files[0].file_id,
      idioma: a.language,
      nome: a.release ?? "",
      downloads: a.download_count,
    }));
}

// A mais baixada do idioma; sem resultado exato, qualquer variante (pt-br → pt-pt).
export function escolher(opcoes: Opcao[], idioma: string): Opcao | null {
  const base = idioma.split("-")[0];
  const exatas = opcoes.filter((o) => o.idioma === idioma);
  const lista = exatas.length ? exatas : opcoes.filter((o) => o.idioma.split("-")[0] === base);
  return lista.reduce<Opcao | null>((m, o) => (!m || o.downloads > m.downloads ? o : m), null);
}

async function pedir(
  url: string,
  chave: string,
  opcoes: { method?: "GET" | "POST"; corpo?: unknown; texto?: boolean } = {},
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Api-Key": chave,
    "User-Agent": "CineGlota v1.0",
    Accept: opcoes.texto ? "*/*" : "application/json",
    ...(opcoes.corpo ? { "Content-Type": "application/json" } : {}),
  };
  let status: number;
  let dados: unknown;
  try {
    if (Capacitor.isNativePlatform()) {
      const r = await CapacitorHttp.request({
        url,
        method: opcoes.method ?? "GET",
        headers: opcoes.texto ? {} : headers,
        data: opcoes.corpo,
        responseType: opcoes.texto ? "text" : "json",
      });
      [status, dados] = [r.status, r.data];
    } else {
      const r = await fetch(url, {
        method: opcoes.method ?? "GET",
        headers: opcoes.texto ? {} : headers,
        body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
      });
      status = r.status;
      dados = opcoes.texto ? await r.text() : await r.json().catch(() => null);
    }
  } catch {
    throw new ErroLegenda("conexao", "Sem conexão com o OpenSubtitles.");
  }
  if (status < 200 || status >= 300) throw erroPorStatus(status);
  return dados;
}

export async function buscarOpcoes(chave: string, alvo: Alvo, idiomas: string[]): Promise<Opcao[]> {
  return opcoesDe((await pedir(urlBusca(alvo, idiomas), chave)) as RespostaBusca);
}

// Texto do arquivo (.srt). Cada chamada gasta um download da cota diária.
export async function baixar(chave: string, fileId: number): Promise<string> {
  const r = (await pedir(`${BASE}/download`, chave, { method: "POST", corpo: { file_id: fileId } })) as {
    link?: string;
  };
  if (!r?.link) throw new ErroLegenda("nada", "O OpenSubtitles não devolveu o arquivo.");
  return String(await pedir(r.link, chave, { texto: true }));
}
