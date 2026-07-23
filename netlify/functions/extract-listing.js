// netlify/functions/extract-listing.js
// Vai buscar directamente o HTML de um anúncio (Idealista / Imovirtual).
// Não usa IA nem pesquisa web — é só um pedido HTTP simples ao portal.
// Os dados de preço/área/tipologia vêm pré-renderizados no HTML para efeitos de SEO,
// por isso não é preciso um browser completo para os ler.

const PORTAIS_PERMITIDOS = ["idealista.pt", "imovirtual.com"];

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let url;
  try {
    ({ url } = JSON.parse(event.body || "{}"));
  } catch {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Pedido inválido." }),
    };
  }

  if (!url || !PORTAIS_PERMITIDOS.some((p) => url.includes(p))) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Só são aceites links do Idealista ou Imovirtual." }),
    };
  }

  try {
    const res = await fetch(url, {
      headers: {
        // User-Agent de browser real — alguns portais bloqueiam pedidos sem isto
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "pt-PT,pt;q=0.9",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ error: `O portal devolveu um erro (${res.status}). Usa "Colar Texto" em alternativa.` }),
      };
    }

    let html = await res.text();

    // Limpar o HTML: remover scripts, estilos e comentários para poupar tamanho
    // antes de enviar para a IA organizar os dados.
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Limitar tamanho — o essencial (preço, área, tipologia, morada) está sempre
    // nos primeiros blocos da página.
    const MAX_CHARS = 25000;
    if (html.length > MAX_CHARS) html = html.slice(0, MAX_CHARS);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
    };
  } catch (err) {
    console.error("extract-listing error:", err.message);
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Não foi possível aceder ao anúncio. Usa \"Colar Texto\" em alternativa." }),
    };
  }
};
