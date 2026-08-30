// netlify/functions/search-listings.js
// Pesquisa anúncios no Idealista e/ou Imovirtual a partir de filtros.
// Usa o Scrape.do (proxies residenciais) quando o token está configurado —
// sem ele, os portais bloqueiam pedidos vindos de servidores (403).

// ── IDEALISTA ──────────────────────────────────────────────
// Zona: /{concelho}/ ou /{concelho}/{freguesia}/ ou /{distrito}-distrito/
// Filtros: /com-{filtro1,filtro2}/
function urlIdealista({ finalidade, tipo, concelho, freguesia, distrito, tipologias, precoMax, precoMin, areaMin }) {
  const zona = concelho
    ? (freguesia ? `${concelho}/${freguesia}` : concelho)
    : `${distrito}-distrito`;

  if (tipo === "Terreno") {
    const f = [];
    if (precoMax) f.push(`preco-max_${precoMax}`);
    if (precoMin) f.push(`preco-min_${precoMin}`);
    return `https://www.idealista.pt/comprar-terrenos/${zona}${f.length ? `/com-${f.join(",")}` : ""}/`;
  }

  const base = finalidade === "Arrendamento" ? "arrendar-casas" : "comprar-casas";
  const filtros = [];
  if (precoMax) filtros.push(`preco-max_${precoMax}`);
  if (precoMin) filtros.push(`preco-min_${precoMin}`);
  if (areaMin) filtros.push(`tamanho-min_${areaMin}`);
  if (tipo === "Apartamento") filtros.push("apartamentos");
  if (tipo === "Moradia") filtros.push("moradias");
  // T4 no Idealista é "t4-t5" (T4 ou mais)
  if (Array.isArray(tipologias) && tipologias.length) {
    filtros.push(...tipologias.map(t => (t === "t4" ? "t4-t5" : t)));
  }
  return `https://www.idealista.pt/${base}/${zona}${filtros.length ? `/com-${filtros.join(",")}` : ""}/`;
}

// ── IMOVIRTUAL ─────────────────────────────────────────────
// /pt/resultados/{comprar|arrendar}/{tipo,filtros}/{distrito}/{concelho}/{freguesia}
function urlImovirtual({ finalidade, tipo, concelho, freguesia, distrito, tipologias, precoMax, precoMin, areaMin }) {
  const accao = finalidade === "Arrendamento" ? "arrendar" : "comprar";

  const segTipo = [];
  if (tipo === "Apartamento") segTipo.push("apartamento");
  else if (tipo === "Moradia") segTipo.push("moradia");
  else if (tipo === "Terreno") segTipo.push("terreno");
  else segTipo.push("apartamento"); // o Imovirtual exige sempre um segmento de tipo
  if (Array.isArray(tipologias) && tipologias.length) segTipo.push(...tipologias);

  let zona = distrito;
  if (concelho) zona += `/${concelho}`;
  if (concelho && freguesia) zona += `/${freguesia}`;

  const qs = [];
  if (precoMin) qs.push(`priceMin=${precoMin}`);
  if (precoMax) qs.push(`priceMax=${precoMax}`);
  if (areaMin) qs.push(`areaMin=${areaMin}`);

  return `https://www.imovirtual.com/pt/resultados/${accao}/${segTipo.join(",")}/${zona}${qs.length ? `?${qs.join("&")}` : ""}`;
}

// ── EXTRACÇÃO: IDEALISTA ───────────────────────────────────
function extrairIdealista(html) {
  const anuncios = [];
  const vistos = new Set();
  const regexLink = /<a[^>]+href="(\/imovel\/(\d+)\/?)"[^>]*>([\s\S]{0,300}?)<\/a>/gi;
  let m;
  while ((m = regexLink.exec(html)) !== null && anuncios.length < 40) {
    const [, href, id, interior] = m;
    if (vistos.has(id)) continue;
    const titulo = interior.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (!titulo || titulo.length < 8) continue;
    const contexto = html.slice(m.index, m.index + 1800).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
    const mPreco = contexto.match(/([\d.]+)\s*€(?!\/m)/);
    const mPrecoM2 = contexto.match(/([\d.]+)\s*€\/m²/);
    const mArea = contexto.match(/(\d+)\s*m²\s*área/i) || contexto.match(/(\d+)\s*m²/);
    const mTip = contexto.match(/\bT(\d+)\b/);
    const num = (s) => (s ? Number(String(s).replace(/\./g, "")) : 0);
    vistos.add(id);
    anuncios.push({
      id: `id-${id}`, portal: "Idealista", titulo: titulo.slice(0, 140),
      url: `https://www.idealista.pt${href}`,
      preco: num(mPreco && mPreco[1]), precoM2: num(mPrecoM2 && mPrecoM2[1]),
      area: mArea ? Number(mArea[1]) : 0, quartos: mTip ? Number(mTip[1]) : 0,
    });
  }
  const texto = html.replace(/<[^>]*>/g, " ");
  const mMedia = texto.match(/Preço médio nesta zona\s*([\d.]+)\s*eur\/m²/i);
  const mTotal = texto.match(/(\d[\d.]*)\s+casas e (?:apartamentos|moradias)/i);
  return {
    anuncios,
    precoMedioZona: mMedia ? Number(mMedia[1].replace(/\./g, "")) : 0,
    total: mTotal ? Number(mTotal[1].replace(/\./g, "")) : anuncios.length,
  };
}

