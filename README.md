# lingoflix (CineGlota)

App Android (React + TypeScript + Tailwind + Capacitor) que recomenda filmes e
séries para praticar idiomas, com dados do [TMDB](https://www.themoviedb.org/).

- Idiomas: EN, ES, FR, DE, IT, RU, ZH.
- Nível estimado por título (QECR A2/B1/C1; HSK para mandarim).
- Toque no pôster para ver sinopse, onde assistir e o trailer no idioma original.
- Lista pessoal "Quero ver" / "Já vi" com anotações de vocabulário (SQLite no app).

## Rodar

```bash
cp .env.example .env   # preencher VITE_TMDB_KEY
npm install
npm run dev            # navegador
npm test               # testes
npm run apk            # APK debug (JDK 21)
```
