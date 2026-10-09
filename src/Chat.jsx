import React, { useState, useEffect, useRef, useCallback } from "react";
import { supa } from "./db.js";
import { G, ehSocio } from "./tema.js";

/* ═══════════════════════════════════════════════════════════
   CHAT INTERNO — sócias e administrador

   Sem base de dados e sem SQL. Assenta inteiramente no
   Supabase Realtime:
     · presence  → quem está ligado neste momento
     · broadcast → as mensagens, que vivem só em memória

   Consequências, todas pedidas:
     · fechar o separador apaga a conversa
     · quem está offline não recebe nada e não aparece na lista
     · um agente nunca subscreve o canal

   Duas conversas:
     · Sala  — todos os sócios ligados lêem
     · Directa — só as duas pessoas envolvidas
   ═══════════════════════════════════════════════════════════ */

const CANAL = "magna-chat";
const SALA = "sala";

const agora = () => new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

export default function Chat({ user, mob = false }) {
  const podeUsar = ehSocio(user) && !!supa;

  const [aberto, setAberto]   = useState(false);
  const [online, setOnline]   = useState([]);     // [{id,nome,avatar,cargo,role}]
  const [msgs, setMsgs]       = useState([]);     // vive só em memória
  const [vista, setVista]     = useState(SALA);   // SALA ou id de pessoa
  const [texto, setTexto]     = useState("");
  const [porLer, setPorLer]   = useState({});     // { [conversa]: nº }
  const [ligado, setLigado]   = useState(false);

  const canalRef  = useRef(null);
  const fimRef    = useRef(null);
  const abertoRef = useRef(false);
  const vistaRef  = useRef(SALA);

  useEffect(() => { abertoRef.current = aberto; }, [aberto]);
  useEffect(() => { vistaRef.current = vista;  }, [vista]);

  // ── Ligação ao canal ────────────────────────────────────
  useEffect(() => {
    if (!podeUsar) return;

    const ch = supa.channel(CANAL, {
      config: {
        presence: { key: String(user.id) },
        broadcast: { self: true },           // a minha mensagem volta por aqui
      },
    });

    ch.on("presence", { event: "sync" }, () => {
      const estado = ch.presenceState();
      const lista = Object.values(estado)
        .map(entradas => entradas[0])
        .filter(Boolean)
        .filter(p => String(p.id) !== String(user.id));
      // Ordem estável para a lista não saltar
      lista.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt"));
      setOnline(lista);
    });

    ch.on("broadcast", { event: "msg" }, ({ payload }) => {
      if (!payload) return;
      // Só interessa o que é para a sala ou para mim (ou meu, de volta)
      const meu = String(payload.deId) === String(user.id);
      const paraMim = payload.paraId && String(payload.paraId) === String(user.id);
      if (payload.paraId && !meu && !paraMim) return;

      setMsgs(m => [...m, payload]);

      // Marcar por ler se não estiver a olhar para esta conversa
      const conversa = payload.paraId ? String(meu ? payload.paraId : payload.deId) : SALA;
      const aVer = abertoRef.current && String(vistaRef.current) === conversa;
      if (!meu && !aVer) setPorLer(p => ({ ...p, [conversa]: (p[conversa] || 0) + 1 }));
    });

    ch.subscribe(async (estado) => {
      if (estado !== "SUBSCRIBED") { setLigado(false); return; }
      setLigado(true);
      await ch.track({
        id: user.id,
        nome: user.nome,
        avatar: user.avatar || (user.nome || "?").charAt(0).toUpperCase(),
        cargo: user.cargo || "",
        role: user.role,
      });
    });

    canalRef.current = ch;
    return () => { try { supa.removeChannel(ch); } catch (e) {} canalRef.current = null; };
  }, [podeUsar, user?.id]);

  // ── Limpar o contador da conversa que está à vista ──────
  useEffect(() => {
    if (!aberto) return;
    setPorLer(p => (p[String(vista)] ? { ...p, [String(vista)]: 0 } : p));
  }, [aberto, vista, msgs.length]);

  // ── Manter o fim da conversa à vista ────────────────────
  useEffect(() => {
    const fim = fimRef.current;
    if (aberto && fim && typeof fim.scrollIntoView === "function") {
      fim.scrollIntoView({ block: "end" });
    }
  }, [msgs, aberto, vista]);

  // Se a pessoa com quem falo sair, a conversa fica à vista para
  // se poder ler o que ficou, mas a caixa de escrita fecha —
  // ver `destinoOffline` mais abaixo.

  const enviar = useCallback(() => {
    const t = texto.trim();
    const ch = canalRef.current;
    if (!t || !ch || !ligado) return;
    ch.send({
      type: "broadcast",
      event: "msg",
      payload: {
        id: `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        deId: user.id,
        de: user.nome,
        avatar: user.avatar || (user.nome || "?").charAt(0).toUpperCase(),
        paraId: vista === SALA ? null : vista,
        texto: t.slice(0, 1000),
        hora: agora(),
      },
    });
    setTexto("");
  }, [texto, vista, ligado, user]);

  if (!podeUsar) return null;

  const visiveis = msgs.filter(m =>
    vista === SALA
      ? !m.paraId
      : (String(m.deId) === String(vista) && String(m.paraId) === String(user.id)) ||
        (String(m.deId) === String(user.id) && String(m.paraId) === String(vista))
  );

  const pessoaAlvo = vista === SALA ? null : online.find(p => String(p.id) === String(vista));
  const destinoOffline = vista !== SALA && !pessoaAlvo;
  const totalPorLer = Object.values(porLer).reduce((a, b) => a + b, 0);

  const larguraPainel = mob ? "calc(100vw - 24px)" : 360;
  const alturaPainel  = mob ? "min(72vh, 520px)" : 480;

  return (
    <>
      {/* ── Botão flutuante ── */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          title="Chat interno"
          style={{
            position: "fixed", right: 18, bottom: mob ? 86 : 20, zIndex: 900,
            width: 52, height: 52, borderRadius: "50%", cursor: "pointer",
            background: G.surface2, border: `1px solid ${G.border}`,
            boxShadow: `0 6px 20px ${G.sombra}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <IconeChat cor={G.gold1} />
          {online.length > 0 && (
            <span style={{
              position: "absolute", top: 2, right: 2, minWidth: 18, height: 18,
              borderRadius: 9, background: G.green, color: "#fff", fontSize: 10,
              fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 5px", border: `2px solid ${G.surface2}`,
            }}>{online.length}</span>
          )}
          {totalPorLer > 0 && (
            <span style={{
              position: "absolute", bottom: 2, right: 2, width: 12, height: 12,
              borderRadius: 6, background: G.gold1, border: `2px solid ${G.surface2}`,
            }}/>
          )}
        </button>
      )}

      {/* ── Painel ── */}
      {aberto && (
        <div style={{
          position: "fixed", right: mob ? 12 : 18, bottom: mob ? 86 : 20, zIndex: 900,
          width: larguraPainel, height: alturaPainel,
          background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14,
          boxShadow: `0 14px 44px ${G.sombra}`, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>

          {/* Cabeçalho */}
          <div style={{
            padding: "11px 14px", borderBottom: `1px solid ${G.border}`,
            display: "flex", alignItems: "center", gap: 9, flexShrink: 0, background: G.surface2,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: 4, flexShrink: 0,
              background: ligado ? G.green : G.textDim,
            }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: G.text }}>Chat interno</p>
              <p style={{ fontSize: 11, color: G.textDim }}>
                {!ligado ? "a ligar…"
                  : online.length === 0 ? "só tu estás online"
                  : `${online.length} ${online.length === 1 ? "pessoa online" : "pessoas online"}`}
              </p>
            </div>
            <button onClick={() => setAberto(false)} title="Fechar"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: G.textMuted, fontSize: 18, lineHeight: 1 }}>×</button>
          </div>

          {/* Separadores: Sala + quem está online */}
          <div style={{
            display: "flex", gap: 6, padding: "9px 10px", overflowX: "auto",
            borderBottom: `1px solid ${G.border}`, flexShrink: 0,
          }}>
            <Aba activa={vista === SALA} onClick={() => setVista(SALA)}
              porLer={porLer[SALA] || 0} label="Sala" />
            {online.map(p => (
              <Aba key={p.id} activa={String(vista) === String(p.id)}
                onClick={() => setVista(p.id)}
                porLer={porLer[String(p.id)] || 0}
                label={String(p.nome).split(" ")[0]} ponto />
            ))}
          </div>

          {/* Mensagens */}
          {/* gap largo para o nome de quem escreve colar à sua própria
              mensagem e não à hora da mensagem anterior */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 16 }}>
            {visiveis.length === 0 && (
              <p style={{ fontSize: 12, color: G.textDim, textAlign: "center", margin: "auto", lineHeight: 1.6, padding: "0 14px" }}>
                {vista === SALA
                  ? (online.length === 0
                      ? "Ninguém online neste momento. Para falar com alguém que não está aqui, usa o WhatsApp."
                      : "Sala comum. O que escreveres aqui é lido por todos os que estão online.")
                  : "Conversa directa. Só vocês os dois lêem."}
              </p>
            )}
            {visiveis.map(m => {
              const meu = String(m.deId) === String(user.id);
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: meu ? "flex-end" : "flex-start" }}>
                  {!meu && vista === SALA && (
                    <span style={{ fontSize: 10, color: G.textDim, marginBottom: 3, paddingLeft: 2 }}>{m.de}</span>
                  )}
                  <div style={{
                    maxWidth: "82%", padding: "8px 11px", borderRadius: 11,
                    background: meu ? `${G.gold1}1F` : G.surface2,
                    border: `1px solid ${meu ? `${G.gold1}40` : G.border}`,
                    fontSize: 13, color: G.text, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>{m.texto}</div>
                  <span style={{ fontSize: 9.5, color: G.textDim, marginTop: 3 }}>{m.hora}</span>
                </div>
              );
            })}
            <div ref={fimRef} />
          </div>

          {/* Caixa de escrita */}
          <div style={{ padding: 10, borderTop: `1px solid ${G.border}`, flexShrink: 0, background: G.surface2 }}>
            {destinoOffline ? (
              <p style={{ fontSize: 11.5, color: G.textDim, textAlign: "center", padding: "7px 4px", lineHeight: 1.5 }}>
                Esta pessoa saiu. Para lhe falar agora, usa o WhatsApp.
              </p>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  placeholder={vista === SALA ? "Mensagem para todos…" : `Mensagem para ${String(pessoaAlvo?.nome || "").split(" ")[0]}…`}
                  rows={1}
                  style={{
                    flex: 1, resize: "none", maxHeight: 92, padding: "9px 11px",
                    borderRadius: 9, border: `1px solid ${G.border}`, background: G.surface,
                    color: G.text, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.45, outline: "none",
                  }}
                />
                <button onClick={enviar} disabled={!texto.trim() || !ligado} title="Enviar"
                  style={{
                    width: 38, height: 38, borderRadius: 9, flexShrink: 0, border: "none",
                    cursor: texto.trim() && ligado ? "pointer" : "default",
                    background: texto.trim() && ligado ? G.gold1 : G.surface3,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <IconeEnviar cor={texto.trim() && ligado ? G.botaoTexto : G.textDim} />
                </button>
              </div>
            )}
            <p style={{ fontSize: 10, color: G.textDim, textAlign: "center", marginTop: 7 }}>
              As mensagens desaparecem ao fechar o CRM.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ── Peças pequenas ────────────────────────────────────────
const Aba = ({ activa, onClick, label, porLer = 0, ponto = false }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
    padding: "5px 11px", borderRadius: 14, cursor: "pointer", fontSize: 12,
    fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
    background: activa ? `${G.gold1}20` : "transparent",
    border: `1px solid ${activa ? `${G.gold1}55` : G.border}`,
    color: activa ? G.gold1 : G.textMuted,
  }}>
    {ponto && <span style={{ width: 6, height: 6, borderRadius: 3, background: G.green }}/>}
    {label}
    {porLer > 0 && <span style={{
      minWidth: 15, height: 15, borderRadius: 8, background: G.gold1, color: G.botaoTexto,
      fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
    }}>{porLer}</span>}
  </button>
);

const IconeChat = ({ cor }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
  </svg>
);

const IconeEnviar = ({ cor }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
