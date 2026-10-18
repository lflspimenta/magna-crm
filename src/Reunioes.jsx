import React, { useState, useEffect, useCallback } from "react";
import { dbReunioes, uploadNotaReuniao, deleteNotaReuniao, dbLeadsAquisicao, dbLeadsGestao, dbLeadsHabitar, dbReady } from "./db.js";
import { G, ehSocio } from "./tema.js";
import { PRE_WRAP } from "./texto.js";
import { fileToBase64, callClaudeDoc, PROMPT_TRANSCREVER } from "./ia.js";
import {
  ESTADOS_REUNIAO, nomeEstado, corEstado, estaFechada, podePromover,
  reuniaoVazia, validar, mudarEstado, historicoLegivel, comoLead,
} from "./reunioes.js";

/* ═══════════════════════════════════════════════════════════
   REUNIÕES DE PROSPECÇÃO

   Encontros com quem ainda não é cliente. Por isso o contacto
   é escrito à mão: não há lista por onde o escolher — é esse o
   ponto.

   As folhas de notas manuscritas são fotografadas e ficam
   anexas. Um botão transcreve cada uma, para a letra deixar de
   ser um arquivo que não se consegue pesquisar.
   ═══════════════════════════════════════════════════════════ */

const dt = (d) => d ? String(d).split("-").reverse().join("/") : "—";
const quando = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
    + ", " + d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
};

const LEADS = [
  { id: "leads_aquisicao", nome: "Adquirir — quer comprar",       db: dbLeadsAquisicao },
  { id: "leads_gestao",    nome: "Rentabilizar — quer rentabilizar", db: dbLeadsGestao },
  { id: "leads_habitar",   nome: "Instalar — quer serviços",      db: dbLeadsHabitar },
];

// ── Peças ──────────────────────────────────────────────────
const Pastilha = ({ estado }) => {
  const cor = G[corEstado(estado)] || G.blue;
  return <span style={{
    fontSize: 10, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase",
    padding: "2px 9px", borderRadius: 10, background: `${cor}20`, color: cor, whiteSpace: "nowrap",
  }}>{nomeEstado(estado)}</span>;
};

const Campo = ({ etiqueta, children, largo = false }) => (
  <div style={largo ? { gridColumn: "1/-1" } : undefined}>
    <label style={{ display: "block", fontSize: 11, color: G.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".3px" }}>{etiqueta}</label>
    {children}
  </div>
);

const entrada = {
  width: "100%", padding: "9px 11px", borderRadius: 8,
  border: `1px solid ${G.border}`, background: G.surface2, color: G.text,
  fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none",
};

const Texto = (p) => <input {...p} style={{ ...entrada, ...(p.style || {}) }} />;
const Area = (p) => <textarea {...p} style={{ ...entrada, resize: "vertical", lineHeight: 1.6, ...(p.style || {}) }} />;

/* ═══════════════════════════════════════════════════════════
   FORMULÁRIO
   ═══════════════════════════════════════════════════════════ */
