// netlify/functions/search-listings.js
// Pesquisa anúncios no Idealista a partir de filtros e devolve a lista extraída.
// Usa o Scrape.do (proxies residenciais) quando o token está configurado —
// sem ele, o Idealista bloqueia pedidos vindos de servidores (403).

// Constrói o URL de pesquisa do Idealista a partir dos filtros.
// Formato: /comprar-casas/{zona}/com-{filtros separados por vírgula}/
function construirUrlIdealista({ finalidade, tipo, zona, tipologias, precoMax, precoMin, areaMin }) {
  const base = finalidade === "Arrendamento" ? "arrendar-casas" : "comprar-casas";

  // Terrenos têm secção própria no Idealista
  if (tipo === "Terreno") {
    const filtrosT = [];
    if (precoMax) filtrosT.push(`preco-max_${precoMax}`);
    if (precoMin) filtrosT.push(`preco-min_${precoMin}`);
    const sufixoT = filtrosT.length ? `/com-${filtrosT.join(",")}` : "";
    return `https://www.idealista.pt/comprar-terrenos/${zona}${sufixoT}/`;
  }

  const filtros = [];
  if (precoMax) filtros.push(`preco-max_${precoMax}`);
  if (precoMin) filtros.push(`preco-min_${precoMin}`);
  if (areaMin) filtros.push(`tamanho-min_${areaMin}`);
  if (tipo === "Apartamento") filtros.push("apartamentos");
  if (tipo === "Moradia") filtros.push("moradias");
  // tipologias: array tipo ["t2","t3"]
  if (Array.isArray(tipologias) && tipologias.length) filtros.push(...tipologias);

  const sufixo = filtros.length ? `/com-${filtros.join(",")}` : "";
  return `https://www.idealista.pt/${base}/${zona}${sufixo}/`;
}

// Extrai os anúncios do HTML da página de resultados.
// Cada anúncio tem um link /imovel/{id}/ com título, e a seguir preço, €/m², tipologia e área.
function extrairAnuncios(html) {
  const anuncios = [];
  const vistos = new Set();

  // Blocos de anúncio: começam no link do imóvel
  const regexLink = /<a[^>]+href="(\/imovel\/(\d+)\/?)"[^>]*>([\s\S]{0,300}?)<\/a>/gi;
  let m;
  while ((m = regexLink.exec(html)) !== null && anuncios.length < 40) {
    const [, href, id, interior] = m;
    if (vistos.has(id)) continue;

    const titulo = interior.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (!titulo || titulo.length < 8) continue;

    // Procurar preço e detalhes nos ~1500 caracteres a seguir ao link
    const contexto = html.slice(m.index, m.index + 1800).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");

    const mPreco = contexto.match(/([\d.]+)\s*€(?!\/m)/);
    const mPrecoM2 = contexto.match(/([\d.]+)\s*€\/m²/);
    const mArea = contexto.match(/(\d+)\s*m²\s*área/i) || contexto.match(/(\d+)\s*m²/);
    const mTipologia = contexto.match(/\bT(\d)\b/);

    const num = (s) => s ? Number(String(s).replace(/\./g, "")) : 0;

    vistos.add(id);
    anuncios.push({
      id,
      titulo: titulo.slice(0, 140),
      url: `https://www.idealista.pt${href}`,
      preco: num(mPreco && mPreco[1]),
      precoM2: num(mPrecoM2 && mPrecoM2[1]),
      area: mArea ? Number(mArea[1]) : 0,
      quartos: mTipologia ? Number(mTipologia[1]) : 0,
    });
  }

  // Preço médio da zona, mostrado no fim da listagem
  const mMedia = html.replace(/<[^>]*>/g, " ").match(/Preço médio nesta zona\s*([\d.]+)\s*eur\/m²/i);
  const precoMedioZona = mMedia ? Number(mMedia[1].replace(/\./g, "")) : 0;

  // Total de resultados encontrados
  const mTotal = html.replace(/<[^>]*>/g, " ").match(/(\d[\d.]*)\s+casas e apartamentos/i);
  const total = mTotal ? Number(mTotal[1].replace(/\./g, "")) : anuncios.length;

  return { anuncios, precoMedioZona, total };
}

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
    return { statusCode: 405, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let filtros;
  try {
    filtros = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Pedido inválido." }) };
  }

  if (!filtros.zona) {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "É necessário indicar a zona (concelho ou distrito)." }),
    };
  }

  const urlPesquisa = construirUrlIdealista(filtros);

  try {
    const TOKEN = process.env.SCRAPEDO_TOKEN;
    let res;

    if (TOKEN) {
      const urlProxy = `https://api.scrape.do/?token=${TOKEN}&url=${encodeURIComponent(urlPesquisa)}&geoCode=pt`;
      res = await fetch(urlProxy, { redirect: "follow" });
    } else {
      res = await fetch(urlPesquisa, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "pt-PT,pt;q=0.9",
          "Referer": "https://www.google.com/",
        },
        redirect: "follow",
      });
    }

    if (!res.ok) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({
          error: TOKEN
            ? `O portal devolveu um erro (${res.status}). Tenta novamente dentro de momentos.`
            : `O portal bloqueou o pedido (${res.status}). É necessário configurar SCRAPEDO_TOKEN no Netlify.`,
          urlPesquisa,
        }),
      };
    }

    const html = await res.text();
    const { anuncios, precoMedioZona, total } = extrairAnuncios(html);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ anuncios, precoMedioZona, total, urlPesquisa }),
    };
  } catch (err) {
    console.error("search-listings:", err.message);
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Não foi possível fazer a pesquisa. Tenta novamente.", urlPesquisa }),
    };
  }
};
