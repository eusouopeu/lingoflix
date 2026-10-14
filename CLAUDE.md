# CineGlota (lingoflix) — instruções permanentes

App Android que recomenda filmes e séries para praticar idiomas (EN, ES, FR,
DE, IT, RU, ZH), com nível estimado por título, onde assistir, trailer no
idioma original, lista pessoal com vocabulário e legendas. Dados do TMDB.
React + TypeScript + Tailwind, Capacitor, SQLite. Visão geral no `README.md`.

Leia somente os documentos pertinentes à tarefa; não carregue documentação ou
arquivos grandes por padrão.

## Padrões compartilhados

Segue `../_shared/tech-standards.md`, `../_shared/design-standards.md`,
`../_shared/minimalismo.md` e `../_shared/docs-standards.md`.

## Segurança e dados

- A chave do TMDB fica em `.env` (`VITE_TMDB_KEY`, modelo em `.env.example`);
  nunca versionar o `.env`.

## Build

`npm test` roda os testes; `npm run apk` gera o APK de debug (JDK 21). APK
entregue na raiz como `CineGlota-<versionName>.apk`.

## Fluxo de trabalho

- Faça a menor alteração completa; não faça refactor não relacionado.
- Antes de propor melhorias ou recriar algo, consulte
  `docs/feature-status.md` ("Não reimplementar") e `docs/aprimoramentos.md`
  ("Recomendações refutadas").
- Testes, versão, APK, commit e push seguem o fluxo global
  (`~/.claude/CLAUDE.md`) e `../_shared/tech-standards.md`.

## Fim de sessão

Antes do commit, atualizar: `docs/decisoes.md` (decisão nova no topo),
`docs/pendencias.md`, `docs/feature-status.md` se uma funcionalidade visível
mudou e `docs/aprimoramentos.md` se uma melhoria foi entregue ou recusada.

## Atualização desta documentação

- `CLAUDE.md` só muda quando uma regra global do projeto muda.
- Detalhe de domínio ou implementação vai para `docs/<tema>.md`; o `README.md`
  guarda a visão geral.

## Navegação

| Arquivo | Quando ler |
|---|---|
| `docs/superpowers/specs/2026-10-05-legendas-design.md` | Legendas (importar, tradução) |
| `docs/decisoes.md` | Antes de mudar comportamento já decidido |
| `docs/pendencias.md` | Ao retomar o projeto ou propor próximos passos |
| `docs/feature-status.md` | Antes de criar ou remover funcionalidade |
| `docs/aprimoramentos.md` | Antes de sugerir melhorias |
