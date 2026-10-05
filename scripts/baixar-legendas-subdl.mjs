#!/usr/bin/env node
// Baixa do SubDL a legenda de cada episódio de uma temporada, em mandarim e em
// português, e grava como UTF-8 em legendas/<pasta>/S03E01.zh.srt etc. (nomes
// que a aba Importar do app reconhece). Uso:
//   node scripts/baixar-legendas-subdl.mjs --tmdb 246 --temporada 3 [--pasta avatar-t3] [--listar]
// A chave do SubDL (grátis em subdl.com → API) vai em SUBDL_API_KEY, no ambiente ou no .env.
// --listar mostra os idiomas que o SubDL devolve para o episódio 1, sem baixar nada.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce(
      (acc, a, i, v) =>
        a.startsWith("--")
          ? [...acc, [a.slice(2), v[i + 1]?.startsWith("--") || v[i + 1] === undefined ? true : v[i + 1]]]
          : acc,
      [],
    ),
);
const tmdb = args.tmdb ?? 246; // Avatar: The Last Airbender
const temporada = Number(args.temporada ?? 3);
const pasta = join("legendas", String(args.pasta ?? `avatar-t${temporada}`));

function env(nome) {
  if (process.env[nome]) return process.env[nome];
  if (!existsSync(".env")) return "";
  const linha = readFileSync(".env", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${nome}=`));
  return linha
    ? linha
        .slice(nome.length + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    : "";
}

const chave = env("SUBDL_API_KEY");
if (!chave) {
  console.error("Falta SUBDL_API_KEY (no ambiente ou no .env). A chave é grátis em https://subdl.com (conta → API).");
  process.exit(1);
}

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

async function pegar(url, tentativas = 4) {
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(url, { headers: { "User-Agent": "CineGlota v1.0" } });
    if (r.status === 429 || r.status >= 500) {
      await dorme(2000 * (i + 1));
      continue;
    }
    return r;
  }
  throw new Error(`Falha repetida em ${url.replace(chave, "***")}`);
}

async function quantosEpisodios() {
  const tmdbKey = env("VITE_TMDB_KEY");
  if (tmdbKey) {
    try {
      const r = await fetch(`https://api.themoviedb.org/3/tv/${tmdb}/season/${temporada}?api_key=${tmdbKey}`);
      const n = (await r.json()).episodes?.length;
      if (n) return n;
    } catch {
      /* cai para o número informado */
    }
  }
  return Number(args.episodios ?? 21);
}

// Classifica pelo que o SubDL diz do idioma (código como "ZH", "BR_PT" ou o nome por extenso).
function idiomaDe(s) {
  const txt = `${s.language ?? ""} ${s.lang ?? ""}`;
  if (/portugu|(^|[\s_])(br_)?pt($|[\s_])/i.test(txt))
    return /portugal|(^|[\s_])pt($|[\s_])/i.test(txt) && !/br/i.test(txt) ? "pt-pt" : "pt";
  if (/chin|mandarin|(^|[\s_])zh/i.test(txt)) return "zh";
  return null;
}

async function buscar(episodio) {
  const q = new URLSearchParams({
    api_key: chave,
    tmdb_id: String(tmdb),
    type: "tv",
    season_number: String(temporada),
    episode_number: String(episodio),
    subs_per_page: "30",
  });
  const r = await pegar(`https://api.subdl.com/api/v1/subtitles?${q}`);
  const j = await r.json().catch(() => ({}));
  if (!j.status) throw new Error(`SubDL: ${j.error ?? r.status} ${j.message ?? ""}`.trim());
  return j.subtitles ?? [];
}

function decodificar(buf, idioma) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder("utf-16le").decode(buf);
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder("utf-16be").decode(buf);
  for (const c of idioma === "zh" ? ["utf-8", "gb18030", "big5"] : ["utf-8"]) {
    try {
      return new TextDecoder(c, { fatal: true }).decode(buf);
    } catch {
      /* próxima */
    }
  }
  return new TextDecoder("windows-1252").decode(buf);
}

async function baixarSrt(url, idioma) {
  const r = await pegar(url.startsWith("http") ? url : `https://dl.subdl.com${url}`);
  if (!r.ok) throw new Error(`download ${r.status}`);
  const zip = join(tmpdir(), `subdl-${process.pid}.zip`);
  writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
  const nomes = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" })
    .split("\n")
    .filter((n) => /\.(srt|vtt)$/i.test(n));
  if (!nomes.length) throw new Error("o zip não tem .srt");
  // se houver mais de um arquivo, o maior (mais falas)
  const partes = nomes.map((n) => execFileSync("unzip", ["-p", zip, n], { maxBuffer: 64 << 20 }));
  const maior = partes.reduce((a, b) => (b.length > a.length ? b : a));
  return decodificar(maior, idioma);
}

const dois = (n) => String(n).padStart(2, "0");

if (args.listar) {
  const subs = await buscar(1);
  console.log(`Episódio 1: ${subs.length} legendas. Idiomas devolvidos:`);
  const contagem = {};
  for (const s of subs)
    contagem[`${s.language ?? "?"} / ${s.lang ?? "?"} → ${idiomaDe(s) ?? "ignorado"}`] =
      (contagem[`${s.language ?? "?"} / ${s.lang ?? "?"} → ${idiomaDe(s) ?? "ignorado"}`] ?? 0) + 1;
  console.table(contagem);
  process.exit(0);
}

mkdirSync(pasta, { recursive: true });
const total = await quantosEpisodios();
const faltando = [];
for (let e = 1; e <= total; e++) {
  const rotulo = `S${dois(temporada)}E${dois(e)}`;
  let subs;
  try {
    subs = await buscar(e);
  } catch (err) {
    console.error(`${rotulo}: ${err.message}`);
    faltando.push(`${rotulo} (busca)`);
    continue;
  }
  for (const [codigo, sufixo] of [
    ["zh", "zh"],
    ["pt", "pt"],
  ]) {
    const destino = join(pasta, `${rotulo}.${sufixo}.srt`);
    if (existsSync(destino)) {
      console.log(`${rotulo} ${sufixo}: já existe`);
      continue;
    }
    // só o episódio certo (nunca pacote de temporada), sem a versão para surdos se houver outra
    const candidatas = subs
      .filter(
        (s) =>
          (idiomaDe(s) === codigo || (codigo === "pt" && idiomaDe(s) === "pt-pt")) &&
          !s.full_season &&
          (s.episode == null || Number(s.episode) === e),
      )
      .sort(
        (a, b) => Number(!!a.hi) - Number(!!b.hi) || Number(idiomaDe(b) === codigo) - Number(idiomaDe(a) === codigo),
      );
    if (!candidatas.length) {
      console.warn(`${rotulo} ${sufixo}: nenhuma legenda no SubDL`);
      faltando.push(`${rotulo} ${sufixo}`);
      continue;
    }
    try {
      writeFileSync(destino, await baixarSrt(candidatas[0].url, codigo));
      console.log(`${rotulo} ${sufixo}: ${candidatas[0].release_name ?? candidatas[0].name ?? "ok"}`);
    } catch (err) {
      console.error(`${rotulo} ${sufixo}: ${err.message}`);
      faltando.push(`${rotulo} ${sufixo}`);
    }
    await dorme(600);
  }
}
console.log(faltando.length ? `\nFaltaram: ${faltando.join(", ")}` : `\nTudo baixado em ${pasta}/`);
