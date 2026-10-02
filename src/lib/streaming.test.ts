import { destinoApp, unificarPlataformas } from "./streaming";

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
