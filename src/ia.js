/* ═══════════════════════════════════════════════════════════
   ACESSO AO CLAUDE — documentos e imagens

   Estava dentro do App.jsx. Saiu para aqui porque outros
   módulos precisam dele e importar o App.jsx criaria um ciclo.
   ═══════════════════════════════════════════════════════════ */

/** Converte um File em base64, sem o prefixo `data:`. */
export const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = () => reject(new Error("Falha ao ler o ficheiro"));
  reader.readAsDataURL(file);
});

/** Envia um PDF ou imagem em base64 e devolve o texto da resposta. */
export const callClaudeDoc = async (base64Data, mediaType, prompt, maxTokens = 1500) => {
  const isPdf = mediaType === "application/pdf";
  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } };

  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || String(data.error));
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  if (!text) throw new Error("Resposta vazia da análise.");
  return text;
};

/** Transcrição de uma folha de notas manuscritas. */
export const PROMPT_TRANSCREVER = `Esta é a fotografia de uma folha de notas manuscritas tiradas numa reunião de trabalho, em português de Portugal.

Transcreve o que está escrito, respeitando a disposição: cada linha numa linha, listas como listas, setas e sublinhados como estavam. Não reescrevas nem melhores o texto — transcreve.

Onde não conseguires ler, escreve [ilegível] em vez de adivinhar.

Responde apenas com a transcrição, sem introdução nem comentários.`;
