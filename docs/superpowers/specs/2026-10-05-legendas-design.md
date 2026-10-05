# Legendas: assistir na TV com legenda dupla no celular

Data: 2026-10-05

## Objetivo

O usuário assiste a um filme ou episódio na TV. No celular, o app mostra a
legenda no idioma estudado e em português, sincronizadas com o filme, com as
mesmas ferramentas de estudo do resto do app: tocar numa palavra (ou segurar
para marcar uma expressão) mostra o significado no contexto, e salvar adiciona
o par ao vocabulário do título, de onde segue para a revisão (aba Estudo) e
para o baralho do Anki.

Substitui, como primeiro passo, a ideia de sobrepor legendas aos apps de
streaming (que exigiria AccessibilityService e overlay nativo no Android).

## Fora do escopo

- Sincronização automática com a TV (microfone, Chromecast, etc.).
- Edição do texto das legendas.
- Mais de duas legendas simultâneas.
- Aba própria no menu (a entrada é o cartão da Minha lista).

## Entrada

- O cartão de cada título da **Minha lista** (`CartaoLista`) ganha a ação
  **"Legendas"**, que abre a tela `Legendas` em tela cheia.
- **Série:** antes de abrir, um seletor de temporada e episódio. As temporadas
  e a quantidade de episódios vêm do TMDB (`/tv/{id}` → `seasons`), como os
  demais dados que o app já busca.
- A tela é identificada por `{ chave do título, temporada?, episodio? }`.

## Fonte das legendas

### OpenSubtitles (API REST v1)

- **Chave do OpenSubtitles** do próprio usuário em Ajustes (`chaveOpenSubtitles`),
  ao lado da chave do Claude. Sem a chave, a busca automática fica
  indisponível e só a importação funciona.
- **Busca:** `GET /subtitles` com `tmdb_id` (filme) ou `parent_tmdb_id` +
  `season_number` + `episode_number` (série) e `languages` = idioma do título
  e `pt-br` (com `pt` como alternativa).
- **Escolha automática:** a legenda de maior `download_count` em cada idioma.
  A tela permite trocar por outra da lista de resultados.
- **Download:** `POST /download` com o `file_id` e depois um GET no link
  devolvido. O limite diário da conta gratuita é pequeno, então cada legenda
  é baixada uma única vez e guardada no aparelho.
- **HTTP:** pelo `CapacitorHttp` (HTTP nativo), que evita bloqueio de CORS na
  WebView. No navegador de desenvolvimento, `fetch` comum.
- **Erros:** chave inválida, limite diário atingido, sem resultados e sem
  conexão viram mensagens claras, cada uma com a opção de importar o arquivo
  manualmente.

### Importar arquivo

- Para cada um dos dois idiomas, um botão de importar `.srt` do aparelho,
  reaproveitando o que `src/lib/arquivo.ts` já faz com arquivos.
- Formato aceito: SRT. Também aceita WebVTT, cujo parser é praticamente o
  mesmo.

## Processamento (funções puras, testadas)

`src/lib/legenda.ts`:

- `lerSrt(texto): Fala[]`, onde `Fala = { inicio: ms, fim: ms, texto: string }`.
  Remove tags (`<i>`, `{\an8}`), junta as linhas de cada bloco, tolera BOM,
  CRLF e blocos malformados (que são ignorados) e ordena por início.
- `falaEm(falas, ms): number` faz busca binária e devolve o índice da fala
  ativa naquele instante, ou da última que já começou.
- `estimarDeslocamento(orig, pt): ms` testa deslocamentos de −10 s a +10 s em
  passos de 100 ms e fica com o que maximiza a sobreposição total.
- `casarPorTempo(orig, pt, deslocamento): string[]` atribui a cada fala
  original o texto das falas em PT que se sobrepõem a ela, depois do
  deslocamento, unidas por espaço. Uma fala em PT que se sobrepõe a duas
  originais vai para a de maior sobreposição.
- `dividirPalavras(texto): Token[]` separa palavras e pontuação para tornar
  cada palavra tocável, preservando a pontuação na exibição. Para idiomas sem
  espaço (zh, ja), cada caractere é um token.

### Pré-sincronização com IA (opcional)

- Ajuste `sincronizarIA` (padrão: desligado) em Ajustes. Só fica ativo com a
  chave do Claude preenchida.
- Quando ligado, depois do casamento por tempo, o Haiku recebe janelas de
  cerca de 40 falas originais com as falas em PT da mesma faixa de tempo e
  devolve, para cada fala original, os índices das falas em PT
  correspondentes (saída estruturada com zod, como em `src/lib/claude.ts`).
  Isso corrige falas divididas ou juntadas de forma diferente nas duas
  legendas.
- Roda uma vez por título ou episódio. O resultado substitui o casamento por
  tempo e fica salvo. Se uma janela falhar, aquela janela mantém o casamento
  por tempo.

### Ajuste fino

- Na tela, um controle de ±0,5 s desloca a legenda em PT, e o casamento é
  refeito na hora. O valor fica salvo por título ou episódio.

## Armazenamento

Tabela nova `legendas` no SQLite (localStorage no navegador), seguindo o
padrão de `src/store/lista.ts`:

