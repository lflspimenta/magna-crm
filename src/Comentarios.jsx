import React, { useState, useEffect, useCallback } from "react";
import { dbComentarios, dbReady } from "./db.js";
import { G, ehSocio, ehAdmin } from "./tema.js";

/* ═══════════════════════════════════════════════════════════
   COMENTÁRIOS NO REGISTO — sócias e administrador

   Notas internas presas a um imóvel, cliente ou negócio.
   Ficam guardadas (ao contrário do chat) porque pertencem ao
   processo, não à conversa.

   Quem é agente não vê o bloco sequer. A restrição a sério está
   nas políticas RLS da tabela — ver magna-comentarios.sql.

     <Comentarios tipo="imovel"  registoId={imovel.id}  user={user}/>
     <Comentarios tipo="cliente" registoId={cliente.id} user={user}/>
     <Comentarios tipo="negocio" registoId={negocio.id} user={user}/>
   ═══════════════════════════════════════════════════════════ */

const quando = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia) return `hoje, ${hora}`;
  return `${d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}, ${hora}`;
};

export default function Comentarios({ tipo, registoId, user, mob = false }) {
  const [lista, setLista]   = useState([]);
  const [texto, setTexto]   = useState("");
  const [carregar, setCarregar] = useState(true);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro]     = useState("");

  const visivel = ehSocio(user) && dbReady && !!registoId;

  const carregarLista = useCallback(async () => {
    if (!visivel) { setCarregar(false); return; }
    setCarregar(true); setErro("");
    try { setLista(await dbComentarios.porRegisto(tipo, registoId)); }
    catch (e) { setErro(e.message || "Não foi possível carregar os comentários."); }
    finally { setCarregar(false); }
  }, [visivel, tipo, registoId]);

  useEffect(() => { carregarLista(); }, [carregarLista]);

  const guardar = async () => {
    const t = texto.trim();
    if (!t || aGuardar) return;
    setAGuardar(true); setErro("");
    try {
      const novo = await dbComentarios.criar({
        tipo,
        registoId,
        // autor_id tem de ser o id de autenticação: é o que a
        // política RLS compara com auth.uid().
        autorId: user.authId || user.auth_id || null,
        autorNome: user.nome,
        autorAvatar: user.avatar || (user.nome || "?").charAt(0).toUpperCase(),
        texto: t.slice(0, 2000),
      });
      if (novo) setLista(l => [...l, novo]);
      setTexto("");
    } catch (e) {
      setErro(e.message || "Não foi possível guardar.");
    } finally { setAGuardar(false); }
  };

  const remover = async (c) => {
    if (!confirm("Eliminar este comentário?")) return;
    try { await dbComentarios.remover(c.id); setLista(l => l.filter(x => x.id !== c.id)); }
    catch (e) { setErro(e.message || "Não foi possível eliminar."); }
  };

  if (!visivel) return null;

  const podeApagar = (c) =>
    ehAdmin(user) || String(c.autor_id || "") === String(user.authId || user.auth_id || "\u0000");

  return (
    <div style={{ marginTop: 20, borderTop: `1px solid ${G.border}`, paddingTop: 16 }}>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: G.textDim, textTransform: "uppercase", letterSpacing: ".3px" }}>
          Comentários internos
        </p>
        <span style={{
          fontSize: 9.5, background: `${G.gold1}18`, color: G.gold1, padding: "1px 7px",
          borderRadius: 10, fontWeight: 600, letterSpacing: ".04em",
        }}>SÓ DIRECÇÃO</span>
        {lista.length > 0 && (
          <span style={{ fontSize: 11, color: G.textDim, marginLeft: "auto" }}>{lista.length}</span>
        )}
      </div>

      {erro && (
        <p style={{ fontSize: 12, color: G.red, marginBottom: 10, lineHeight: 1.5 }}>{erro}</p>
      )}

      {carregar ? (
        <p style={{ fontSize: 12, color: G.textDim }}>A carregar…</p>
      ) : lista.length === 0 ? (
        <p style={{ fontSize: 12, color: G.textDim, lineHeight: 1.6, marginBottom: 12 }}>
          Ainda sem comentários. O que escreveres aqui fica no registo e não é visível para os consultores.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
          {lista.map(c => (
            <div key={c.id} style={{
              display: "flex", gap: 10, padding: "10px 12px",
              background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 9,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg,${G.goldDark},${G.gold1})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 13,
                color: G.botaoTexto,
              }}>{c.autor_avatar || "?"}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: G.text }}>{c.autor_nome}</span>
                  <span style={{ fontSize: 10.5, color: G.textDim }}>{quando(c.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: G.textMuted, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {c.texto}
                </p>
              </div>

              {podeApagar(c) && (
                <button onClick={() => remover(c)} title="Eliminar"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: G.textDim, fontSize: 15, lineHeight: 1, alignSelf: "flex-start" }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: mob ? "column" : "row" }}>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); guardar(); } }}
          placeholder="Comentário interno sobre este registo…"
          rows={2}
          style={{
            flex: 1, width: mob ? "100%" : "auto", resize: "vertical", minHeight: 58,
            padding: "9px 11px", borderRadius: 9, border: `1px solid ${G.border}`,
            background: G.surface, color: G.text, fontSize: 13,
            fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5, outline: "none",
          }}
        />
        <button onClick={guardar} disabled={!texto.trim() || aGuardar}
          style={{
            flexShrink: 0, width: mob ? "100%" : "auto",
            padding: "10px 18px", borderRadius: 9, border: "none",
            cursor: texto.trim() && !aGuardar ? "pointer" : "default",
            background: texto.trim() && !aGuardar ? G.gold1 : G.surface3,
            color: texto.trim() && !aGuardar ? G.botaoTexto : G.textDim,
            fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif",
          }}>
          {aGuardar ? "A guardar…" : "Comentar"}
        </button>
      </div>
    </div>
  );
}