// ── EXTRACÇÃO: IMOVIRTUAL ──────────────────────────────────
function extrairImovirtual(html) {
  const anuncios = [];
  const vistos = new Set();
  // Links de anúncio: /pt/anuncio/{slug}-ID{codigo}
  const regexLink = /<a[^>]+href="(\/pt\/anuncio\/([a-z0-9-]+-ID[A-Za-z0-9]+))"[^>]*>([\s\S]{0,300}?)<\/a>/gi;
  let m;
  while ((m = regexLink.exec(html)) !== null && anuncios.length < 40) {
    const [, href, id, interior] = m;
    if (vistos.has(id)) continue;
    const titulo = interior.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    // Os links de imagem não têm texto — o título vem no link de texto
    if (!titulo || titulo.length < 8) continue;

    // Preço: no Imovirtual aparece ANTES do título. Usamos o match mais próximo
    // do link (o último antes dele), para não apanhar o preço do anúncio anterior.
    const antes = html.slice(Math.max(0, m.index - 400), m.index).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
    const precos = [...antes.matchAll(/([\d][\d\s]{2,})\s*€(?!\/m)/g)];
    const precosM2 = [...antes.matchAll(/([\d\s.,]+)\s*€\/m²/g)];
    const mPreco = precos.length ? precos[precos.length - 1] : null;
    const mPrecoM2 = precosM2.length ? precosM2[precosM2.length - 1] : null;

    // Área e tipologia vêm DEPOIS do título, no bloco de detalhes deste anúncio
    const depois = html.slice(m.index + m[0].length, m.index + m[0].length + 500).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
    const mArea = depois.match(/([\d.,]+)\s*m²/);
    const mTip = depois.match(/\bT(\d+)\b/);

    const numPreco = (s) => (s ? Number(String(s).replace(/[\s.]/g, "")) : 0);
    const numDec = (s) => (s ? Number(String(s).replace(/\s/g, "").replace(",", ".")) : 0);
    vistos.add(id);
    anuncios.push({
      id: `iv-${id}`, portal: "Imovirtual", titulo: titulo.slice(0, 140),
      url: `https://www.imovirtual.com${href}`,
      preco: numPreco(mPreco && mPreco[1]),
      precoM2: Math.round(numDec(mPrecoM2 && mPrecoM2[1])),
      area: Math.round(numDec(mArea && mArea[1])), quartos: mTip ? Number(mTip[1]) : 0,
    });
  }
  const texto = html.replace(/<[^>]*>/g, " ");
  const mTotal = texto.match(/de\s+([\d\s.]+)\s+an[úu]ncios/i);
  return {
    anuncios,
    precoMedioZona: 0, // o Imovirtual dá o preço médio do imóvel, não por m²
    total: mTotal ? Number(String(mTotal[1]).replace(/[\s.]/g, "")) : anuncios.length,
  };
}

// ── PEDIDO AO PORTAL ───────────────────────────────────────
async function buscarHtml(url) {
  const TOKEN = process.env.SCRAPEDO_TOKEN;
  if (TOKEN) {
    const proxy = `https://api.scrape.do/?token=${TOKEN}&url=${encodeURIComponent(url)}&geoCode=pt`;
    return fetch(proxy, { redirect: "follow" });
  }
  return fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "pt-PT,pt;q=0.9",
      "Referer": "https://www.google.com/",
    },
    redirect: "follow",
  });
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
  try { filtros = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Pedido inválido." }) }; }

  if (!filtros.distrito) {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "É necessário indicar pelo menos o distrito." }),
    };
  }

  const portais = Array.isArray(filtros.portais) && filtros.portais.length ? filtros.portais : ["idealista"];
  const tarefas = [];
  if (portais.includes("idealista")) tarefas.push({ portal: "Idealista", url: urlIdealista(filtros), extrair: extrairIdealista });
  if (portais.includes("imovirtual")) tarefas.push({ portal: "Imovirtual", url: urlImovirtual(filtros), extrair: extrairImovirtual });

  const resultados = await Promise.all(tarefas.map(async (t) => {
    try {
      const res = await buscarHtml(t.url);
      if (!res.ok) return { portal: t.portal, url: t.url, erro: `erro ${res.status}`, anuncios: [] };
      const html = await res.text();
      return { portal: t.portal, url: t.url, ...t.extrair(html) };
    } catch (e) {
      console.error(`${t.portal}:`, e.message);
      return { portal: t.portal, url: t.url, erro: e.message, anuncios: [] };
    }
  }));

  // Juntar anúncios dos vários portais, ordenados por preço
  const anuncios = resultados.flatMap(r => r.anuncios || []).sort((a, b) => (a.preco || 0) - (b.preco || 0));

  // Preço médio por m²: usa o do Idealista se existir; senão, mediana dos anúncios
  let precoMedioZona = 0;
  const comMedia = resultados.find(r => r.precoMedioZona > 0);
  if (comMedia) precoMedioZona = comMedia.precoMedioZona;
  else {
    const valores = anuncios.map(a => a.precoM2).filter(v => v > 0).sort((a, b) => a - b);
    if (valores.length) precoMedioZona = Math.round(valores[Math.floor(valores.length / 2)]);
  }

  const total = resultados.reduce((s, r) => s + (r.total || 0), 0);
  const erros = resultados.filter(r => r.erro).map(r => `${r.portal}: ${r.erro}`);

  if (anuncios.length === 0 && erros.length === tarefas.length) {
    const TOKEN = process.env.SCRAPEDO_TOKEN;
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({
        error: TOKEN
          ? `Os portais não responderam (${erros.join("; ")}). Tenta novamente dentro de momentos.`
          : "Os portais bloquearam o pedido. É necessário configurar SCRAPEDO_TOKEN no Netlify.",
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    body: JSON.stringify({
      anuncios, precoMedioZona, total,
      porPortal: resultados.map(r => ({ portal: r.portal, url: r.url, encontrados: (r.anuncios || []).length, erro: r.erro || null })),
      avisos: erros.length ? erros : null,
    }),
  };
};
