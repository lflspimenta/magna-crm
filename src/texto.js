/* ═══════════════════════════════════════════════════════════
   TEXTO LIVRE — quebras de linha e HTML

   O HTML junta quebras de linha num único espaço. Um texto
   escrito com parágrafos numa caixa de texto fica um bloco só
   quando é desenhado num <p> normal.

   Em React basta o CSS `white-space: pre-wrap` (ver PRE_WRAP).
   Nos documentos que geramos por string — a ficha do imóvel, a
   angariação — é preciso construir o HTML à mão, e aí o texto
   TEM de ser escapado: uma descrição com um `<` ou um `&` parte
   a página inteira.
   ═══════════════════════════════════════════════════════════ */

/** Para texto livre dentro de JSX. O React já escapa o conteúdo. */
export const PRE_WRAP = { whiteSpace: "pre-wrap", wordBreak: "break-word" };

/** Neutraliza o que o navegador leria como marcação. */
export const escaparHtml = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

/**
 * Texto livre → HTML com a forma que a pessoa escreveu.
 * Linha em branco separa parágrafos; quebra simples é <br>.
 * Devolve "" para texto vazio, para quem chama poder omitir a
 * secção inteira.
 */
export const paragrafosHtml = (texto, classe = "") => {
  const limpo = String(texto ?? "").replace(/\r\n?/g, "\n").trim();
  if (!limpo) return "";
  const attr = classe ? ` class="${escaparHtml(classe)}"` : "";
  return limpo
    .split(/\n{2,}/)                       // linha em branco → novo parágrafo
    .map(p => p.split("\n").map(escaparHtml).join("<br>"))
    .map(p => `<p${attr}>${p}</p>`)
    .join("");
};

/**
 * Normaliza texto importado de um anúncio. Antes esmagava-se
 * tudo com /\s+/ → " ", o que apagava os parágrafos do anúncio
 * antes sequer de chegarem à base de dados.
 *
 * Aqui: espaços repetidos dentro da linha desaparecem, as
 * quebras de linha ficam, e três ou mais linhas em branco
 * seguidas passam a uma só.
 */
export const normalizarImportado = (texto, limite = 0) => {
  let s = String(texto ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(l => l.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (limite > 0 && s.length > limite) {
    // Cortar num limite de linha, para não partir uma frase a meio.
    const corte = s.slice(0, limite);
    const ultima = corte.lastIndexOf("\n");
    s = (ultima > limite * 0.6 ? corte.slice(0, ultima) : corte).trim() + "…";
  }
  return s;
};