export function ReuniaoForm({ reuniao, user, onGravar, onCancelar }) {
  const [f, setF] = useState(() => reuniao || reuniaoVazia(user));
  const [erro, setErro] = useState("");
  const [aGravar, setAGravar] = useState(false);
  const novo = !f.id;
  const p = (k) => ({ value: f[k] || "", onChange: (e) => setF(x => ({ ...x, [k]: e.target.value })) });

  const gravar = async () => {
    const faltas = validar(f);
    if (faltas.length) { setErro(`Falta preencher: ${faltas.join(", ")}.`); return; }
    setAGravar(true); setErro("");
    try { await onGravar(f); }
    catch (e) { setErro(e.message || "Não foi possível gravar."); }
    finally { setAGravar(false); }
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Campo etiqueta="Assunto *" largo>
          <Texto {...p("titulo")} placeholder="Ex: Apresentação à Nova Vaga" />
        </Campo>

        <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${G.border}`, paddingTop: 12, marginTop: 2 }}>
          <p style={{ fontSize: 11, color: G.gold1, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 10 }}>
            Contacto
          </p>
          <p style={{ fontSize: 11.5, color: G.textDim, marginBottom: 12, lineHeight: 1.5 }}>
            Escrito à mão — ainda não é cliente, por isso não há lista por onde o escolher.
          </p>
        </div>

        <Campo etiqueta="Nome *"><Texto {...p("contactoNome")} placeholder="Nome da pessoa ou empresa" /></Campo>
        <Campo etiqueta="Telefone"><Texto {...p("contactoTelefone")} placeholder="912 345 678" /></Campo>
        <Campo etiqueta="E-mail"><Texto {...p("contactoEmail")} placeholder="nome@exemplo.pt" /></Campo>
        <Campo etiqueta="Origem"><Texto {...p("origem")} placeholder="Quem indicou, de onde veio" /></Campo>

        <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${G.border}`, paddingTop: 12, marginTop: 2 }}>
          <p style={{ fontSize: 11, color: G.gold1, textTransform: "uppercase", letterSpacing: ".3px" }}>Quando</p>
        </div>
        <Campo etiqueta="Data *"><Texto type="date" {...p("data")} /></Campo>
        <Campo etiqueta="Hora"><Texto type="time" {...p("hora")} /></Campo>
        <Campo etiqueta="Local" largo><Texto {...p("local")} placeholder="Morada, escritório, videochamada…" /></Campo>

        <Campo etiqueta="Preparação — o que vou propor, o que quero saber" largo>
          <Area rows={4} {...p("preparacao")} placeholder="Pontos a levar, perguntas a fazer, o que é preciso confirmar…" />
        </Campo>

        <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${G.border}`, paddingTop: 12, marginTop: 2 }}>
          <p style={{ fontSize: 11, color: G.gold1, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 10 }}>Responsável</p>
        </div>
        <Campo etiqueta="Fica com" largo>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 8 }}>
            <span style={{ fontSize: 13 }}>{f.atribuidoA || "Por atribuir"}</span>
            {novo && (
              <span style={{ marginLeft: "auto", fontSize: 11, color: G.textDim }}>
                criada por {f.criadoPor || user?.nome || "—"}
              </span>
            )}
          </div>
        </Campo>
      </div>

      {erro && <p style={{ fontSize: 12, color: G.red, marginTop: 12, lineHeight: 1.5 }}>{erro}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <button className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button className="btn-gold" onClick={gravar} disabled={aGravar}>
          {aGravar ? "A gravar…" : novo ? "Criar reunião" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MUDAR ESTADO
   ═══════════════════════════════════════════════════════════ */
function MudarEstado({ reuniao, user, onFeito, onCancelar }) {
  const [alvo, setAlvo] = useState("realizada");
  const [texto, setTexto] = useState("");
  const [novaData, setNovaData] = useState(reuniao.data || "");
  const [novaHora, setNovaHora] = useState(reuniao.hora || "");
  const [erro, setErro] = useState("");
  const [aGravar, setAGravar] = useState(false);

  const etiquetas = {
    realizada:  "O que se passou — desenvolvimento da reunião",
    reagendada: "Porque foi reagendada",
    desistiu:   "Porque desistiu",
  };

  const aplicar = async () => {
    setErro(""); setAGravar(true);
    try {
      const campos = mudarEstado(reuniao, alvo, {
        texto, novaData, novaHora, por: user?.nome || "",
      });
      await onFeito(campos);
    } catch (e) {
      setErro(e.message || "Não foi possível guardar.");
    } finally { setAGravar(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["realizada", "reagendada", "desistiu"].map(id => {
          const cor = G[corEstado(id)] || G.blue;
          const on = alvo === id;
          return (
            <button key={id} onClick={() => setAlvo(id)} style={{
              padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
              fontFamily: "'DM Sans',sans-serif",
              background: on ? `${cor}20` : "transparent",
              border: `1px solid ${on ? cor : G.border}`,
              color: on ? cor : G.textMuted,
            }}>{nomeEstado(id)}</button>
          );
        })}
      </div>

      {alvo === "reagendada" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <Campo etiqueta="Nova data *"><Texto type="date" value={novaData} onChange={e => setNovaData(e.target.value)} /></Campo>
          <Campo etiqueta="Nova hora"><Texto type="time" value={novaHora} onChange={e => setNovaHora(e.target.value)} /></Campo>
          <p style={{ gridColumn: "1/-1", fontSize: 11.5, color: G.textDim, lineHeight: 1.5 }}>
            A reunião passa para a nova data e volta a ficar por acontecer. A data antiga e o motivo ficam no histórico.
          </p>
        </div>
      )}

      <Campo etiqueta={`${etiquetas[alvo]} *`} largo>
        <Area rows={5} value={texto} onChange={e => setTexto(e.target.value)}
          placeholder={alvo === "realizada"
            ? "O que foi dito, o que ficou combinado, próximos passos…"
            : "Em poucas palavras, o que levou a isto."} />
      </Campo>

      {alvo === "realizada" && (
        <p style={{ fontSize: 11.5, color: G.textDim, marginTop: 10, lineHeight: 1.5 }}>
          Depois de marcada como realizada, fica disponível o botão para promover o contacto a lead.
        </p>
      )}

      {erro && <p style={{ fontSize: 12, color: G.red, marginTop: 12, lineHeight: 1.5 }}>{erro}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <button className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button className="btn-gold" onClick={aplicar} disabled={aGravar}>
          {aGravar ? "A guardar…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROMOVER A LEAD
   ═══════════════════════════════════════════════════════════ */
function PromoverLead({ reuniao, onFeito, onCancelar }) {
  const [destino, setDestino] = useState(LEADS[0].id);
  const [erro, setErro] = useState("");
  const [aGravar, setAGravar] = useState(false);

  const promover = async () => {
    setErro(""); setAGravar(true);
    try {
      const alvo = LEADS.find(l => l.id === destino);
      const criada = await alvo.db.insert(comoLead(reuniao));
      await onFeito({
        leadTabela: destino,
        leadId: criada?.id ? String(criada.id) : null,
        promovidaEm: new Date().toISOString(),
      });
    } catch (e) {
      setErro(e.message || "Não foi possível criar a lead.");
    } finally { setAGravar(false); }
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: G.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
        O contacto <strong style={{ color: G.text }}>{reuniao.contactoNome}</strong> passa ao Funil com o que já
        se sabe dele: telefone, e-mail, origem e o desenvolvimento da reunião. A reunião fica ligada à lead.
      </p>

      <Campo etiqueta="Em que vertente" largo>
        <select value={destino} onChange={e => setDestino(e.target.value)} style={entrada}>
          {LEADS.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </Campo>

      {erro && <p style={{ fontSize: 12, color: G.red, marginTop: 12, lineHeight: 1.5 }}>{erro}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <button className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button className="btn-gold" onClick={promover} disabled={aGravar}>
          {aGravar ? "A promover…" : "Promover a lead"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FOLHAS DE NOTAS MANUSCRITAS
   ═══════════════════════════════════════════════════════════ */
function Folhas({ reuniao, onMudar }) {
  const [aCarregar, setACarregar] = useState(false);
  const [aTranscrever, setATranscrever] = useState(null);
  const [erro, setErro] = useState("");
  const [aberta, setAberta] = useState(null);
  const folhas = reuniao.notas || [];

  const juntar = async (e) => {
    const ficheiros = Array.from(e.target.files || []);
    e.target.value = "";
    if (!ficheiros.length) return;
    setACarregar(true); setErro("");
    try {
      const novas = [];
      for (const f of ficheiros) {
        const url = await uploadNotaReuniao(f, reuniao.id);
        novas.push({ url, nome: f.name, transcricao: "", em: new Date().toISOString() });
      }
      await onMudar({ notas: [...folhas, ...novas] });
    } catch (err) {
      setErro(err.message?.includes("Bucket not found")
        ? "Falta criar o bucket `notas-reunioes` na Supabase (Storage → New bucket, público)."
        : err.message || "Não foi possível anexar.");
    } finally { setACarregar(false); }
  };

  const transcrever = async (folha, i) => {
    setATranscrever(i); setErro("");
    try {
      const resp = await fetch(folha.url);
      if (!resp.ok) throw new Error("Não foi possível ler a imagem.");
      const blob = await resp.blob();
      const b64 = await fileToBase64(new File([blob], folha.nome || "nota.jpg", { type: blob.type }));
      const texto = await callClaudeDoc(b64, blob.type || "image/jpeg", PROMPT_TRANSCREVER, 2000);
      const novas = folhas.map((x, j) => j === i ? { ...x, transcricao: texto } : x);
      await onMudar({ notas: novas });
    } catch (err) {
      setErro(err.message || "Não foi possível transcrever.");
    } finally { setATranscrever(null); }
  };

  const remover = async (folha, i) => {
    if (!confirm("Eliminar esta folha?")) return;
    try {
      await onMudar({ notas: folhas.filter((_, j) => j !== i) });
      await deleteNotaReuniao(folha.url);
    } catch (err) { setErro(err.message || "Não foi possível eliminar."); }
  };

  return (
    <div style={{ marginTop: 20, borderTop: `1px solid ${G.border}`, paddingTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <p style={{ fontSize: 11, color: G.textDim, textTransform: "uppercase", letterSpacing: ".3px" }}>
          Folhas de notas
        </p>
        {folhas.length > 0 && <span style={{ fontSize: 11, color: G.textDim }}>{folhas.length}</span>}
        <label style={{
          marginLeft: "auto", padding: "6px 14px", borderRadius: 8, cursor: aCarregar ? "default" : "pointer",
          border: `1px dashed ${G.gold1}70`, color: G.gold1, fontSize: 12,
        }}>
          {aCarregar ? "A anexar…" : "+ Fotografar folha"}
          <input type="file" accept="image/*" capture="environment" multiple hidden onChange={juntar} disabled={aCarregar} />
        </label>
      </div>

      {erro && <p style={{ fontSize: 12, color: G.red, marginBottom: 10, lineHeight: 1.5 }}>{erro}</p>}

      {folhas.length === 0 ? (
        <p style={{ fontSize: 12, color: G.textDim, lineHeight: 1.6 }}>
          Fotografe as páginas do bloco. Depois, cada folha pode ser transcrita — a letra fica na imagem, o texto fica pesquisável.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {folhas.map((folha, i) => (
            <div key={folha.url} style={{ border: `1px solid ${G.border}`, borderRadius: 10, background: G.surface2, overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 12, padding: 10, alignItems: "flex-start" }}>
                <img src={folha.url} alt="" onClick={() => setAberta(folha)}
                  style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 7, cursor: "pointer", flexShrink: 0, border: `1px solid ${G.border}` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: G.textMuted, marginBottom: 6 }}>{quando(folha.em)}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setAberta(folha)} style={botaoPeq(G.blue)}>Ver</button>
                    {!folha.transcricao && (
                      <button onClick={() => transcrever(folha, i)} disabled={aTranscrever === i} style={botaoPeq(G.gold1)}>
                        {aTranscrever === i ? "A transcrever…" : "Transcrever"}
                      </button>
                    )}
                    <button onClick={() => remover(folha, i)} style={botaoPeq(G.red)}>Eliminar</button>
                  </div>
                </div>
              </div>
              {folha.transcricao && (
                <div style={{ borderTop: `1px solid ${G.border}`, padding: "10px 12px", background: G.surface }}>
                  <p style={{ fontSize: 10, color: G.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".3px" }}>Transcrição</p>
                  <p style={{ fontSize: 12.5, color: G.textMuted, lineHeight: 1.65, ...PRE_WRAP }}>{folha.transcricao}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {aberta && (
        <div onClick={() => setAberta(null)} style={{
          position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,.86)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out",
        }}>
          <img src={aberta.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

const botaoPeq = (cor) => ({
  padding: "4px 11px", borderRadius: 7, cursor: "pointer", fontSize: 11.5,
  background: "transparent", border: `1px solid ${cor}55`, color: cor,
  fontFamily: "'DM Sans',sans-serif",
});

/* ═══════════════════════════════════════════════════════════
   FICHA
   ═══════════════════════════════════════════════════════════ */
export function ReuniaoDetalhe({ reuniao, user, onMudar, onEditar, onEliminar, mob }) {
  const [painel, setPainel] = useState(null);   // estado · promover
  const r = reuniao;
  const rasto = historicoLegivel(r);

  const aplicar = async (campos) => { await onMudar(campos); setPainel(null); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${G.border}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6, flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: mob ? 20 : 24, fontWeight: 600 }}>{r.titulo}</h2>
            <Pastilha estado={r.estado} />
            {r.leadId && <span style={{ fontSize: 10, background: `${G.green}20`, color: G.green, padding: "2px 9px", borderRadius: 10, fontWeight: 600, textTransform: "uppercase" }}>Lead criada</span>}
          </div>
          <p style={{ fontSize: 13, color: G.textMuted }}>
            {dt(r.data)}{r.hora ? ` às ${r.hora}` : ""}{r.local ? ` · ${r.local}` : ""}
          </p>
        </div>
      </div>

      {/* Contacto */}
      <div style={{ background: G.surface2, borderRadius: 9, padding: "13px 15px", marginBottom: 12 }}>
        <p style={{ fontSize: 10, color: G.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".3px" }}>Contacto</p>
        <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{r.contactoNome}</p>
        <p style={{ fontSize: 12.5, color: G.textMuted, lineHeight: 1.6 }}>
          {[r.contactoTelefone, r.contactoEmail].filter(Boolean).join(" · ") || "sem contactos registados"}
          {r.origem && <><br /><span style={{ color: G.textDim }}>Origem: {r.origem}</span></>}
        </p>
      </div>

      {/* Quem */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ background: G.surface2, borderRadius: 9, padding: "11px 14px" }}>
          <p style={{ fontSize: 10, color: G.textDim, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".3px" }}>Criada por</p>
          <p style={{ fontSize: 13.5 }}>{r.criadoPor || "—"}</p>
        </div>
        <div style={{ background: G.surface2, borderRadius: 9, padding: "11px 14px" }}>
          <p style={{ fontSize: 10, color: G.textDim, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".3px" }}>Fica com</p>
          <p style={{ fontSize: 13.5, color: String(r.atribuidoId) === String(user?.id) ? G.gold1 : G.text }}>
            {r.atribuidoA || "Por atribuir"}
          </p>
        </div>
      </div>

      {r.preparacao && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: G.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".3px" }}>Preparação</p>
          <p style={{ fontSize: 13, color: G.textMuted, lineHeight: 1.7, background: G.surface2, padding: "12px 14px", borderRadius: 8, ...PRE_WRAP }}>{r.preparacao}</p>
        </div>
      )}

      {r.desfecho && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: G.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".3px" }}>
            {r.estado === "desistiu" ? "Motivo da desistência" : "Desenvolvimento"}
          </p>
          <p style={{ fontSize: 13, color: G.textMuted, lineHeight: 1.7, background: G.surface2, padding: "12px 14px", borderRadius: 8, ...PRE_WRAP }}>{r.desfecho}</p>
        </div>
      )}

      {/* Histórico */}
      {rasto.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: G.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".3px" }}>Histórico</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {rasto.map((h, i) => (
              <div key={i} style={{ fontSize: 12, color: G.textMuted, lineHeight: 1.6, paddingLeft: 12, borderLeft: `2px solid ${G.border}` }}>
                <span style={{ color: G.text, fontWeight: 500 }}>{h.rotulo}</span>
                <span style={{ color: G.textDim }}> · {quando(h.em)}{h.por ? ` · ${h.por}` : ""}</span>
                {h.motivo && !h.repetido && <><br /><span style={PRE_WRAP}>{h.motivo}</span></>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Folhas reuniao={r} onMudar={onMudar} />

      {/* Painéis */}
      {painel === "estado" && (
        <div style={{ marginTop: 18, borderTop: `1px solid ${G.border}`, paddingTop: 16 }}>
          <MudarEstado reuniao={r} user={user} onFeito={aplicar} onCancelar={() => setPainel(null)} />
        </div>
      )}
      {painel === "promover" && (
        <div style={{ marginTop: 18, borderTop: `1px solid ${G.border}`, paddingTop: 16 }}>
          <PromoverLead reuniao={r} onFeito={aplicar} onCancelar={() => setPainel(null)} />
        </div>
      )}

      {/* Acções */}
      {!painel && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", borderTop: `1px solid ${G.border}`, paddingTop: 16, marginTop: 18 }}>
          <button className="btn-gold" onClick={() => setPainel("estado")} style={{ flex: mob ? "1 1 100%" : 1 }}>
            {estaFechada(r) ? "Mudar situação" : "Registar o que aconteceu"}
          </button>
          {podePromover(r) && (
            <button className="btn-ghost" onClick={() => setPainel("promover")} style={{ borderColor: G.green, color: G.green, flex: mob ? 1 : "none" }}>
              Promover a lead
            </button>
          )}
          <button className="btn-ghost" onClick={onEditar} style={{ flex: mob ? 1 : "none" }}>Editar</button>
          <button className="btn-ghost" onClick={onEliminar} style={{ flex: mob ? 1 : "none", borderColor: `${G.red}40`, color: G.red }}>Eliminar</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LIGAÇÃO À BASE DE DADOS
   ═══════════════════════════════════════════════════════════ */
export function useReunioes(user) {
  const [lista, setLista] = useState([]);
  const [carregar, setCarregar] = useState(true);
  const [erro, setErro] = useState("");

  const recarregar = useCallback(async () => {
    if (!dbReady) { setCarregar(false); return; }
    setCarregar(true);
    try { setLista(await dbReunioes.list()); setErro(""); }
    catch (e) { setErro(e.message || "Não foi possível carregar as reuniões."); }
    finally { setCarregar(false); }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const gravar = async (r) => {
    const guardada = r.id ? await dbReunioes.update(r.id, r) : await dbReunioes.insert(r);
    setLista(l => r.id ? l.map(x => x.id === r.id ? { ...x, ...guardada } : x) : [...l, guardada]);
    return guardada;
  };

  const actualizar = async (id, campos) => {
    const guardada = await dbReunioes.update(id, campos);
    setLista(l => l.map(x => x.id === id ? { ...x, ...guardada } : x));
    return guardada;
  };

  const eliminar = async (id) => {
    await dbReunioes.remove(id);
    setLista(l => l.filter(x => x.id !== id));
  };

  return { lista, carregar, erro, recarregar, gravar, actualizar, eliminar };
}
