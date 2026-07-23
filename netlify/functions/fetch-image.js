// netlify/functions/fetch-image.js
// Descarrega uma imagem de um anúncio (Idealista/Imovirtual/CDNs associados)
// e devolve em base64, para o browser poder fazer upload para o Supabase Storage
// sem esbarrar em restrições de CORS dos CDNs de imagens.

const DOMINIOS_PERMITIDOS = [
  "idealista.pt", "idealista.com",
  "imovirtual.com", "olxcdn.com",
];

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

  let url;
  try {
    ({ url } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Pedido inválido." }) };
  }

  if (!url || !DOMINIOS_PERMITIDOS.some((d) => url.includes(d))) {
    return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Domínio de imagem não permitido." }) };
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) throw new Error(`Imagem devolveu ${res.status}`);

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());

    // Limite de tamanho — 8MB é mais do que suficiente para uma foto de anúncio
    if (buf.length > 8 * 1024 * 1024) throw new Error("Imagem demasiado grande.");

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ base64: buf.toString("base64"), contentType }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Não foi possível descarregar a imagem." }),
    };
  }
};
