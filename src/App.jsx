import { useState, useEffect, useRef } from "react";
import React from "react";
import { dbReady, dbImoveis, dbClientes, dbTarefas, dbAngariacoes, dbUtilizadores, uploadFoto, deleteFoto, deleteFotos, dbLeadsGestao, dbLeadsAquisicao, dbLeadsHabitar, dbProprietarios, dbDocsProprietario, uploadDocumento, deleteDocumento, dbVisitas } from "./db.js";

// --- Estilos e Constantes ---
const G = { gold1: "#d4af37", surface1: "#121212", surface2: "#181818", surface3: "#202020", border: "#333", text: "#eee", textMuted: "#888", textDim: "#555", red: "#cf6679", green: "#03dac6" };
const Ic = ({ n, s = 20, c = "#fff" }) => <i className={`icon-${n}`} style={{ fontSize: s, color: c }} />;
const Field = ({ label, children }) => <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><label style={{ fontSize: 11, color: G.textMuted, textTransform: "uppercase" }}>{label}</label>{children}</div>;
const Modal = ({ title, onClose, children }) => <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}><div style={{ background: G.surface2, padding: 24, borderRadius: 12, width: "90%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${G.border}` }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><h3>{title}</h3><button onClick={onClose} style={{ background: "none", border: "none", color: G.text, cursor: "pointer" }}>✕</button></div>{children}</div></div>;

export default function App() {
  const [view, setView] = useState("dashboard");
  const [imoveis, setImoveis] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [angariacoes, setAngariacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [i, c, a] = await Promise.all([dbImoveis.list(), dbClientes.list(), dbAngariacoes.list()]);
      setImoveis(i); setClientes(c); setAngariacoes(a); setLoading(false);
    }
    load();
  }, []);
// --- Lógica Angariações ---
  const [angModal, setAngModal] = useState(false);
  const [formAng, setFormAng] = useState({});
  const [editId, setEditId] = useState(null);

  const saveAng = async () => {
    try {
      if (editId) await dbAngariacoes.update(editId, formAng);
      else await dbAngariacoes.insert(formAng);
      setAngariacoes(await dbAngariacoes.list());
      setAngModal(false); setEditId(null); setFormAng({});
    } catch (e) { alert("Erro ao guardar: " + e.message); }
  };

  // --- Modal de Angariações (com novos campos) ---
  const AngModal = () => (
    <Modal title={editId ? "Editar Angariação" : "Nova Angariação"} onClose={() => setAngModal(false)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1/-1" }}><Field label="Nome do Proprietário"><input value={formAng.propNome||""} onChange={e=>setFormAng(p=>({...p,propNome:e.target.value}))}/></Field></div>
        <Field label="Tipo de Mandato">
          <select value={formAng.tipoMandato||"Exclusivo"} onChange={e=>setFormAng(p=>({...p,tipoMandato:e.target.value}))}>
            <option>Exclusivo</option><option>Não Exclusivo</option>
          </select>
        </Field>
        <Field label="Comissão (%)"><input type="number" value={formAng.comissao||""} onChange={e=>setFormAng(p=>({...p,comissao:e.target.value}))} placeholder="5"/></Field>
        <Field label="Valor Fixo (€)"><input type="number" value={formAng.comissaoFixa||""} onChange={e=>setFormAng(p=>({...p,comissaoFixa:e.target.value}))} placeholder="0"/></Field>
        <div style={{ gridColumn: "1/-1" }}>
           <Field label="Descrição"><textarea value={formAng.descricao||""} onChange={e=>setFormAng(p=>({...p,descricao:e.target.value}))} rows={3} style={{width:"100%", background:G.surface3, border:`1px solid ${G.border}`, color:G.text, padding:8}}/></Field>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <button className="btn-ghost" onClick={() => setAngModal(false)}>Cancelar</button>
        <button className="btn-gold" onClick={saveAng} style={{background:G.gold1, border:0, padding:"8px 16px", borderRadius:4, cursor:"pointer"}}>Guardar</button>
      </div>
    </Modal>
  );
// --- Lógica Sugestão Preço IA (no MarketModal) ---
  const [mktIm, setMktIm] = useState(null);
  const MarketModal = ({ imovel, onClose }) => {
    // Exemplo simples de verificação IA: compara valor do imóvel com uma média fictícia
    const precoMedio = 250000; // Aqui entraria a resposta real da sua IA
    const desvio = (Number(imovel.valor) / precoMedio - 1) * 100;
    
    return (
      <Modal title="Análise de Mercado IA" onClose={onClose}>
        <p style={{ color: G.textMuted }}>Sugestão baseada em imóveis similares na zona:</p>
        <div style={{ padding: 15, background: G.surface3, borderRadius: 8, margin: "15px 0" }}>
          <p style={{ fontSize: 18 }}>Preço Sugerido: <b>{precoMedio.toLocaleString()}€</b></p>
          <hr style={{ border: 0, borderTop: `1px solid ${G.border}`, margin: "10px 0" }} />
          {desvio > 10 ? (
            <p style={{ color: G.red }}>⚠ Preço atual acima da média ({desvio.toFixed(1)}%). Recomenda-se ajuste.</p>
          ) : desvio < -10 ? (
            <p style={{ color: G.gold1 }}>✦ Preço abaixo do mercado. Potencial de valorização.</p>
          ) : (
            <p style={{ color: G.green }}>✓ Preço competitivo e enquadrado.</p>
          )}
        </div>
        <button className="btn-gold" onClick={onClose}>Fechar</button>
      </Modal>
    );
  };

  return (
    <div style={{ background: G.surface1, minHeight: "100vh", color: G.text, padding: 20 }}>
      {/* Botões de navegação simples */}
      <nav style={{ marginBottom: 20 }}>
        <button onClick={() => setView("dashboard")}>Dashboard</button>
        <button onClick={() => setAngModal(true)}>+ Nova Angariação</button>
      </nav>

      {/* Renderização das Modais */}
      {angModal && <AngModal />}
      {mktIm && <MarketModal imovel={mktIm} onClose={() => setMktIm(null)} />}
      
      {/* Exemplo de gatilho para IA */}
      {imoveis.map(im => (
        <div key={im.id} style={{ border: `1px solid ${G.border}`, padding: 10, marginBottom: 10 }}>
          {im.titulo} - {im.valor}€ 
          <button onClick={() => setMktIm(im)}>Análise IA</button>
        </div>
      ))}
    </div>
  );
}