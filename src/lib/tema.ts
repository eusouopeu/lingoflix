// Tema claro/escuro: escolha do usuário em localStorage; sem escolha, segue o
// sistema. O atributo data-tema no <html> é aplicado também por um script
// inline no index.html, antes do React, para não piscar o tema errado.
export type Tema = "claro" | "escuro";

const CHAVE = "lingoflix.tema";

export function temaAtual(): Tema {
  return document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro";
}

export function aplicarTema(t: Tema) {
  document.documentElement.dataset.tema = t;
  window.dispatchEvent(new Event("lingoflix:tema"));
  try {
    localStorage.setItem(CHAVE, t);
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}

// As duas abas têm botão de tema: avisam uma à outra por evento.
export function assinarTema(cb: () => void) {
  window.addEventListener("lingoflix:tema", cb);
  return () => window.removeEventListener("lingoflix:tema", cb);
}