| campo | conteúdo |
|---|---|
| `chave` | `"{tipo}-{id}"` ou `"{tipo}-{id}-s{T}e{E}"` |
| `original` | `Fala[]` em JSON |
| `pt` | `Fala[]` em JSON |
| `casamento` | `string[]` em JSON (texto em PT de cada fala original) |
| `deslocamento` | ms |
| `origem` | ids do OpenSubtitles ou `"importado"`, por idioma |
| `posicao` | último ms visto, para retomar de onde parou |

A tela lê primeiro desse armazenamento e só busca no OpenSubtitles quando não
encontra a legenda.

## Tela `Legendas`

De cima para baixo:

1. **Cabeçalho:** título (com T/E, se for série), botão de fechar e um menu
   com "trocar legenda", "importar .srt" e "re-sincronizar com IA".
2. **Fala atual, em destaque:** a linha original com cada palavra tocável e a
   linha em PT embaixo, em cor secundária.
3. **Lista de falas:** rolável, com tempo, original e PT de cada fala, e a
   fala atual destacada e mantida visível. Tocar numa fala pula para ela.
4. **Controles:**
   - um slider de 0 até o fim da última fala, mostrando o tempo atual em
     `h:mm:ss`;
   - play/pause do modo **acompanhar**;
   - botões ◀ e ▶ para a fala anterior e a próxima;
   - um campo **"tempo na TV"**: o usuário digita, por exemplo, `1:02:15` e o
     relógio pula para esse ponto;
   - o ajuste fino da legenda em PT, em ±0,5 s.

### Modo acompanhar

- Um relógio interno: `posicao = base + (agora − inicioPlay)`, atualizado por
  `requestAnimationFrame` ou `setInterval` de 200 ms. A fala atual sai de
  `falaEm`.
- Enquanto roda, a tela fica acesa pela Screen Wake Lock API
  (`navigator.wakeLock`), que a WebView suporta, sem plugin novo.
- Pausa em três situações: o usuário toca em pause, toca numa palavra ou o
  app vai para segundo plano.
- A posição é gravada no armazenamento ao pausar e ao sair.

## Palavras e expressões

- **Tocar numa palavra:** seleciona a palavra.
- **Segurar numa palavra e arrastar ou tocar em outra palavra da mesma fala:**
  seleciona o trecho contínuo entre as duas, para expressões como
  "give up" ou "in the end". Soltar o dedo abre a folha.
- **Folha inferior:**
  - termo selecionado, tradução no contexto, classe gramatical e partes
    (o mesmo formato de `Par`);
  - a fala original e a fala em PT, como contexto;
  - o botão **"Salvar no vocabulário"** adiciona o `Par` ao `vocabulario` do
    item da lista, ou avisa se o termo já existe. Isso também conta o dia de
    estudo (`marcarEstudo`).
- **Significado:** função nova `explicarTermo(chave, idioma, termo, frase)` em
  `src/lib/claude.ts`, que usa o Haiku com saída estruturada (`traducao`,
  `classe`, `partes`) e mantém um cache em memória e no armazenamento por
  `idioma + termo + frase`.
- **Sem chave do Claude:** a folha mostra o termo e a fala em PT, sem
  tradução isolada. Salvar grava o par com a tradução vazia, que a tradução
  automática já existente completa depois.

## Componentes e arquivos

- `src/lib/legenda.ts` (+ teste): parser, busca, deslocamento, casamento e
  tokens.
- `src/lib/opensubtitles.ts` (+ teste): montagem das requisições, escolha da
  melhor legenda e mapeamento de erros.
- `src/lib/claude.ts`: `explicarTermo` e `alinharLegendas`.
- `src/store/legendas.ts`: repositório SQLite e web.
- `src/store/ajustes.ts`: `chaveOpenSubtitles` e `sincronizarIA`.
- `src/screens/Legendas.tsx`: a tela, que usa os componentes abaixo.
- `src/components/FalaTocavel.tsx`: a fala com palavras tocáveis e a seleção
  de expressão.
- `src/components/FolhaTermo.tsx`: a folha inferior com o significado e o
  botão de salvar.
- `src/components/SeletorEpisodio.tsx`: temporada e episódio (séries).
- `src/components/CartaoLista.tsx`: a ação "Legendas".
- `src/screens/Ajustes.tsx`: os campos novos.
- `src/lib/tmdb.ts`: busca das temporadas de uma série.

## Testes

Vitest, como no restante do projeto:

- `legenda.test.ts`: SRT com tags, BOM, CRLF e blocos quebrados; `falaEm` nas
  bordas; o deslocamento recuperado de uma legenda deslocada artificialmente;
  o casamento quando uma fala original corresponde a duas em PT e vice-versa;
  os tokens com pontuação e em chinês.
- `opensubtitles.test.ts`: os parâmetros de busca de filme e de episódio; a
  escolha pela maior contagem de downloads; o fallback de `pt-br` para `pt`;
  e as mensagens de erro por status HTTP.
- `claude`: a montagem das janelas de alinhamento e o fallback quando uma
  janela falha, com a resposta mockada.
- A interface é verificada manualmente no navegador de desenvolvimento e no
  APK.
