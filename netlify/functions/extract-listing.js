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
    // Tenta primeiro directamente; se o portal bloquear (403/429), tenta via
    // proxy público — o Idealista/Imovirtual bloqueiam por IP de datacenter,
    // um proxy pode ter um IP diferente, não sinalizado.
    const headersBrowser = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
      "Referer": "https://www.google.com/",
    };

    let res = await fetch(url, { headers: headersBrowser, redirect: "follow" });

    if (res.status === 403 || res.status === 429) {
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const resProxy = await fetch(proxyUrl, { headers: headersBrowser, redirect: "follow" });
        if (resProxy.ok) res = resProxy;
      } catch (e) {
        console.error("proxy fallback falhou:", e.message);
      }
    }

    if (!res.ok) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ error: `O portal devolveu um erro (${res.status}). Usa "Colar Texto" em alternativa.` }),
      };
    }

    let html = await res.text();

    // Extrair imagens do HTML COMPLETO (antes de qualquer corte) — mais fiável
    // do que pedir à IA para as encontrar num texto já truncado.
    const imagensSet = new Set();
    // og:image (sempre no <head>, uma imagem de capa garantida)
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch) imagensSet.add(ogMatch[1]);
    // <img src="..."> apontando para CDNs conhecidos dos portais
    const imgRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
    let m;
    while ((m = imgRegex.exec(html)) !== null && imagensSet.size < 12) {
      const src = m[1];
      if (/idealista|olxcdn|imovirtual/i.test(src) && !/logo|icon|avatar|static\/img|loading/i.test(src)) {
        imagensSet.add(src);
      }
    }
    const imagens = Array.from(imagensSet).slice(0, 8);

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
      body: JSON.stringify({ html, imagens }),
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
