import { destinoApp, linkTitulo, unificarPlataformas } from "./streaming";

describe("streamings", () => {
  it("um ícone por serviço: junta versões com anúncios e canais", () => {
    const lista = [
      { id: 8, nome: "Netflix", logo: "/n.png" },
      { id: 1796, nome: "Netflix Standard with Ads", logo: "/na.png" },
      { id: 119, nome: "Amazon Prime Video", logo: "/p.png" },
      { id: 2100, nome: "Amazon Prime Video with Ads", logo: "/pa.png" },
      { id: 1825, nome: "HBO Max Amazon Channel", logo: "/ha.png" },
      { id: 1899, nome: "HBO Max", logo: "/h.png" },
    ];
    expect(unificarPlataformas(lista).map((p) => p.id)).toEqual([8, 119, 1899]);
  });

  it("aponta o pacote Android do app de cada serviço", () => {
    expect(destinoApp({ id: 8, nome: "Netflix" })?.pacote).toBe("com.netflix.mediaclient");
    expect(destinoApp({ id: 1796, nome: "Netflix basic with Ads" })?.pacote).toBe("com.netflix.mediaclient");
    expect(destinoApp({ id: 307, nome: "Globoplay" })?.pacote).toBe("com.globo.globotv");
    expect(destinoApp({ id: 999, nome: "Serviço Qualquer" })).toBeNull();
  });
});

describe("link do título no streaming", () => {
  const d = (nome: string) => destinoApp({ id: 0, nome })!;
  const filme = { tipo: "filme" as const, titulo: "O Fabuloso Destino de Amélie Poulain" };

  it("com o ID do Wikidata abre a página do título", () => {
    expect(linkTitulo(d("Netflix"), { netflix: "60022048" }, filme)).toEqual({
      url: "https://www.netflix.com/title/60022048",
      exato: true,
    });
    expect(linkTitulo(d("Disney Plus"), { disney: "4FnhdetSGgPN" }, filme).url).toBe(
      "https://www.disneyplus.com/movies/o-fabuloso-destino-de-amelie-poulain/4FnhdetSGgPN",
    );
    expect(
      linkTitulo(d("Apple TV"), { apple: "umc.cmc.3bum7tsq7nui4tlour7vsn19i" }, { ...filme, tipo: "serie" }).url,
    ).toBe("https://tv.apple.com/br/show/o-fabuloso-destino-de-amelie-poulain/umc.cmc.3bum7tsq7nui4tlour7vsn19i");
    expect(linkTitulo(d("HBO Max"), { hbo: "movie/d5e3be11-eb8b-449f-89cf-db887ddee777" }, filme).url).toBe(
      "https://play.hbomax.com/movie/d5e3be11-eb8b-449f-89cf-db887ddee777",
    );
  });

  it("sem ID (ou com ID em formato antigo) abre a busca do serviço pelo nome", () => {
    expect(linkTitulo(d("Netflix"), {}, filme)).toEqual({
      url: "https://www.netflix.com/search?q=O%20Fabuloso%20Destino%20de%20Am%C3%A9lie%20Poulain",
      exato: false,
    });
    expect(linkTitulo(d("HBO Max"), { hbo: "feature/urn:hbo:feature:GXSycSQud4r29bAEAAA10" }, filme).exato).toBe(false);
    expect(linkTitulo(d("Globoplay"), {}, filme).url).toMatch(/^https:\/\/globoplay\.globo\.com\/busca\/\?q=/);
  });
});
