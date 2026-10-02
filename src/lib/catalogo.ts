// Listas fixas da busca: idiomas, streamings (IDs de provedor do TMDB no
// Brasil), gêneros por tipo de título e ordens de resultado.

export type Tipo = "filme" | "serie";
export type Ordem = "popularidade" | "nota" | "lancamento";

export const IDIOMAS = [
  { codigo: "en", nome: "Inglês" },
  { codigo: "es", nome: "Espanhol" },
  { codigo: "fr", nome: "Francês" },
  { codigo: "de", nome: "Alemão" },
  { codigo: "it", nome: "Italiano" },
  { codigo: "ru", nome: "Russo" },
  { codigo: "zh", nome: "Mandarim" },
] as const;

export const PLATAFORMAS = [
  { id: "8", nome: "Netflix" },
  { id: "119", nome: "Prime Video" },
  { id: "337", nome: "Disney+" },
  { id: "1899", nome: "HBO Max" },
  { id: "350", nome: "Apple TV" },
  { id: "307", nome: "Globoplay" },
];

// Filmes e séries têm tabelas de gênero diferentes no TMDB.
export const GENEROS: Record<Tipo, { id: number; nome: string }[]> = {
  filme: [
    { id: 28, nome: "Ação" },
    { id: 16, nome: "Animação" },
    { id: 12, nome: "Aventura" },
    { id: 35, nome: "Comédia" },
    { id: 18, nome: "Drama" },
    { id: 10751, nome: "Família" },
    { id: 878, nome: "Ficção científica" },
    { id: 10749, nome: "Romance" },
    { id: 53, nome: "Suspense" },
    { id: 27, nome: "Terror" },
  ],
  serie: [
    { id: 10759, nome: "Ação e aventura" },
    { id: 16, nome: "Animação" },
    { id: 35, nome: "Comédia" },
    { id: 80, nome: "Crime" },
    { id: 18, nome: "Drama" },
    { id: 10751, nome: "Família" },
    { id: 10765, nome: "Ficção e fantasia" },
    { id: 9648, nome: "Mistério" },
  ],
};

export const ORDENS: { valor: Ordem; nome: string }[] = [
  { valor: "popularidade", nome: "Mais populares" },
  { valor: "nota", nome: "Mais bem avaliados" },
  { valor: "lancamento", nome: "Mais recentes" },
];
