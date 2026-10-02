// Listas fixas da busca: idiomas, streamings (IDs de provedor do TMDB no
// Brasil), gêneros por tipo de título e ordens de resultado.

export type Tipo = "filme" | "serie";
export type Ordem = "popularidade" | "nota" | "lancamento";
export type OrdemLista = "adicionado" | "nota" | "lancamento";

// `tag`: nome sem acento usado nas tags do Anki (ex.: ingles::A2)
export const IDIOMAS = [
  { codigo: "en", nome: "Inglês", tag: "ingles" },
  { codigo: "es", nome: "Espanhol", tag: "espanhol" },
  { codigo: "fr", nome: "Francês", tag: "frances" },
  { codigo: "de", nome: "Alemão", tag: "alemao" },
  { codigo: "it", nome: "Italiano", tag: "italiano" },
  { codigo: "ru", nome: "Russo", tag: "russo" },
  { codigo: "zh", nome: "Mandarim", tag: "mandarim" },
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

export const ORDENS_LISTA: { valor: OrdemLista; nome: string }[] = [
  { valor: "adicionado", nome: "Adicionados por último" },
  { valor: "nota", nome: "Mais bem avaliados" },
  { valor: "lancamento", nome: "Mais recentes" },
];

// Gêneros de filme e série juntos, sem repetir id (para a lista pessoal).
export const TODOS_GENEROS = [
  ...GENEROS.filme,
  ...GENEROS.serie.filter((g) => !GENEROS.filme.some((f) => f.id === g.id)),
];

// Nome curto de todo gênero que o TMDB devolve, para as etiquetas do verso.
export const NOME_GENERO: Record<number, string> = {
  28: "Ação",
  12: "Aventura",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  14: "Fantasia",
  36: "História",
  27: "Terror",
  10402: "Música",
  9648: "Mistério",
  10749: "Romance",
  878: "Ficção científica",
  10770: "Filme de TV",
  53: "Suspense",
  10752: "Guerra",
  37: "Faroeste",
  10759: "Ação e aventura",
  10762: "Infantil",
  10763: "Notícias",
  10764: "Reality",
  10765: "Ficção e fantasia",
  10766: "Novela",
  10767: "Talk show",
  10768: "Guerra e política",
};

// Cor da etiqueta de cada gênero: nome de token (--tag-*), nunca hex aqui.
const COR_GENERO: Record<number, string> = {
  28: "vermelho",
  10759: "vermelho",
  10752: "vermelho",
  10768: "vermelho",
  12: "azul",
  878: "azul",
  10765: "azul",
  14: "azul",
  16: "ciano",
  10762: "ciano",
  10751: "verde",
  99: "verde",
  36: "verde",
  35: "ambar",
  10764: "ambar",
  10767: "ambar",
  18: "roxo",
  10749: "rosa",
  10766: "rosa",
  10402: "rosa",
  80: "cinza",
  9648: "cinza",
  53: "cinza",
  27: "cinza",
  37: "cinza",
};
export const corGenero = (id: number) => COR_GENERO[id] ?? "cinza";
