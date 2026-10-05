// Arquivos que o app entrega (baralho .csv, backup .json): no aparelho, grava
// no cache e abre o compartilhamento do Android; no navegador, baixa.
import { Capacitor } from "@capacitor/core";

export async function salvarArquivo(nome: string, conteudo: string, titulo: string, tipo = "text/csv") {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const { uri } = await Filesystem.writeFile({
      path: nome,
      data: conteudo,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: titulo, files: [uri], dialogTitle: titulo });
    return;
  }
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipo};charset=utf-8` }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  a.click();
  URL.revokeObjectURL(url);
}

// "Amélie (2001)" → "cineglota-amelie-2001.csv"
export const nomeArquivo = (titulo: string, extensao = "csv") =>
  `cineglota-${
    titulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "vocabulario"
  }.${extensao}`;
