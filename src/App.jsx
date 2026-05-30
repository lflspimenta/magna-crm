import { useState, useEffect, useRef } from "react";
import React from "react";
import { dbReady, dbImoveis, dbClientes, dbTarefas, dbAngariacoes, dbUtilizadores, uploadFoto, deleteFoto, deleteFotos, dbLeadsGestao, dbLeadsAquisicao, dbLeadsHabitar } from "./db.js";
// ── Funil de Negócios ─────────────────────────────────────────
function Funil({ mob }) {
  const [tab, setTab] = useState("gestao");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const ESTADOS = ["novo","contactado","proposta","fechado","perdido"];
  const ESTADO_LABEL = { novo:"Novo", contactado:"Contactado", proposta:"Proposta enviada", fechado:"Fechado", perdido:"Perdido" };
  const ESTADO_COLOR = { novo:G.blue, contactado:G.gold1, proposta:G.purple, fechado:G.green, perdido:G.red };

  const TABS = [
    { id:"gestao",    label:"01 — Rentabilizar", db: dbLeadsGestao },
    { id:"aquisicao", label:"02 — Adquirir",     db: dbLeadsAquisicao },
    { id:"habitar",   label:"03 — Habitar",       db: dbLeadsHabitar },
  ];

  const currentDB = TABS.find(t => t.id === tab)?.db;

  useEffect(() => {
    loadLeads();
  }, [tab]);

  const loadLeads = async () => {
    setLoading(true);
    setSelected(null);
    try {
      const data = await currentDB.list();
      setLeads(data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateEstado = async (lead, estado) => {
    try {
      await currentDB.update(lead.id, { ...lead, estado });
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, estado } : l));
      if (selected?.id === lead.id) setSelected(s => ({ ...s, estado }));
    } catch(e) { alert("Erro ao actualizar: " + e.message); }
  };

  const saveNotas = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await currentDB.update(selected.id, { ...selected, notas });
      setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, notas } : l));
      setSelected(s => ({ ...s, notas }));
    } catch(e) { alert("Erro ao guardar: " + e.message); }
    finally { setSaving(false); }
  };

  const deleteLead = async (lead) => {
    if (!confirm(`Eliminar lead de ${lead.nome}?`)) return;
    try {
      await currentDB.remove(lead.id);
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      if (selected?.id === lead.id) setSelected(null);
    } catch(e) { alert("Erro ao eliminar: " + e.message); }
  };

  const converterEmCliente = async (lead) => {
    if (!confirm(`Converter ${lead.nome} em cliente?`)) return;
    try {
      await dbClientes.insert({
        nome: lead.nome,
        email: lead.email,
        telefone: lead.telefone,
        interesse: lead.finalidade || lead.modalidade || 'Comprar',
       orcamento: 0,
        temperatura: 'Quente',
        bairros: lead.zona_interesse || lead.localizacao || '',
        obs: lead.descricao || lead.notas || '',
      });
      await updateEstado(lead, 'fechado');
      setSelected(null);
      alert(`✓ ${lead.nome} adicionado aos Clientes.`);
    } catch(e) {
      alert('Erro ao converter: ' + e.message);
    }
  };
  const leadsByEstado = (estado) => leads.filter(l => l.estado === estado);

  const openLead = (lead) => {
    setSelected(lead);
    setNotas(lead.notas || "");
  };

  return (
 <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: mob ? 20 : 32 }}>
        <p style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: G.gold1, marginBottom: 8 }}>Funil de Negócios</p>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: mob ? 28 : 36, fontWeight: 300, color: G.text }}>
          Pipeline de Leads
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${G.border}`, marginBottom: mob ? 20 : 32, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "12px 0", marginRight: mob ? 20 : 32,
            fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
            background: "none", border: "none",
            borderBottom: `1px solid ${tab === t.id ? G.gold1 : "transparent"}`,
            color: tab === t.id ? G.gold1 : G.textMuted,
            cursor: "pointer", position: "relative", bottom: -1,
            transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0
          }}>{t.label}</button>
        ))}
      </div>

      {/* Contadores */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(3,1fr)" : "repeat(5,1fr)", gap: mob ? 6 : 8, marginBottom: mob ? 20 : 32 }}>
        {ESTADOS.map(e => (
          <div key={e} style={{ background: G.surface, border: `1px solid ${G.border}`, borderTop: `2px solid ${ESTADO_COLOR[e]}`, padding: mob ? "10px 8px" : "16px 14px" }}>
            <p style={{ fontSize: mob ? 22 : 28, fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, color: G.text, marginBottom: 2 }}>
              {leadsByEstado(e).length}
            </p>
            <p style={{ fontSize: mob ? 8 : 10, letterSpacing: "0.1em", textTransform: "uppercase", color: G.textDim }}>
              {ESTADO_LABEL[e]}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2, borderColor: `${G.gold1}30`, borderTopColor: G.gold1 }}/>
        </div>
      ) : leads.length === 0 ? (
        <div style={{ textAlign: "center", padding: mob ? 40 : 80, color: G.textDim }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, marginBottom: 8 }}>Sem leads ainda</p>
          <p style={{ fontSize: 13 }}>Os pedidos do site aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selected && !mob ? "1fr 360px" : "1fr", gap: 24 }}>
          {/* Lista */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {leads.map(lead => (
              <div key={lead.id} onClick={() => openLead(lead)} style={{
                background: selected?.id === lead.id ? G.surface2 : G.surface,
                border: `1px solid ${selected?.id === lead.id ? G.gold1 + "40" : G.border}`,
                padding: mob ? "12px 14px" : "16px 20px",
                cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: mob ? 10 : 16
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: ESTADO_COLOR[lead.estado || "novo"], flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: mob ? 13 : 14, fontWeight: 500, color: G.text, marginBottom: 2 }}>{lead.nome}</p>
                  <p style={{ fontSize: mob ? 11 : 12, color: G.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lead.email} {lead.telefone ? `· ${lead.telefone}` : ""}
                  </p>
                  {lead.atribuido_a && <p style={{ fontSize: 10, color: G.gold1, marginTop: 2 }}>→ {lead.atribuido_a}</p>}
                </div>
                {!mob && <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <select
                    value={lead.estado || "novo"}
                    onClick={e => e.stopPropagation()}
                    onChange={e => { e.stopPropagation(); updateEstado(lead, e.target.value); }}
                    style={{
                      background: G.surface3, border: `1px solid ${G.border}`,
                      color: ESTADO_COLOR[lead.estado || "novo"],
                      fontSize: 11, letterSpacing: "0.1em", padding: "4px 8px",
                      cursor: "pointer", outline: "none"
                    }}
                  >
                    {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                  </select>
                  <p style={{ fontSize: 11, color: G.textDim, whiteSpace: "nowrap" }}>
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-PT") : "—"}
                  </p>
                </div>}
                {mob && <select
  value={lead.estado || "novo"}
  onClick={e => e.stopPropagation()}
  onChange={e => { e.stopPropagation(); updateEstado(lead, e.target.value); }}
  style={{
    background: G.surface3, border: `1px solid ${G.border}`,
    color: ESTADO_COLOR[lead.estado || "novo"],
    fontSize: 10, padding: "3px 6px",
    cursor: "pointer", outline: "none", flexShrink: 0,
    maxWidth: 100
  }}
>
                >
                  {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                </select>}
              </div>
            ))}
          </div>

          {/* Detalhe — em mobile abre como modal */}
          {selected && (
            mob ? (
              <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
                <div className="modal" style={{ maxHeight: "85vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
                    <div>
                      <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: G.gold1, marginBottom: 6 }}>Lead</p>
                      <p style={{ fontSize: 20, fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, color: G.text }}>{selected.nome}</p>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: G.textDim, cursor: "pointer", fontSize: 18 }}>✕</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                    {[
                      ["Email", selected.email],
                      ["Telefone", selected.telefone],
                      ["Localização", selected.localizacao || selected.zona_interesse],
                      ["Tipologia", selected.tipologia],
                      ["Orçamento", selected.orcamento],
                      ["Modalidade", selected.modalidade],
                      ["Finalidade", selected.finalidade],
                      ["Situação actual", selected.situacao_atual],
                      ["Serviço", selected.servico_interesse],
                      ["Descrição", selected.descricao],
                    ].filter(([_, v]) => v).map(([label, value]) => (
                      <div key={label} style={{ borderBottom: `1px solid ${G.border}`, paddingBottom: 10 }}>
                        <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: G.textDim, marginBottom: 3 }}>{label}</p>
                        <p style={{ fontSize: 13, color: G.text }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Atribuído a */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: G.gold1, marginBottom: 8 }}>Atribuído a</p>
                    <select
                      value={selected.atribuido_a || ""}
                      onChange={async e => {
                        const val = e.target.value;
                        try {
                          await currentDB.update(selected.id, { ...selected, atribuido_a: val });
                          setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, atribuido_a: val } : l));
                          setSelected(s => ({ ...s, atribuido_a: val }));
                        } catch(err) { alert("Erro ao atribuir: " + err.message); }
                      }}
                      style={{ width: "100%", background: G.surface2, border: `1px solid ${G.border}`, color: G.text, fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: "10px 12px", outline: "none" }}
                    >
                      <option value="">— Não atribuído —</option>
                      <option value="Cátia Barbosa">Cátia Barbosa</option>
                      <option value="Ana Costa">Ana Costa</option>
                    </select>
                  </div>
                  {/* Notas */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: G.gold1, marginBottom: 8 }}>Notas internas</p>
                    <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Adiciona notas sobre este lead..."
                      style={{ width: "100%", height: 80, background: G.surface2, border: `1px solid ${G.border}`, color: G.text, fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: 12, resize: "none", outline: "none", lineHeight: 1.6 }}
                    />
                    <button onClick={saveNotas} disabled={saving} style={{ width: "100%", padding: "10px", background: G.gold1, color: G.bg, border: "none", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, marginTop: 8 }}>
                      {saving ? "A guardar..." : "Guardar notas"}
                    </button>
                  </div>
                  <button onClick={() => converterEmCliente(selected)} style={{ width: "100%", padding: "10px", background: "none", border: `1px solid ${G.green}40`, color: G.green, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", marginBottom: 8 }}>
                    Converter em Cliente
                  </button>
                  <button onClick={() => deleteLead(selected)} style={{ width: "100%", padding: "8px", background: "none", border: `1px solid ${G.red}20`, color: G.red, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}>
                    Eliminar lead
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: G.surface, border: `1px solid ${G.border}`, padding: 24, alignSelf: "start", position: "sticky", top: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 24 }}>
                  <div>
                    <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: G.gold1, marginBottom: 6 }}>Lead</p>
                    <p style={{ fontSize: 20, fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, color: G.text }}>{selected.nome}</p>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: G.textDim, cursor: "pointer", fontSize: 18 }}>✕</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                  {[
                    ["Email", selected.email],
                    ["Telefone", selected.telefone],
                    ["Localização", selected.localizacao || selected.zona_interesse],
                    ["Tipologia", selected.tipologia],
                    ["Orçamento", selected.orcamento],
                    ["Modalidade", selected.modalidade],
                    ["Finalidade", selected.finalidade],
                    ["Situação actual", selected.situacao_atual],
                    ["Serviço", selected.servico_interesse],
                    ["Descrição", selected.descricao],
                  ].filter(([_, v]) => v).map(([label, value]) => (
                    <div key={label} style={{ borderBottom: `1px solid ${G.border}`, paddingBottom: 10 }}>
                      <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: G.textDim, marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: 13, color: G.text }}>{value}</p>
                    </div>
                  ))}
                </div>
                {/* Atribuído a */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: G.gold1, marginBottom: 8 }}>Atribuído a</p>
                  <select
                    value={selected.atribuido_a || ""}
                    onChange={async e => {
                      const val = e.target.value;
                      try {
                        await currentDB.update(selected.id, { ...selected, atribuido_a: val });
                        setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, atribuido_a: val } : l));
                        setSelected(s => ({ ...s, atribuido_a: val }));
                      } catch(err) { alert("Erro ao atribuir: " + err.message); }
                    }}
                    style={{ width: "100%", background: G.surface2, border: `1px solid ${G.border}`, color: G.text, fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: "10px 12px", outline: "none" }}
                  >
                    <option value="">— Não atribuído —</option>
                    <option value="Cátia Barbosa">Cátia Barbosa</option>
                    <option value="Ana Costa">Ana Costa</option>
                  </select>
                </div>
                {/* Notas internas */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: G.gold1, marginBottom: 8 }}>Notas internas</p>
                  <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Adiciona notas sobre este lead..."
                    style={{ width: "100%", height: 100, background: G.surface2, border: `1px solid ${G.border}`, color: G.text, fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: 12, resize: "none", outline: "none", lineHeight: 1.6 }}
                  />
                  <button onClick={saveNotas} disabled={saving} style={{ width: "100%", padding: "10px", background: G.gold1, color: G.bg, border: "none", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, marginTop: 8 }}>
                    {saving ? "A guardar..." : "Guardar notas"}
                  </button>
                </div>
                <button onClick={() => converterEmCliente(selected)} style={{ width: "100%", padding: "10px", background: "none", border: `1px solid ${G.green}40`, color: G.green, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", marginBottom: 8 }}>
                  Converter em Cliente
                </button>
                <button onClick={() => deleteLead(selected)} style={{ width: "100%", padding: "8px", background: "none", border: `1px solid ${G.red}20`, color: G.red, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}>
                  Eliminar lead
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
// ── Responsive hook ───────────────────────────────────────────
const useIsMobile = () => {
  const [mob, setMob] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mob;
};

const G = {
  gold1:"#C9A84C", gold2:"#E8C96A", gold3:"#F5E199", goldDark:"#8B6914",
  bg:"#0E0E0F", surface:"#161618", surface2:"#1E1E21", surface3:"#26262B",
  border:"#2E2E33", text:"#F0EDE6", textMuted:"#8A8880", textDim:"#5A5855",
  red:"#E05252", green:"#52C07A", blue:"#5290E0", purple:"#9B72E0",
};

// ── User store (dynamic) ──────────────────────────────────────
const defaultUsers = [
  { id:1, email:"admin@magna.pt",   password:"magna2024", nome:"Administrador",  cargo:"Diretor",           avatar:"A", role:"admin" },
  { id:2, email:"agente@magna.pt",  password:"agente123", nome:"Sofia Ferreira", cargo:"Consultora",        avatar:"S", role:"agente" },
  { id:3, email:"diretor@magna.pt", password:"dir2024",   nome:"Ricardo Mendes", cargo:"Diretor Comercial", avatar:"R", role:"admin" },
];
let _users = [...defaultUsers];
const getUsers  = ()    => _users;
const saveUsers = (u)   => { _users = u; };

// ── Portugal: Distrito → Concelho → Freguesias ────────────────
const PT_LOC = {
  "Aveiro": {
    "Águeda": [
      "Aguada de Cima",
      "Fermentelos",
      "Macinhata do Vouga",
      "Valongo do Vouga",
      "União das freguesias de Águeda e Borralha",
      "União das freguesias de Barrô e Aguada de Baixo",
      "União das freguesias de Belazaima do Chão, Castanheira do Vouga e Agadão",
      "União das freguesias de Recardães e Espinhel",
      "União das freguesias de Trofa, Segadães e Lamas do Vouga",
      "Travassô e Óis da Ribeira"
    ],
    "Albergaria-a-Velha": [
      "Albergaria-a-Velha e Valmaior",
      "Alquerubim",
      "Angeja",
      "Branca",
      "Ribeira de Fráguas",
      "São João de Loure e Frossos"
    ],
    "Anadia": [
      "Amoreira da Gândara, Ancas e Vila Nova de Monsarros",
      "Arcos e Mogofores",
      "Sangalhos",
      "São Lourenço do Bairro",
      "Vilarinho do Bairro",
      "Tamengos, Aguim e Óis do Bairro",
      "Moita",
      "Vila Verde e Macromula"
    ],
    "Arouca": [
      "Alvarenga",
      "Chave",
      "Escariz",
      "Fermedo",
      "Mansores",
      "Moldes",
      "Rossas",
      "Santa Eulália",
      "São Miguel do Mato",
      "Urrô",
      "Várzea",
      "União das freguesias de Arouca e Burgo",
      "União das freguesias de Covelo de Paivó e Janarde",
      "União das freguesias de Canelas e Espiunca"
    ],
    "Aveiro": [
      "Aradas",
      "Cacia",
      "Esgueira",
      "Oliveirinha",
      "São Bernardo",
      "Santa Joana",
      "Eixo e Eirol",
      "Glória e Vera Cruz",
      "Jacinto e Requeixo",
      "Verdemilho"
    ],
    "Castelo de Paiva": [
      "Fornos",
      "Pombeiro da Beira",
      "Real",
      "Santa Maria de Sardoura",
      "São Martinho de Sardoura",
      "Bairros",
      "Pedorido",
      "Raiva"
    ],
    "Espinho": [
      "Espinho",
      "Anta e Guetim",
      "Paramos",
      "Silvalde"
    ],
    "Estarreja": [
      "Avanca",
      "Beduído e Veiros",
      "Canelas e Fermelã",
      "Pardilhó",
      "Salreu"
    ],
    "Ílhavo": [
      "Gafanha da Encarnação",
      "Gafanha da Nazaré",
      "Gafanha do Carmo",
      "Ílhavo (São Salvador)"
    ],
    "Mealhada": [
      "Barcouço",
      "Casal Comba",
      "Luso",
      "Mealhada, Ventosa do Bairro e Antes",
      "Pampilhosa",
      "Vacariça"
    ],
    "Murtosa": [
      "Bunheiro",
      "Monte",
      "Murtosa",
      "Torreira"
    ],
    "Oliveira de Azeméis": [
      "Carregosa",
      "Cesar",
      "Fajões",
      "Loureiro",
      "Macieira de Sarnes",
      "Ossela",
      "Pinheiro da Bemposta, Travanca e Palmaz",
      "Cucujães",
      "Oliveira de Azeméis, Santiago de Riba-Ul, Ul, Macinhata da Seixa e Madalena",
      "Nogueira do Cravo e Pindelo"
    ],
    "Oliveira do Bairro": [
      "Bustos, Troviscal e Mamarrosa",
      "Kioto",
      "Oliveira do Bairro",
      "Oiã",
      "Palhaça"
    ],
    "Ovar": [
      "Cortegaça",
      "Esmoriz",
      "Maceda",
      "Válega",
      "União das freguesias de Ovar, São João, Arada e São Vicente de Pereira Jusã"
    ],
    "Santa Maria da Feira": [
      "Argoncilhe",
      "Arrifana",
      "Fiães",
      "Fornos",
      "Lourosa",
      "Milheirós de Poiares",
      "Mozelos",
      "Nogueira da Regedoura",
      "Paços de Brandão",
      "Rio Meão",
      "Santa Maria de Lamas",
      "São João de Ver",
      "União das freguesias de Caldas de São Jorge e Pigeiros",
      "União das freguesias de Canedo, Vale e Vila Maior",
      "União das freguesias de Lobão, Gião, Louredo e Guisande",
      "União das freguesias de Santa Maria da Feira, Travanca, Sanfins e Espargo",
      "União das freguesias de São Miguel do Souto e Mosteiró"
    ],
    "São João da Madeira": [
      "São João da Madeira"
    ],
    "Sever do Vouga": [
      "Cedrim e Paraíso",
      "Couto de Esteves",
      "Pessegueiro do Vouga",
      "Rocas do Vouga",
      "Sever do Vouga",
      "Silva Escura e Dornelas",
      "Talhadas"
    ],
    "Vagos": [
      "Calvão",
      "Gafanha da Boa Hora",
      "Fonte de Angeão e Covão do Lobo",
      "Ponte de Vagos e Santa Catarina",
      "Vagos e Santo António",
      "Vestiaria",
      "Ouca",
      "Soza"
    ],
    "Vale de Cambra": [
      "Arões",
      "Cepelos",
      "Junqueira",
      "Roge",
      "São Pedro de Castelões",
      "Vila Chã, Codal e Vila Cova de Perrinho"
    ]
  },
  "Beja": {
    "Aljustrel": [
      "Aljustrel e Rio de Moinhos",
      "Ervidel",
      "Messejana",
      "São João de Negrilhos"
    ],
    "Almodôvar": [
      "Almodôvar e Graça dos Padrões",
      "Santa Clara-a-Nova e Gomes Aires",
      "Rosário",
      "Santa Cruz",
      "São Barnabé"
    ],
    "Alvito": [
      "Alvito",
      "Vila Nova da Baronia"
    ],
    "Barrancos": [
      "Barrancos"
    ],
    "Beja": [
      "Baleizão",
      "Beringel",
      "Cabeça Gorda",
      "Nossa Senhora das Neves",
      "Santa Clara de Louredo",
      "Trindade",
      "Salvada e Quintos",
      "Trindade e Cabeça Gorda",
      "União das freguesias de Beja (Santiago Maior e São João Baptista)",
      "União das freguesias de Beja (Salvador e Santa Maria da Feira)",
      "Albernoa e Trindade",
      "Mombeja"
    ],
    "Castro Verde": [
      "Castro Verde e Casével",
      "Entradas",
      "Santa Bárbara de Padrões",
      "São Marcos da Ataboeira"
    ],
    "Cuba": [
      "Cuba",
      "Faro do Alentejo",
      "Vila Alva",
      "Vila Ruiva"
    ],
    "Ferreira do Alentejo": [
      "Alfundão e Peroguarda",
      "Ferreira do Alentejo e Canhestros",
      "Figueira dos Cavaleiros",
      "Odivelas"
    ],
    "Mértola": [
      "Alcaria Ruiva",
      "Corte do Pinto",
      "Espírito Santo",
      "Mértola",
      "Santana de Cambas",
      "São João dos Caldeireiros",
      "São Miguel do Pinheiro, São Pedro de Solis e São Sebastião dos Carros"
    ],
    "Moura": [
      "Amareleja",
      "Póvoa de São Miguel",
      "Sobral da Adiça",
      "União das freguesias de Moura (Santo Agostinho e São João Baptista) e Santo Amador",
      "Safara e Santo Aleixo da Restauração"
    ],
    "Odemira": [
      "Boavista dos Pinheiros",
      "Colos",
      "Longueira/Almograve",
      "Luzianes-Gave",
      "Relíquias",
      "Saboia",
      "São Luís",
      "São Martinho das Amoreiras",
      "Vila Nova de Milfontes",
      "Vila de Frades",
      "São Teotónio",
      "Vale de Santiago"
    ],
    "Ourique": [
      "Garvão e Santa Luzia",
      "Ourique",
      "Panóias e Conceição",
      "Santana da Serra"
    ],
    "Serpa": [
      "Brinches",
      "Pias",
      "Vila Verde de Ficalho",
      "União das freguesias de Serpa (Salvador e Santa Maria)",
      "Vila Nova de São Bento e Vale de Vargo"
    ],
    "Vidigueira": [
      "Pedrógão",
      "Selmes",
      "Vidigueira",
      "Vila de Frades"
    ]
  },
  "Braga": {
    "Amares": [
      "Amares e Figueiredo",
      "Barreiros e Passage",
      "Bico",
      "Caldelas, Sequeiros e Paranhos",
      "Carrazedo",
      "Dornelas",
      "Ferreiros, Prozelo e Besteiros",
      "Goães",
      "Bouro (Santa Marta)",
      "Bouro (Santa Maria)",
      "Torre e Portela",
      "Vilela, Seramil e Paredes Secas"
    ],
    "Barcelos": [
      "Barcelos, Vila Boa e Vila Frescainha",
      "Aborim",
      "Adães",
      "Airó",
      "Aldreu",
      "Alvelos",
      "Arcozelo",
      "Areias",
      "Balugães",
      "Barqueiros",
      "Camba",
      "Carapeços",
      "Carvalhal",
      "Carvalhas",
      "Faria",
      "Fornelos",
      "Fragoso",
      "Galegos (Santa Maria)",
      "Galegos (São Martinho)",
      "Lama",
      "Lijó",
      "Macieira de Rates",
      "Manhente",
      "Martim",
      "Oliveira",
      "Palme",
      "Panque",
      "Paradela",
      "Pereira",
      "Perelhal",
      "Pousa",
      "Quintiães e Aguiar",
      "Remelhe",
      "Roriz",
      "Sequeade e Bastuço",
      "Silva",
      "Tamel",
      "Ucha",
      "Viatodos, Grimancelos, Minhotães e Monte de Fralães",
      "Vila Seca"
    ],
    "Braga": [
      "Braga (Maximinos, Sé e Cividade)",
      "Braga (São José de Lázaro e São João do Souto)",
      "Braga (São Vicente)",
      "Braga (Vitorino dos Piães)",
      "Cabreiros e Passos (São Julião)",
      "Celeirós, Aveleda e Vimieiro",
      "Crespos e Pousada",
      "Este (São Pedro e São Mamede)",
      "Ferreiros e Gondizalves",
      "Gualtar",
      "Lamaçães, Fraião e Victor",
      "Merelim (São Pedro) e Frossos",
      "Nogueira, Fraião e Lamaçães",
      "Nogueiró e Tenões",
      "Padim da Graça",
      "Palmeira",
      "Real, Dume e Semelhe",
      "Santa Lucrécia de Algeriz e Navarra",
      "Sequeira",
      "Sobreposta",
      "Tadim",
      "Trandeiras e Morreira"
    ],
    "Cabeceiras de Basto": [
      "Abadim",
      "Basto",
      "Bucieiro",
      "Cabeceiras de Basto",
      "Faia",
      "Gondiães e Vilar de Cunhas",
      "Pedraça",
      "Refojos de Basto, Outeiro e Painzela",
      "Rio Douro"
    ],
    "Celorico de Basto": [
      "Agilde",
      "Arnoia",
      "Basto (São Clemente)",
      "Borba de Montasto",
      "Britelo, Gémeos e Ourilhe",
      "Caçarilhe e Infesta",
      "Canedo de Basto e Corlet",
      "Carvalho e Basto (Santa Tecla)",
      "Molares",
      "Ribas",
      "Vale de Bouro"
    ],
    "Esposende": [
      "Antas e Guandra",
      "Apúlia e Fão",
      "Belinho e Mar",
      "Esposende, Marinhas e Gandra",
      "Forjães",
      "Palmeira de Faro e Curvos"
    ],
    "Fafe": [
      "Arões (São Romão)",
      "Fafe",
      "Fornelos",
      "Golães",
      "Passos",
      "Quinchães",
      "Rego",
      "Revelhe",
      "Ribeiros",
      "Silvares (São Martinho)",
      "Arões (Santa Cristina)",
      "Aboim, Felgueiras e Gontim",
      "Freitas e Vila Cova",
      "Monte e Queimadela",
      "Moreira do Rei e Várzea Cova",
      "Vinhós e Lourido"
    ],
    "Guimarães": [
      "Azurém",
      "Costa",
      "Creixomil",
      "Fermentões",
      "Mascotelos e Santiago",
      "Mesão Frio",
      "Pencelo",
      "Pevidém",
      "Ponte",
      "Silvares",
      "Urgezes",
      "União das freguesias de Guimarães e Salta",
      "União das freguesias de Sande e São Lourenço",
      "União das freguesias de Briteiros, Salvador e Briteiros Santa Leocádia"
    ],
    "Póvoa de Lanhoso": [
      "Calvos e Frades",
      "Campos e Louredo",
      "Covas",
      "Fermentões",
      "Fontarcada e Oliveira",
      "Lanhoso",
      "Póvoa de Lanhoso",
      "Serzedelo",
      "Sobradelo da Goma",
      "Taíde",
      "Verim, Friande e Ajude"
    ],
    "Terras de Bouro": [
      "Balança",
      "Campo do Gerês",
      "Carvalheira",
      "Chamoim e Vilar",
      "Chorense e Monte",
      "Cibões e Brufe",
      "Covide",
      "Gondoriz",
      "Moimenta",
      "Ribeira",
      "Rio Caldo",
      "Souto",
      "Valdosende",
      "Vilar da Veiga"
    ],
    "Vieira do Minho": [
      "Anissó e Soutelo",
      "Anjos e Vilar do Chão",
      "Caniçada e Soengas",
      "Cantelães",
      "Eira Vedra",
      "Guilhofrei",
      "Louredo e Mosteiro",
      "Parada do Bouro",
      "Pinheiro",
      "Rossas",
      "Ruivães e Campos",
      "Salamonde",
      "Tabuaças",
      "Ventosa",
      "Vieira do Minho"
    ],
    "Vila Nova de Famalicão": [
      "Antas e Abade de Vermoim",
      "Arnoso e Jesus",
      "Avidos e Lagoa",
      "Bairro",
      "Brufe",
      "Calendário",
      "Carreira e Bente",
      "Castelões",
      "Esmeriz e Cabeçudos",
      "Fradelos",
      "Gavião",
      "Joane",
      "Landim",
      "Lousado",
      "Mogege",
      "Nine",
      "Oliveira (Santa Maria)",
      "Oliveira (São Mateus)",
      "Pousada de Saramagos",
      "Riba de Ave",
      "Ribeirão",
      "Ruivães e Novais",
      "Seide",
      "Vale (São Cosme), Telhado e Portela",
      "Vermeil",
      "Vila Nova de Famalicão"
    ],
    "Vila Verde": [
      "Aboim da Nóbrega e Mós",
      "Atiães",
      "Cabanelas",
      "Cervães",
      "Coucieiro",
      "Freiriz",
      "Gême",
      "Lage",
      "Lanhas",
      "Loureira",
      "Moure",
      "Oleiros",
      "Pico de Regalados, Gondiães e Mós",
      "Ponte",
      "Prado (São Miguel)",
      "Sande, Vilarinho, Barros e Gomide",
      "Soutelo",
      "Turiz",
      "Vade",
      "Valbom, Passô e Coto",
      "Vila de Prado",
      "Vila Verde e Barbudo"
    ],
    "Vizela": [
      "Caldas de Vizela",
      "Infias",
      "Santa Eulália",
      "Tagilde e Vizela (São Paio)",
      "Vizela (Santo Adrião)"
    ]
  },
  "Bragança": {
    "Alfândega da Fé": [
      "Agrobom, Saldonha e Vale Pereiro",
      "Alfândega da Fé",
      "Cerejais",
      "Eucisia, Gouveia e Valverde",
      "Ferradosa e Sendim da Serra",
      "Gebelim e Soeima",
      "Parada e Sendim da Ribeira",
      "Pombal e Vales",
      "Sambade",
      "Vilarelhos",
      "Vilares de Vilariça"
    ],
    "Bragança": [
      "Alfaião",
      "Babe",
      "Baçal",
      "Carragosa",
      "Castrelos e Carrazedo",
      "Castro de Avelãs",
      "Coelhoso",
      "Donai",
      "França",
      "Gimonde",
      "Gostei",
      "Grijó de Parada",
      "Macedo do Mato",
      "Mos",
      "Parada e Faílde",
      "Parâmio",
      "Quintanilha",
      "Quintela de Lampaças",
      "Rabal",
      "Rebordãos",
      "Samil",
      "Santa Comba de Rossas",
      "São Pedro de Sarracenos",
      "Sende",
      "Serapicos",
      "Sortes",
      "Zoio",
      "União das freguesias de Bragança (Sé, Santa Maria e Meixedo)",
      "União das freguesias de Izeda, Calvelhe e Paradinha Nova",
      "União das freguesias de Castanheira e Seriz do Coito"
    ],
    "Carrazeda de Ansiães": [
      "Amedo e Zedes",
      "Belver e Mogo de Malta",
      "Carrazeda de Ansiães",
      "Lavandeira, Beira Grande e Selores",
      "Linhares",
      "Marzagão",
      "Parambos",
      "Pereiros",
      "Pinhal do Norte",
      "Pombal",
      "Seixo de Ansiães",
      "Vilarinho da Castanheira"
    ],
    "Freixo de Espada à Cinta": [
      "Freixo de Espada à Cinta e Mazouco",
      "Ligares",
      "Poiares",
      "Lagoaça e Fornos"
    ],
    "Macedo de Cavaleiros": [
      "Ala e Vilarinho do Monte",
      "Amendoeira",
      "Arcas",
      "Bornes e Burga",
      "Carrapatas",
      "Chacim",
      "Cortiços",
      "Corujas",
      "Espadanedo, Edroso, Murçós e Soutelo Mourisco",
      "Ferreira",
      "Grijó",
      "Lagoa",
      "Lamalonga",
      "Lombo",
      "Macedo de Cavaleiros",
      "Morais",
      "Olmos",
      "Peredo",
      "Podence e Santa Combinha",
      "Salselas",
      "Sezulfe",
      "Talhas",
      "Vale Benfeito",
      "Vale da Porca",
      "Vale de Prados",
      "Vilarinho de Agrochão"
    ],
    "Miranda do Douro": [
      "Constantim e Cicouro",
      "Duas Igrejas",
      "Genísio",
      "Ifanes e Paradela",
      "Malhadas",
      "Miranda do Douro",
      "Palaçoulo",
      "Picote",
      "Póvoa",
      "São Martinho de Angueira",
      "Sendim e Atenor",
      "Silva e Águas Vivas"
    ],
    "Mirandela": [
      "Abambres",
      "Abreiro",
      "Aguieiras",
      "Alvites",
      "Avantos e Romeu",
      "Bouça",
      "Cabanelas",
      "Carvalhais",
      "Cedães",
      "Cobro",
      "Fradizela",
      "Franco e Vila Boa",
      "Frechas",
      "Mascavados",
      "Mirandela",
      "Múrias",
      "Passos",
      "São Pedro Velho",
      "São Salvador",
      "Suçães",
      "Torre de Dona Chama",
      "Vale de Asnes",
      "Vale de Gouvinhas",
      "Vale de Salgueiro",
      "Vale de Telhas"
    ],
    "Mogadouro": [
      "Azinhoso",
      "Bemposta",
      "Bruçó",
      "Brunhoso",
      "Castelo Branco",
      "Castro Vicente",
      "Meirinhos",
      "Mogadouro, Valverde, Vale de Porco e Vilar de Rei",
      "Paradela",
      "Penas Roias",
      "Peredo dos Castelhanos",
      "Remondes e Soutelo",
      "Saldanha",
      "Sanhoane",
      "São Martinho do Peso",
      "Tó",
      "Travaíanca",
      "Vila de Ala",
      "Vilarinho dos Galegos e Ventuzelo"
    ],
    "Torre de Moncorvo": [
      "Adeganha e Cardanha",
      "Cabeça Boa",
      "Carviçais",
      "Castedo",
      "Felgar e Souto da Velha",
      "Felgueiras",
      "Horta da Vilariça",
      "Larinho",
      "Mós",
      "Torre de Moncorvo",
      "Urros e Peredo dos Castelhanos"
    ],
    "Vila Flor": [
      "Assares e Lodões",
      "Benlhevai",
      "Candoso e Carvalho de Egas",
      "Freixiel",
      "Roios",
      "Samões",
      "Sampaio",
      "Santa Comba de Vilariça",
      "Seixo de Manhoses",
      "Trindade",
      "Vale de Torno e Alagoa",
      "Vila Flor e Nabo"
    ],
    "Vimioso": [
      "Algoso, Campo de Víboras e Uva",
      "Argozelo",
      "Carção",
      "Matela",
      "Pinelo",
      "Santulhão",
      "Vale de Frades e Avelanoso",
      "Vilar Sêco",
      "Vimioso"
    ],
    "Vinhais": [
      "Agrochão",
      "Candedo",
      "Celas",
      "Edral",
      "Edrosa",
      "Ervedosa",
      "Fresulfe",
      "Mofreita e Cobro",
      "Moimenta e Montouto",
      "Nunes e Ousilhão",
      "Paçó",
      "Penhas Juntas",
      "Quirás e Pinheiro Novo",
      "Rebordelo",
      "Santalha",
      "Sobreiró de Baixo e Alvaredos",
      "Soeira, Fresulfe e Mofreita",
      "Travanca e Santa Cruz",
      "Tuizelo",
      "Vale das Fontes",
      "Vale de Janeiro",
      "Vila Boa de Ousilhão",
      "Vila Verde",
      "Vinhais"
    ]
  },
  "Castelo Branco": {
    "Belmonte": [
      "Belmonte e Colmeal da Torre",
      "Caria",
      "Inguias",
      "Maçainhas"
    ],
    "Castelo Branco": [
      "Alcains",
      "Benquerenças",
      "Cafede",
      "Cebolais de Cima e Retaxo",
      "Escalos de Cima e Lousa",
      "Escalos de Baixo e Mata",
      "Lardosa",
      "Louriçal do Campo",
      "Ninho do Açor e Sobral do Campo",
      "Póvoa de Rio de Moinhos e Cafede",
      "Salgueiro do Campo",
      "Santo André das Toiras",
      "São Vicente da Beira",
      "Sarzedas",
      "Tinalhas",
      "Castelo Branco"
    ],
    "Covilhã": [
      "Armadas",
      "Boidobra",
      "Cortes do Meio",
      "Dominguizo",
      "Erada",
      "Ferro",
      "Orjais",
      "Ourondo",
      "Paul",
      "Peraboa",
      "São Jorge da Beira",
      "Verdelhos",
      "Tortosendo",
      "União das freguesias de Cantar-Galo e Vila do Carvalho",
      "União das freguesias de Covilhã e Canhoso",
      "União das freguesias de Teixoso e Sarzedo",
      "União das freguesias de Peso e Vales do Rio"
    ],
    "Fundão": [
      "Alcaide",
      "Alcaria",
      "Alcongosta",
      "Alpedrinha",
      "Barroca",
      "Bogiças",
      "Castelo Novo",
      "Fatela",
      "Orca",
      "Pêro Viseu",
      "Silvares",
      "Soalheira",
      "Souto da Casa",
      "Vale de Prazeres e Mata da Rainha",
      "Janeiro de Cima e Bogas de Baixo",
      "Três Povos",
      "Fundão, Valverde, Donas e Aldeia de Joanes"
    ],
    "Idanha-a-Nova": [
      "Alcafozes",
      "Idanha-a-Nova e Alcafozes",
      "Ladoeiro",
      "Medelim",
      "Monfortinho e Salvaterra do Extremo",
      "Monsanto e Idanha-a-Velha",
      "Oledo",
      "Penha Garcia",
      "Proença-a-Velha",
      "Rosmaninhal",
      "São Miguel de Acha",
      "Toulões",
      "Zebreira e Segura"
    ],
    "Oleiros": [
      "Cambas",
      "Estreito-Vilar Barroco",
      "Isna",
      "Madeirã",
      "Mosteiro",
      "Oleiros-Amieira",
      "Orvalho",
      "Sarnadas de São Simão",
      "Sobral"
    ],
    "Penamacor": [
      "Aldeia do Bispo, Águas e Aldeia de João Pires",
      "Benquerença",
      "Meimão",
      "Meimoa",
      "Pedrógão de São Pedro e Bemposta",
      "Penamacor",
      "Salvador"
    ],
    "Proença-a-Nova": [
      "Montes da Senhora",
      "Proença-a-Nova e Peral",
      "São Pedro do Esteval",
      "Sobreira Formosa e Alvito da Beira"
    ],
    "Sertã": [
      "Cabeçudo",
      "Carvalhal",
      "Castelo",
      "Cernache do Bonjardim, Nesperal e Palhais",
      "Cumeada e Marmeleiro",
      "Ermida e Figueiredo",
      "Pedrógão Pequeno",
      "Sertã",
      "Troviscal",
      "Várzea dos Cavaleiros"
    ],
    "Vila de Rei": [
      "Fundada",
      "São João do Peso",
      "Vila de Rei"
    ],
    "Vila Velha de Ródão": [
      "Fratel",
      "Perais",
      "Sarnadas de Ródão",
      "Vila Velha de Ródão"
    ]
  },
  "Coimbra": {
    "Arganil": [
      "Anceriz e Vila Cova de Alva",
      "Arganil",
      "Cozelhas",
      "Benfeita",
      "Celavisa",
      "Cepos e Teixeira",
      "Cerdeira e Feijoal",
      "Folques",
      "Piódão",
      "Pomares",
      "Pombeiro da Beira",
      "São Martinho da Cortiça",
      "Secarias"
    ],
    "Cantanhede": [
      "Ançã",
      "Cadima",
      "Cordinhã",
      "Febres",
      "Murtede",
      "Ourentã",
      "Tocha",
      "Cantanhede e Pocariça",
      "Sepins e Bolho",
      "Covões e Camarneira",
      "Vilamar e Corticeiro de Cima"
    ],
    "Coimbra": [
      "Almalaguês",
      "Brasfemes",
      "Cernache",
      "Santo António dos Olivais",
      "São João do Campo",
      "São Silvestre",
      "Ceira",
      "Torres do Mondego",
      "Assafarge e Antanhol",
      "Coimbra (Sé Nova, Santa Cruz, Almedina e São Bartolomeu)",
      "Eiras e São Paulo de Frades",
      "Santa Clara e Castelo Viegas",
      "Trouxemil e Diante",
      "Souselas e Botão",
      "Taveiro, Ameal e Arzila"
    ],
    "Condeixa-a-Nova": [
      "Anobra",
      "Condeixa-a-Velha e Condeixa-a-Nova",
      "Ega",
      "Furadouro",
      "Sebadelhe",
      "Zambujal e Vila Seca"
    ],
    "Figueira da Foz": [
      "Alhadas",
      "Alqueidão",
      "Buarcos e São Julião",
      "Ferreira a Nova",
      "Lavos",
      "Maiorca",
      "Marinha das Ondas",
      "Moinhos da Gândara",
      "Paião",
      "Quiaios",
      "Vila Verde",
      "Bom Sucesso"
    ],
    "Góis": [
      "Alvares",
      "Cadafaz e Colmeal",
      "Góis",
      "Vila Nova do Ceira"
    ],
    "Lousã": [
      "Foz de Arouce e Casal de Ermio",
      "Gândaras",
      "Lousã e Vilarinho",
      "Serpins"
    ],
    "Mira": [
      "Mira",
      "Praia de Mira"
    ],
    "Miranda do Corvo": [
      "Lamas",
      "Miranda do Corvo",
      "Vila Nova",
      "Semide e Rio Vide"
    ],
    "Montemor-o-Velho": [
      "Abrunheira, Verride e Vila Nova da Barca",
      "Carapinheira",
      "Ereira",
      "Liceia",
      "Meãs do Campo",
      "Montemor-o-Velho e Gatões",
      "Pereira",
      "Santo Varão",
      "Seixo de Gatões",
      "Tentúgal"
    ],
    "Oliveira do Hospital": [
      "Aldeia das Dez",
      "Alvoco das Varzeas",
      "Avô",
      "Ervedal e Vila Franca da Beira",
      "Lagos da Beira e Lajeosa",
      "Oliveira do Hospital e São Paio de Gramaços",
      "Nogueira do Cravo",
      "Lourosa",
      "Santa Ovaia e Vila Pouca da Beira",
      "Meruge",
      "Seixo da Beira",
      "Travanca de Lagos"
    ],
    "Pampilhosa da Serra": [
      "Cabril",
      "Dornelas do Zêzere",
      "Fajão-Vidual",
      "Janeiro de Baixo",
      "Machio",
      "Pampilhosa da Serra",
      "Pessegueiro",
      "Unhais-o-Velho"
    ],
    "Penacova": [
      "Carvalho",
      "Figueira de Lorvão",
      "Friúmes e Paradela",
      "Lorvão",
      "Oliveira do Mondego e Travanca do Mondego",
      "Penacova",
      "Sazes do Lorvão",
      "São Pedro de Alva e Porto da Carvoaria"
    ],
    "Penela": [
      "Espinhal",
      "Podentes",
      "Penela (Santa Eufémia e São Miguel) e Rabaçal"
    ],
    "Soure": [
      "Alfarelos",
      "Brunhós",
      "Degracias e Pombalinho",
      "Gesteira e Brunhós",
      "Granja do Ulmeiro",
      "Samuel",
      "Soure",
      "Tapéus",
      "Vila Nova de Anços",
      "Vinha da Rainha"
    ],
    "Tábua": [
      "Candosa",
      "Carapinha",
      "Covas e Vila Nova de Oliveirinha",
      "Espariz e Sinde",
      "Midões",
      "Póvoa de Midões",
      "São João da Boa Vista",
      "Tábua",
      "Pinheiro de Coja e Meda de Mouros"
    ],
    "Vila Nova de Poiares": [
      "Arrifana",
      "Lavegadas",
      "Poiares (Santo André)",
      "São Miguel de Poiares"
    ]
  },
  "Évora": {
    "Alandroal": [
      "Alandroal (Nossa Senhora da Conceição), São Brás dos Matos e Juromenha",
      "Capelins",
      "Santiago Maior",
      "Terena"
    ],
    "Arraiolos": [
      "Arraiolos",
      "Igrejinha",
      "São Gregório e Santa Justa",
      "Gafanhoeira e Sabugueiro",
      "Vimieiro"
    ],
    "Borba": [
      "Borba (Matriz)",
      "Borba (São Bartolomeu)",
      "Orada",
      "Rio de Moinhos"
    ],
    "Estremoz": [
      "Ameixial",
      "Arcos",
      "Glória",
      "Evramonte",
      "São Bento do Cortiço e Santo Estêvão",
      "São Lourenço de Mamporcão e São Bento de Ana Loura",
      "Estremoz (Santa Maria e Santo André)",
      "Veiros"
    ],
    "Évora": [
      "Nossa Senhora da Graça do Divor",
      "Nossa Senhora de Machede",
      "São Bento do Mato",
      "São Miguel de Machede",
      "Torre de Coelheiros",
      "Évora (São Mamede, Sé, São Pedro e Santo Antão)",
      "Malagueira e Teias de Aranha",
      "Bacelo e Senhora da Saúde",
      "São Manços e São Vicente do Pigeiro",
      "Nossa Senhora da Tourega e Nossa Senhora de Guadalupe",
      "São Sebastião da Giesteira e Nossa Senhora da Boa Fé"
    ],
    "Montemor-o-Novo": [
      "Ciborro",
      "Cortiçadas de Lavre e Lavre",
      "Foros de Vale de Figueira",
      "Santiago do Escoural",
      "São Cristóvão",
      "Montemor-o-Novo (Nossa Senhora da Vila, Nossa Senhora do Bispo e Silveiras)"
    ],
    "Mora": [
      "Brotas",
      "Cabeção",
      "Mora",
      "Pavia"
    ],
    "Mourão": [
      "Granja",
      "Luz",
      "Mourão"
    ],
    "Portel": [
      "Alqueva",
      "Amieira e Alqueva",
      "Monte do Trigo",
      "Portel",
      "Santana do Corvo",
      "Vera Cruz"
    ],
    "Redondo": [
      "Montoito",
      "Redondo"
    ],
    "Reguengos de Monsaraz": [
      "Campo e Campinho",
      "Corval",
      "Monsaraz",
      "Reguengos de Monsaraz"
    ],
    "Vendas Novas": [
      "Landeira",
      "Vendas Novas"
    ],
    "Viana do Alentejo": [
      "Aguiar",
      "Alcáçovas",
      "Viana do Alentejo"
    ],
    "Vila Viçosa": [
      "Bencatel",
      "Ciladas",
      "Pardais",
      "Vila Viçosa (Conceição e São Bartolomeu)"
    ]
  },
  "Faro": {
    "Albufeira": [
      "Albufeira e Olhos de Água",
      "Ferreiras",
      "Guia",
      "Paderne"
    ],
    "Alcoutim": [
      "Alcoutim e Pereiro",
      "Giões",
      "Martim Longo",
      "Vaquiros"
    ],
    "Aljezur": [
      "Aljezur",
      "Bordeira",
      "Odeceixe",
      "Rogil"
    ],
    "Castro Marim": [
      "Azinhal",
      "Castro Marim",
      "Odeleite",
      "Vila Nova de Cacela"
    ],
    "Faro": [
      "Faro (Sé e São Pedro)",
      "Santa Bárbara de Nexe",
      "Montenegro",
      "União das freguesias de Conceição e Estoi"
    ],
    "Lagoa": [
      "Estômbar e Parchal",
      "Lagoa e Carvoeiro",
      "Ferragudo",
      "Porches"
    ],
    "Loulé": [
      "Almancil",
      "Alte",
      "Ameixial",
      "Quarteira",
      "Querenca, Tôr e Benafim",
      "Salir",
      "Loulé (São Clemente)",
      "Loulé (São Sebastião)"
    ],
    "Olhão": [
      "Olhão",
      "Moncarapacho e Fuseta",
      "Pechão",
      "Quelfes"
    ],
    "Portimão": [
      "Alvor",
      "Mexilhoeira Grande",
      "Portimão"
    ],
    "São Brás de Alportel": [
      "São Brás de Alportel"
    ],
    "Silves": [
      "Alcantarilha e Pêra",
      "Algoz e Tunes",
      "Armação de Pêra",
      "Silves",
      "São Bartolomeu de Messines",
      "São Marcos da Serra"
    ],
    "Tavira": [
      "Tavira (Santa Maria e Santiago)",
      "Conceição e Cabanas de Tavira",
      "Luz de Tavira e Santo Estêvão",
      "Santa Catarina da Fonte do Bispo",
      "Cachopo",
      "Santo Estêvão"
    ],
    "Vila do Bispo": [
      "Barão de São Miguel",
      "Budens",
      "Sagres",
      "Vila do Bispo e Raposeira"
    ],
    "Vila Real de Santo António": [
      "Vila Nova de Cacela",
      "Monte Gordo",
      "Vila Real de Santo António"
    ]
  },
  "Guarda": {
    "Almeida": [
      "Almeida",
      "Castelo Bom",
      "Criada",
      "Freineda",
      "Vilar Formoso",
      "União das freguesias de Azinhal, Peva e Valverde",
      "União das freguesias de Leomil, Mido, Senouras e Aldeia Nova"
    ],
    "Celorico da Beira": [
      "Celorico (São Pedro e Santa Maria) e Vila Boa do Mondego",
      "Forno Telheiro",
      "Lajeosa do Mondego",
      "Minhocal",
      "Ratoira",
      "Linhares",
      "Vale de Azares"
    ],
    "Figueira de Castelo Rodrigo": [
      "Almofala e Santo André das Toiras",
      "Figueira de Castelo Rodrigo",
      "Mata de Lobos",
      "Vermiosa",
      "União das freguesias de Freixeda do Torrão, Quintã de Pêro Martins e Penha de Águia"
    ],
    "Fornos de Algodres": [
      "Algodres",
      "Fornos de Algodres",
      "Infantias",
      "Maceira",
      "Matança",
      "Sobral Pichorro e Fuinhas"
    ],
    "Gouveia": [
      "Gouveia (São Pedro e São Julião)",
      "Melo e Nabais",
      "Moimenta da Serra e Mangualde da Serra",
      "Ribamondego",
      "Vila Nova de Tazem",
      "Folgosinho"
    ],
    "Guarda": [
      "Guarda",
      "Arcozelo",
      "Casal de Cinza",
      "Gonçalo",
      "Pega",
      "Famalicão",
      "Valhelhas",
      "União das freguesias de Guarda e Gavião",
      "União das freguesias de Mizarela, Pêro Soares e Vila Soeiro"
    ],
    "Mêda": [
      "Mêda, Outeiro de Gatos e Fonte Longa",
      "Longroiva",
      "Poço do Canto",
      "Prova e Codeceira"
    ],
    "Manteigas": [
      "Manteigas (Santa Maria)",
      "Manteigas (São Pedro)",
      "Sameiro",
      "Vale de Amoreira"
    ],
    "Pinhel": [
      "Pinhel",
      "Atalaia e Safurdão",
      "Souro Pires",
      "Valbom e Bogalhal",
      "Alto do Palurdo"
    ],
    "Sabugal": [
      "Sabugal e Aldeia de Santo António",
      "Alfaiates",
      "Vilar Maior",
      "União das freguesias de Aldeia da Ribeira, Milhão e Sparon"
    ],
    "Seia": [
      "Seia, São Romão e Lapa dos Dinheiros",
      "Loriga",
      "Paranhos",
      "Tourais e Lajes",
      "Sabugueiro"
    ],
    "Trancoso": [
      "Trancoso (São Pedro e Santa Maria) e Souto Maior",
      "Vila Franca das Naves e Feital",
      "Moreira de Rei"
    ],
    "Vila Nova de Foz Côa": [
      "Vila Nova de Foz Côa",
      "Almendra",
      "Castelo Melhor",
      "Cedovim",
      "Horta",
      "Sebadelhe"
    ]
  },
  "Leiria": {
    "Alcobaça": [
      "Alcobaça e Vestiaria",
      "Benedita",
      "Celas",
      "Maiorga",
      "Pataias e Martingança",
      "São Martinho do Porto",
      "Turquel"
    ],
    "Alvaiázere": [
      "Alvaiázere",
      "Almoster",
      "Maçãs de Dona Maria",
      "Pussos São Pedro"
    ],
    "Ansião": [
      "Ansião",
      "Chão de Couce",
      "Alvorge",
      "Avelar",
      "Santiago da Guarda"
    ],
    "Batalha": [
      "Batalha",
      "Golpilheira",
      "Reguengo do Fetal",
      "São Mamede"
    ],
    "Bombarral": [
      "Bombarral e Vale Covo",
      "Carvalhal",
      "Roliça"
    ],
    "Caldas da Rainha": [
      "Caldas da Rainha (Nossa Senhora do Pópulo, Coto e São Gregório)",
      "Foz do Arelho",
      "Nadadouro",
      "Santa Catarina"
    ],
    "Castanheira de Pera": [
      "Castanheira de Pera e Coentral"
    ],
    "Figueiró dos Vinhos": [
      "Figueiró dos Vinhos e Bairradas",
      "Aguda",
      "Arega"
    ],
    "Leiria": [
      "Leiria, Pousos, Barreira e Cortes",
      "Amor",
      "Arrabal",
      "Bajouca",
      "Caranguejeira",
      "Coimbrão",
      "Milagres",
      "Monte Real e Carvide"
    ],
    "Marinha Grande": [
      "Marinha Grande",
      "Moita",
      "Vieira de Leiria"
    ],
    "Nazaré": [
      "Nazaré",
      "Famalicão",
      "Valado dos Frades"
    ],
    "Óbidos": [
      "Óbidos (Santa Maria, São Pedro e Sobral da Lagoa)",
      "Gaeiras",
      "Vau"
    ],
    "Pedrógão Grande": [
      "Pedrógão Grande",
      "Graça",
      "Vila Facaia"
    ],
    "Peniche": [
      "Peniche",
      "Atouguia da Baleia",
      "Ferrel",
      "Serra d'El-Rei"
    ],
    "Pombal": [
      "Pombal",
      "Abiul",
      "Almagreira",
      "Carnide",
      "Guia, Ilha e Mata Mourisca",
      "Louriçal",
      "Meirinhas"
    ],
    "Porto de Mós": [
      "Porto de Mós - São João Baptista e São Pedro",
      "Mira de Aire",
      "Alqueidão da Serra",
      "Juncal"
    ]
  },
  "Lisboa": {
    "Alenquer": [
      "Alenquer (Santo Estêvão e Triana)",
      "Carregado e Cadafais",
      "Meca",
      "Olhalvo",
      "Ventosa"
    ],
    "Arruda dos Vinhos": [
      "Arruda dos Vinhos",
      "Arranhó",
      "Cardosas",
      "Santiago dos Velhos"
    ],
    "Azambuja": [
      "Azambuja",
      "Alcoentre",
      "Aveiras de Baixo",
      "Aveiras de Cima",
      "Vale do Paraíso"
    ],
    "Cadaval": [
      "Cadaval e Pêro Moniz",
      "Alcoentre",
      "Lamas e Cercal",
      "Vilar"
    ],
    "Cascais": [
      "Cascais e Estoril",
      "Carcavelos e Parede",
      "Alcabideche",
      "São Domingos de Rana"
    ],
    "Lisboa": [
      "Alvalade",
      "Areeiro",
      "Arroios",
      "Avenidas Novas",
      "Belém",
      "Campo de Ourique",
      "Campolide",
      "Carnide",
      "Estrela",
      "Lumiar",
      "Marvila",
      "Misericórdia",
      "Olivais",
      "Parque das Nações",
      "Penha de França",
      "Santa Clara",
      "Santa Maria Maior",
      "Santo António",
      "São Domingos de Benfica",
      "São Vicente"
    ],
    "Loures": [
      "Loures",
      "Odivelas",
      "União das freguesias de Camarate, Unhos e Apelação",
      "União das freguesias de Sacavém e Prior Velho",
      "União das freguesias de Santa Iria de Azoia, São João da Talha e Bobadela"
    ],
    "Lourinhã": [
      "Lourinhã e Atalaia",
      "Miragaia e Marteleira",
      "Ribamar",
      "Reguengo Grande"
    ],
    "Mafra": [
      "Mafra",
      "Ericeira",
      "Malveira e São Miguel de Alcainça",
      "Venda do Pinheiro e Santo Estêvão das Galés"
    ],
    "Odivelas": [
      "Odivelas",
      "Pontinha e Famões",
      "Ramada e Caneças",
      "Odivelas"
    ],
    "Oeiras": [
      "Oeiras e São Julião da Barra, Paço de Arcos e Caxias",
      "Algés, Linda-a-Velha e Cruz Quebrada-Dafundo",
      "Carnaxide e Queijas",
      "Barcarena",
      "Porto Salvo"
    ],
    "Sintra": [
      "Algueirão-Mem Martins",
      "Casal de Cambra",
      "Colares",
      "Rio de Mouro",
      "União das freguesias de Cacém e São Marcos",
      "União das freguesias de Massamá e Monte Abraão",
      "União das freguesias de Queluz e Belas",
      "União das freguesias de Sintra (Santa Maria e São Miguel, São Martinho e São Pedro de Penaferrim)"
    ],
    "Sobral de Monte Agraço": [
      "Sobral de Monte Agraço",
      "Santo Quintino",
      "Sapataria"
    ],
    "Torres Vedras": [
      "Torres Vedras (São Pedro e Santiago e Santa Maria do Castelo e São Miguel) e Matacães",
      "Silveira",
      "Santa Maria, São Pedro e Matacães",
      "Ramalhal"
    ],
    "Vila Franca de Xira": [
      "Vila Franca de Xira",
      "Alverca do Ribatejo e Sobralinho",
      "Póvoa de Santa Iria e Forte da Casa",
      "Vialonga",
      "Castanheira do Ribatejo e Cachoeiras"
    ]
  },
  "Portalegre": {
    "Alter do Chão": [
      "Alter do Chão",
      "Chancelaria",
      "Cunha Baixa",
      "Seda"
    ],
    "Arronches": [
      "Assunção",
      "Esperança",
      "Mosteiros"
    ],
    "Avis": [
      "Avis",
      "Alcórrego e Maranhão",
      "Benavila e Valongo",
      "Ervedal"
    ],
    "Campo Maior": [
      "Nossa Senhora da Expectação",
      "Nossa Senhora da Graça dos Degolados",
      "São João Baptista"
    ],
    "Castelo de Vide": [
      "Santa Maria da Devesa",
      "Santiago Maior",
      "São João Baptista",
      "Póvoa e Meadas"
    ],
    "Crato": [
      "Crato e Mártires, Flor da Rosa e Vale do Peso",
      "Gáfete",
      "Monte da Pedra"
    ],
    "Elvas": [
      "Caia, São Pedro e Alcáçova",
      "Assunção, Ajuda, Salvador e Santo Ildefonso",
      "Santa Eulália",
      "Vila Boim"
    ],
    "Fronteira": [
      "Fronteira",
      "Cabeço de Vide",
      "São Saturnino"
    ],
    "Gavião": [
      "Gavião e Atalaia",
      "Comenda",
      "Margem"
    ],
    "Marvão": [
      "Santa Maria de Marvão",
      "São Salvador da Aramenha",
      "Santo António das Areias"
    ],
    "Monforte": [
      "Monforte",
      "Assumar",
      "Santo Aleixo",
      "Vaiamonte"
    ],
    "Nisa": [
      "Nisa (Espirito Santo e Nossa Senhora da Graça)",
      "Montalvão",
      "Santana",
      "Tolosa"
    ],
    "Ponte de Sor": [
      "Ponte de Sor, Tramaga e Vale de Açor",
      "Galveias",
      "Montargil",
      "Foros de Arrão"
    ],
    "Portalegre": [
      "Portalegre (Sé e São Lourenço)",
      "Alagoa",
      "Alegrete",
      "Fortios",
      "Urra"
    ],
    "Sousel": [
      "Sousel",
      "Cano",
      "Casa Branca",
      "Santo Amaro"
    ]
  },
  "Porto": {
    "Amarante": [
      "Amarante (São Gonçalo), Madalena, Cepelos e Gatão",
      "Bustelo",
      "Carvalho de Rei",
      "Vila Garcia",
      "União das freguesias de Freixo de Cima e Freixo de Baixo"
    ],
    "Baião": [
      "Ancede e Ribadouro",
      "Baião (Santa Leocádia) e Mesquinhata",
      "Campelo e Ovil",
      "Gestaçô",
      "Viariz"
    ],
    "Felgueiras": [
      "Felgueiras e Margaride",
      "Fornos",
      "Lagares",
      "Idães",
      "União das freguesias de Macieira da Lixa e Caramos"
    ],
    "Gondomar": [
      "Gondomar (Souto), Valbom e Jovim",
      "Fânzeres e São Pedro da Cova",
      "Rio Tinto",
      "Lomba"
    ],
    "Lousada": [
      "Lousada (Santa Margarida e São Miguel)",
      "Cernadelo",
      "Lustosa e Barrosas (Santo Estêvão)",
      "Meinedo"
    ],
    "Maia": [
      "Maia",
      "Cidade da Maia",
      "Águas Santas",
      "Castêlo da Maia",
      "Pedrouços",
      "Milheirós"
    ],
    "Marco de Canaveses": [
      "Marco",
      "Alpendorada, Várzea e Torraõ",
      "Constance",
      "Avessadas e Rosém",
      "Sande"
    ],
    "Matosinhos": [
      "Matosinhos e Leça da Palmeira",
      "Custóias, Leça do Balio e Guifões",
      "São Mamede de Infesta e Senhora da Hora",
      "Perafita, Lavra e Santa Cruz do Bispo"
    ],
    "Paços de Ferreira": [
      "Paços de Ferreira",
      "Frazão Arreigada",
      "Freamunde",
      "Sanfins Lamoso Codessos"
    ],
    "Paredes": [
      "Paredes",
      "Baltar",
      "Cete",
      "Gandra",
      "Lordelo",
      "Rebordosa",
      "Recarei",
      "Sobreira"
    ],
    "Penafiel": [
      "Penafiel",
      "Guilhufe e Urrô",
      "Novelas",
      "Paço de Sousa",
      "Rio de Moinhos",
      "Termas de São Vicente"
    ],
    "Porto": [
      "Bonfim",
      "Campanhã",
      "Paranhos",
      "Ramalde",
      "União das freguesias de Aldoar, Foz do Douro e Nevogilde",
      "União das freguesias de Cedofeita, Santo Ildefonso, Sé, Miragaia, São Nicolau e Vitória",
      "União das freguesias de Lordelo do Ouro e Massarelos"
    ],
    "Póvoa de Varzim": [
      "Póvoa de Varzim, Beiriz e Argivai",
      "Aver-o-Mar, Amorim e Terroso",
      "Aguçadoura e Navais"
    ],
    "Santo Tirso": [
      "Santo Tirso, Couto e Burgães",
      "Aves",
      "Rebordões",
      "Roriz",
      "Vilarinho"
    ],
    "Trofa": [
      "Bougado (São Martinho e Santiago)",
      "Alvarelhos e Guidões",
      "Coronado (São Romão e São Mamede)"
    ],
    "Valongo": [
      "Alfena",
      "Ermesinde",
      "Valongo",
      "Campo e Sobrado"
    ],
    "Vila do Conde": [
      "Vila do Conde",
      "Azurara",
      "Árvore",
      "União das freguesias de Bagunte, Ferreiró, Outeiró e Parada"
    ],
    "Vila Nova de Gaia": [
      "Arcozelo",
      "Avintes",
      "Canelas",
      "Canidelo",
      "Gulpilhares e Valadares",
      "Mafamude e Vilar do Paraíso",
      "Oliveira do Douro",
      "Pedroso e Seixezelo",
      "Sandim, Olival, Lever e Crestuma",
      "Santa Marinha e São Pedro da Afurada",
      "São Felix da Marinha",
      "Vilar de Andorinho"
    ]
  },
  "Santarém": {
    "Abrantes": [
      "Abrantes (São Vicente e São João) e Alferrarede",
      "Bemposta",
      "Tramagal",
      "Pego"
    ],
    "Almeirim": [
      "Almeirim",
      "Fazendas de Almeirim",
      "Benfica do Ribatejo",
      "Raposa"
    ],
    "Alpiarça": [
      "Alpiarça"
    ],
    "Benavente": [
      "Benavente",
      "Samora Correia",
      "Santo Estêvão",
      "Barrosa"
    ],
    "Cartaxo": [
      "Cartaxo e Vale da Pinta",
      "Pontével",
      "Vila Chã de Ourique",
      "Ereira e Lapa"
    ],
    "Chamusca": [
      "Chamusca e Pinheiro Grande",
      "Ulme",
      "Parreira e Chouto"
    ],
    "Constância": [
      "Constância",
      "Montalvo",
      "Santa Margarida da Coutada"
    ],
    "Coruche": [
      "Coruche, Fajarda e Erra",
      "Couço",
      "Biscainho"
    ],
    "Entroncamento": [
      "São João Baptista",
      "Nossa Senhora de Fátima"
    ],
    "Ferreira do Zêzere": [
      "Ferreira do Zêzere",
      "Águas Belas",
      "Chãos",
      "Beco"
    ],
    "Golegã": [
      "Golegã",
      "Azinhaga",
      "Pombalinho"
    ],
    "Mação": [
      "Mação, Penhascoso e Aboboreira",
      "Cardigos",
      "Carvoeiro"
    ],
    "Ourém": [
      "Ourém",
      "Fátima",
      "Caxarias",
      "Freixianda, Ribeira do Fárrio e Formigais"
    ],
    "Rio Maior": [
      "Rio Maior",
      "Asseiceira",
      "Alcobertas",
      "Marmeleira"
    ],
    "Salvatat de Magos": [
      "Salvaterra de Magos e Foros de Salvaterra",
      "Marinhais",
      "Muge"
    ],
    "Santarém": [
      "Santarém (Marvila, Santa Iria da Ribeira de Santarém, São Salvador e São Nicolau)",
      "Almeirim",
      "Vale de Santarém"
    ],
    "Sardoal": [
      "Sardoal",
      "Alcaravela",
      "Santiago de Montalegre"
    ],
    "Tomar": [
      "Tomar (São João Baptista e Santa Maria dos Olivais)",
      "Asseiceira",
      "Madalena e Beselga"
    ],
    "Torres Novas": [
      "Torres Novas (São Pedro, Santiago e Santa Maria do Castelo)",
      "Riachos",
      "Assentiz"
    ],
    "Vila Nova da Barquinha": [
      "Vila Nova da Barquinha",
      "Atalaia",
      "Praia do Ribatejo",
      "Tancos"
    ]
  },
  "Setúbal": {
    "Alcochete": [
      "Alcochete",
      "Samouco",
      "São Francisco"
    ],
    "Almada": [
      "Almada, Cova da Piedade, Pragal e Cacilhas",
      "Laranjeiro e Feijó",
      "Charneca de Caparica e Sobreda",
      "Costa da Caparica"
    ],
    "Barreiro": [
      "Barreiro e Lavradio",
      "Alto do Seixalinho, Santo André e Verderena",
      "Palhais e Coina"
    ],
    "Grândola": [
      "Grândola e Santa Margarida da Serra",
      "Melides",
      "Carvalhal",
      "Azinheira dos Barros"
    ],
    "Moita": [
      "Moita",
      "Baixa da Banheira e Vale da Amoreira",
      "Alhos Vedros",
      "Gaio-Rosário e Sarilhos Pequenos"
    ],
    "Montijo": [
      "Montijo e Afonsoeiro",
      "Atalaia e Alto Estanqueiro-Jardia",
      "Pegões",
      "Canha"
    ],
    "Palmela": [
      "Palmela",
      "Pinhal Novo",
      "Quinta do Anjo",
      "Marateca e Poceirão"
    ],
    "Santiago do Cacém": [
      "Santiago do Cacém, Santa Cruz e São Bartolomeu da Serra",
      "Santo André",
      "Cercal do Alentejo"
    ],
    "Seixal": [
      "Seixal, Arrentela e Aldeia de Paio Pires",
      "Amora",
      "Corroios"
    ],
    "Sesimbra": [
      "Sesimbra (Santiago)",
      "Sesimbra (Castelo)",
      "Quinta do Conde"
    ],
    "Setúbal": [
      "Setúbal (São Julião, Nossa Senhora da Anunciada e Santa Maria da Graça)",
      "São Sebastião",
      "Azeitão"
    ],
    "Sines": [
      "Sines",
      "Porto Covo"
    ]
  },
  "Viana do Castelo": {
    "Arcos de Valdevez": [
      "Arcos de Valdevez (São Salvador e São Paio) e Giela",
      "Soajo",
      "Távora"
    ],
    "Caminha": [
      "Caminha e Vilarelho",
      "Vila Praia de Âncora",
      "Moledo e Cristelo"
    ],
    "Melgaço": [
      "Vila e Roussas",
      "Castro Laboreiro e Lamas de Mouro",
      "Fiães"
    ],
    "Monção": [
      "Monção e Troviscoso",
      "Mazedo e Cortes",
      "Pias"
    ],
    "Paredes de Coura": [
      "Paredes de Coura e Resende",
      "Romarigães",
      "Rubiães"
    ],
    "Ponte da Barca": [
      "Ponte da Barca, Vila Nova de Muía e Paço Vedro de Magalhães",
      "Bravães"
    ],
    "Ponte de Lima": [
      "Ponte de Lima",
      "Arcozelo",
      "Refoios do Lima",
      "Freixo"
    ],
    "Valença": [
      "Valença, Cristelo Covo e Arão",
      "Gandra e Taião",
      "Friestas"
    ],
    "Viana do Castelo": [
      "Viana do Castelo (Santa Maria Maior e Monserrate) e Meadela",
      "Darque",
      "Areosa",
      "Lanheses"
    ],
    "Vila Nova de Cerveira": [
      "Vila Nova de Cerveira e Lovelhe",
      "Campos e Vila Meã",
      "Gondarém"
    ]
  },
  "Vila Real": {
    "Alijó": [
      "Alijó",
      "Sanfins do Douro",
      "Favaios",
      "Vilar de Maçada"
    ],
    "Boticas": [
      "Boticas e Granja",
      "Alturas do Barroso e Cerdedo",
      "Covas do Barroso"
    ],
    "Chaves": [
      "Chaves",
      "Madalena e Samaiões",
      "Vidago",
      "Oura"
    ],
    "Mondim de Basto": [
      "Mondim de Basto",
      "Atei",
      "Bilhó",
      "Ermelo"
    ],
    "Montalegre": [
      "Montalegre e Padroso",
      "Salto",
      "Cabril",
      "Pitões das Júnias"
    ],
    "Murça": [
      "Murça",
      "Candedo",
      "Carva e Vilares",
      "Jou"
    ],
    "Peso da Régua": [
      "Peso da Régua e Godim",
      "Poiares e Canelas",
      "Galafura e Covelinhas"
    ],
    "Ribeira de Pena": [
      "Salvador e Santo Aleixo de Além-Tâmega",
      "Cerva e Limões"
    ],
    "Sabrosa": [
      "Sabrosa",
      "Celeirós",
      "Provesende, Gouvães do Douro e São Cristóvão do Douro"
    ],
    "Santa Marta de Penaguião": [
      "Lobrigos e Sanhoane",
      "Cumieira",
      "Meda de Mouros"
    ],
    "Valpaços": [
      "Valpaços e Sanfins",
      "Carrazedo de Montenegro e Curros",
      "Lebução"
    ],
    "Vila Pouca de Aguiar": [
      "Vila Pouca de Aguiar",
      "Pedras Salgadas",
      "Bornes de Aguiar"
    ],
    "Vila Real": [
      "Vila Real",
      "Mateus",
      "Lordelo",
      "Nossa Senhora da Conceição, São Pedro e São Dinis"
    ]
  },
  "Viseu": {
    "Armamar": [
      "Armamar",
      "Folgosa",
      "Cimbres",
      "Vacalar"
    ],
    "Carregal do Sal": [
      "Carregal do Sal",
      "Oliveira do Conde",
      "Cabanas de Viriato"
    ],
    "Castro Daire": [
      "Castro Daire",
      "Mões",
      "Cabril",
      "Ermida"
    ],
    "Cinfães": [
      "Cinfães",
      "Tendais",
      "Souselo",
      "Nespereira"
    ],
    "Lamego": [
      "Lamego (Almacave e Sé)",
      "Cambres",
      "Avões",
      "Samodães"
    ],
    "Mangualde": [
      "Mangualde, Mesquitela e Cunha Alta",
      "Santiago de Cassurrães e Póvoa de Cervães"
    ],
    "Moimenta da Beira": [
      "Moimenta da Beira",
      "Leomil",
      "Peva e Segões"
    ],
    "Mortágua": [
      "Mortágua, Vale de Remígio, Cortegaça e Almaça"
    ],
    "Nelas": [
      "Nelas",
      "Canas de Senhorim",
      "Carvalhal Redondo e Aguieira"
    ],
    "Oliveira de Frades": [
      "Oliveira de Frades, Souto de Lafões e Sejães",
      "Arcozelo das Maias"
    ],
    "Penalva do Castelo": [
      "Penalva do Castelo",
      "Ínsua",
      "Lusinde"
    ],
    "Penedono": [
      "Penedono e Granja",
      "Beselga",
      "Antas e Ourozinho"
    ],
    "Resende": [
      "Resende",
      "Cárquere",
      "Barrô",
      "São Martinho de Mouros"
    ],
    "Santa Comba Dão": [
      "Santa Comba Dão e Couto do Mosteiro",
      "Óvoa e Vimieiro"
    ],
    "São João da Pesqueira": [
      "São João da Pesqueira e Várzea de Trevões",
      "Trevões"
    ],
    "São Pedro do Sul": [
      "São Pedro do Sul, Várzea e Baiões",
      "Carvalhais e Candal"
    ],
    "Sátão": [
      "Sátão",
      "Ferreira de Aves",
      "Águas Boas e Forles"
    ],
    "Sernancelhe": [
      "Sernancelhe e Sarzeda",
      "Quintela",
      "Lamosa"
    ],
    "Tabuaço": [
      "Tabuaço",
      "Pinheiros",
      "Sendim",
      "Barcos e Santa Leocádia"
    ],
    "Tarouca": [
      "Tarouca e Dálvares",
      "Salzedas",
      "Ucanha"
    ],
    "Tondela": [
      "Tondela e Nandufe",
      "Canas de Santa Maria",
      "Molelos",
      "Campo de Besteiros"
    ],
    "Vila Nova de Paiva": [
      "Vila Nova de Paiva, Alhais e Fráguas",
      "Queiriga"
    ],
    "Viseu": [
      "Viseu",
      "Abraveses",
      "Repeses e São Salvador",
      "Ranhados",
      "Rio de Loba"
    ]
  },
  "Açores": {
    "Angra do Heroísmo": [
      "Sé",
      "Nossa Senhora da Conceição",
      "São Bento",
      "Posto Santo",
      "Terra Chã"
    ],
    "Horta": [
      "Matriz",
      "Angústias",
      "Conceição",
      "Flamengos",
      "Feteira"
    ],
    "Ponta Delgada": [
      "São Sebastião",
      "São Pedro",
      "Matriz",
      "Fajã de Baixo",
      "Fajã de Cima",
      "Capelas"
    ],
    "Ribeira Grande": [
      "Matriz",
      "Conceição",
      "Rabo de Peixe",
      "Maia"
    ],
    "Vila do Porto": [
      "Vila do Porto",
      "Almagreira",
      "Santa Bárbara"
    ]
  },
  "Madeira": {
    "Funchal": [
      "Sé",
      "Santa Maria Maior",
      "São Pedro",
      "Nossa Senhora do Monte",
      "Santo António",
      "São Martinho"
    ],
    "Câmara de Lobos": [
      "Câmara de Lobos",
      "Estreito de Câmara de Lobos",
      "Quinta Grande"
    ],
    "Machico": [
      "Machico",
      "Caniçal",
      "Porto da Cruz",
      "Santana"
    ],
    "Porto Santo": [
      "Porto Santo"
    ]
  }
};

const getDistritos  = () => Object.keys(PT_LOC).sort();
const getConcelhos  = (d) => d && PT_LOC[d] ? Object.keys(PT_LOC[d]).sort() : [];
const getFreguesias = (d, c) => d && c && PT_LOC[d]?.[c] ? [...PT_LOC[d][c]].sort() : [];


const fmt = (v, monthly=false) => {
  const n = Number(v);
  if (isNaN(n)) return "—";
  const s = n >= 1000000
    ? `${(n/1000000).toFixed(2).replace(".",",")} M€`
    : n >= 1000
    ? `${(n/1000).toFixed(0)}K €`
    : `${n.toLocaleString("pt-PT")} €`;
  return monthly ? `${s}/mês` : s;
};
const fmtFull = (v) => `${Number(v).toLocaleString("pt-PT")} €`;
const fmtM2   = (v) => `${Number(v).toLocaleString("pt-PT")} €/m²`;

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:${G.bg};color:${G.text};font-family:'DM Sans',sans-serif}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${G.surface}}::-webkit-scrollbar-thumb{background:${G.goldDark};border-radius:2px}
.gg{background:linear-gradient(135deg,${G.goldDark},${G.gold1},${G.gold2});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.btn-gold{background:linear-gradient(135deg,${G.goldDark},${G.gold1});color:#0E0E0F;border:none;padding:10px 22px;border-radius:7px;font-family:'DM Sans',sans-serif;font-weight:500;font-size:13px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:7px;letter-spacing:.3px}
.btn-gold:hover{filter:brightness(1.15);transform:translateY(-1px)}
.btn-gold:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-ghost{background:transparent;color:${G.textMuted};border:1px solid ${G.border};padding:9px 18px;border-radius:7px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.btn-ghost:hover{border-color:${G.gold1};color:${G.gold1}}
.btn-purple{background:linear-gradient(135deg,#6B3FBF,${G.purple});color:#fff;border:none;padding:10px 22px;border-radius:7px;font-family:'DM Sans',sans-serif;font-weight:500;font-size:13px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:7px}
.btn-purple:hover{filter:brightness(1.15);transform:translateY(-1px)}
.btn-purple:disabled{opacity:.5;cursor:not-allowed;transform:none}
.card{background:${G.surface};border:1px solid ${G.border};border-radius:10px;padding:20px;transition:border-color .2s}
.card:hover{border-color:${G.goldDark}60}
.tag{display:inline-block;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:500;letter-spacing:.4px;text-transform:uppercase}
input,select,textarea{background:${G.surface2};border:1px solid ${G.border};color:${G.text};padding:10px 14px;border-radius:7px;font-family:'DM Sans',sans-serif;font-size:13px;width:100%;outline:none;transition:border-color .2s}
input:focus,select:focus,textarea:focus{border-color:${G.gold1};box-shadow:0 0 0 2px ${G.gold1}15}
input::placeholder,textarea::placeholder{color:${G.textDim}}
select option{background:${G.surface2}}
label{font-size:12px;color:${G.textMuted};display:block;margin-bottom:5px;letter-spacing:.3px}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:1000;animation:fadeIn .2s ease}
.modal{background:${G.surface};border:1px solid ${G.border};border-radius:14px;padding:28px;width:640px;max-width:96vw;max-height:92vh;overflow-y:auto;animation:slideUp .25s ease}
.modal-wide{width:840px}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(22px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes loginIn{from{opacity:0;transform:scale(.96) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
.spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
.spinner-gold{border-color:${G.goldDark}40;border-top-color:${G.gold1}}
.pulsing{animation:pulse 1.6s ease infinite}
.stat-card{background:${G.surface};border:1px solid ${G.border};border-radius:10px;padding:18px 22px;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,${G.goldDark},${G.gold2})}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;cursor:pointer;transition:all .15s;font-size:13.5px;color:${G.textMuted};border:1px solid transparent}
.nav-item:hover{background:${G.surface2};color:${G.text}}
.nav-item.active{background:${G.surface3};color:${G.gold1};border-color:${G.goldDark}30}
.table-row{display:grid;padding:13px 16px;border-radius:8px;transition:background .15s;align-items:center}
.table-row:hover{background:${G.surface2}}
.badge-venda{background:${G.green}20;color:${G.green}}
.badge-locacao{background:${G.blue}20;color:${G.blue}}
.badge-disponivel{background:${G.green}20;color:${G.green}}
.badge-reservado{background:#E0A05220;color:#E0A052}
.badge-vendido{background:${G.textDim}20;color:${G.textDim}}
.badge-arrendado{background:${G.textDim}20;color:${G.textDim}}
.badge-quente{background:${G.red}20;color:${G.red}}
.badge-morno{background:#E0A05220;color:#E0A052}
.badge-frio{background:${G.blue}20;color:${G.blue}}
.badge-alta{background:${G.red}20;color:${G.red}}
.badge-media,.badge-média{background:#E0A05220;color:#E0A052}
.badge-baixa{background:${G.textDim}20;color:${G.textDim}}
.badge-comprar{background:${G.purple}20;color:${G.purple}}
.ai-box{background:linear-gradient(135deg,${G.purple}10,${G.goldDark}10);border:1px solid ${G.purple}40;border-radius:10px;padding:20px}
.ai-section{background:${G.surface2};border-radius:8px;padding:14px;margin-top:12px}
.price-bar{height:8px;border-radius:4px;background:linear-gradient(90deg,${G.green},${G.gold1},${G.red});position:relative}
.price-indicator{position:absolute;top:-4px;width:16px;height:16px;border-radius:50%;background:${G.gold2};border:2px solid ${G.bg};transform:translateX(-50%)}

/* ── BOTTOM NAV ── */
.bottom-nav{position:fixed;bottom:0;left:0;right:0;background:${G.surface};border-top:1px solid ${G.border};display:flex;z-index:200;padding-bottom:env(safe-area-inset-bottom)}
.bnav-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 4px 8px;cursor:pointer;transition:all .15s;position:relative;gap:4px;min-height:56px}
.bnav-item.active .bnav-label{color:${G.gold1}}
.bnav-label{font-size:10px;color:${G.textDim};letter-spacing:.2px;transition:color .15s}
.bnav-item.active .bnav-icon{color:${G.gold1}}
.bnav-icon{color:${G.textDim};transition:color .15s;display:flex}
.bnav-dot{position:absolute;top:8px;right:calc(50% - 12px);width:8px;height:8px;background:${G.red};border-radius:50%;border:2px solid ${G.surface}}
.bnav-dot-purple{position:absolute;top:6px;right:calc(50% - 14px);width:6px;height:6px;background:${G.purple};border-radius:50%}

/* ── MOBILE MODAL (sheet) ── */
@media(max-width:767px){
  .modal{border-radius:18px 18px 0 0;position:fixed;bottom:0;left:0;right:0;width:100%!important;max-width:100%!important;max-height:92vh;padding:20px 18px;animation:sheetUp .3s ease}
  .modal-wide{width:100%!important}
  @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  .modal-overlay{align-items:flex-end}
  input,select,textarea{font-size:16px!important}
  .login-right{display:none!important}
  .login-left{padding:32px 24px!important}
  .login-title{font-size:30px!important}
  .stat-grid-mob{grid-template-columns:1fr 1fr!important}
  .dash-grid-mob{grid-template-columns:1fr!important}
  .prosp-grid-mob{grid-template-columns:1fr 1fr!important;grid-template-rows:auto auto auto}
  .prosp-form-mob{grid-template-columns:1fr 1fr!important}
  .imovel-card{padding:14px!important}
  .page-header-mob{flex-direction:row;align-items:center}
  .hide-mobile{display:none!important}
  .table-header-mob{display:none!important}
}

/* ── LOGIN ── */
.login-wrap{min-height:100vh;display:flex;background:${G.bg};position:relative;overflow:hidden}
.login-left{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;position:relative;z-index:2}
.login-right{width:45%;background:linear-gradient(160deg,#111 0%,#1a1408 50%,#0f0f0f 100%);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;border-left:1px solid ${G.border}}
.login-card{width:100%;max-width:400px;animation:loginIn .5s ease}
.login-title{font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:700;line-height:1.1;margin-bottom:8px}
.login-sub{font-size:14px;color:${G.textMuted};margin-bottom:36px;line-height:1.5}
.login-field{margin-bottom:18px}
.login-field label{font-size:12px;color:${G.textMuted};display:block;margin-bottom:7px;letter-spacing:.5px;text-transform:uppercase}
.login-input{background:${G.surface2};border:1px solid ${G.border};color:${G.text};padding:13px 16px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;width:100%;outline:none;transition:all .2s}
.login-input:focus{border-color:${G.gold1};box-shadow:0 0 0 3px ${G.gold1}15}
.login-btn{width:100%;padding:14px;border-radius:8px;border:none;background:linear-gradient(135deg,${G.goldDark},${G.gold1},${G.gold2});color:#0E0E0F;font-family:'DM Sans',sans-serif;font-weight:600;font-size:15px;cursor:pointer;transition:all .25s;letter-spacing:.3px;margin-top:8px}
.login-btn:hover{filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 8px 24px ${G.gold1}30}
.login-btn:disabled{opacity:.6;transform:none;cursor:not-allowed}
.login-error{background:${G.red}15;border:1px solid ${G.red}40;border-radius:7px;padding:11px 14px;font-size:13px;color:${G.red};margin-bottom:16px;display:flex;align-items:center;gap:8px}
.demo-hint{background:${G.surface2};border:1px solid ${G.border};border-radius:8px;padding:14px 16px;margin-top:24px}
.demo-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid ${G.border};font-size:12px;cursor:pointer;border-radius:4px;transition:background .15s;padding:7px 8px}
.demo-row:last-child{border-bottom:none}
.demo-row:hover{background:${G.surface3}}
.orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}
`;

// ── Icons ─────────────────────────────────────────────────────
const Ic = ({n,s=16,c="currentColor"}) => {
  const d = {
    home:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    building:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><rect x="3" y="2" width="18" height="20" rx="1"/><line x1="9" y1="22" x2="9" y2="2"/><line x1="3" y1="7" x2="9" y2="7"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="3" y1="17" x2="9" y2="17"/><line x1="9" y1="7" x2="21" y2="7"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="17" x2="21" y2="17"/></svg>,
    users:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    calendar:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    search2:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
    plus:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    x:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    check:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    edit:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    spark:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    map:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
    pdf:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    trend:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    logout:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    lock:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    mail:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    phone:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.19 2.22 2 2 0 012.17.04h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.16 6.16l1.03-.55a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
    eye:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    share:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
    eyeoff:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    user:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    info:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    link:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
    file:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    pt:<svg width={s+4} height={s} viewBox="0 0 30 20"><rect width="30" height="20" fill="#006600"/><rect x="10" width="20" height="20" fill="#FF0000"/><circle cx="10" cy="10" r="5" fill="#FFD700" stroke="#003399" strokeWidth=".8"/></svg>,
    chart:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  };
  return d[n] || null;
};

const Logo = ({size="md"}) => {
  const big = size==="lg";
  return (
    <div style={{display:"flex",alignItems:"center",gap:big?14:10,padding:"4px 0"}}>
      <svg width={big?48:32} height={big?42:28} viewBox="0 0 80 70">
        <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={G.goldDark}/><stop offset="50%" stopColor={G.gold2}/><stop offset="100%" stopColor={G.gold1}/>
        </linearGradient></defs>
        <path d="M5 65 L5 30 L25 10 L40 25 L55 10 L75 30 L75 65" fill="none" stroke="url(#lg)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 65 L20 45 L40 25 L60 45 L60 65" fill="none" stroke="url(#lg)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:big?26:16,fontWeight:700,lineHeight:1,background:`linear-gradient(135deg,${G.goldDark},${G.gold2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>MAGNA</div>
        <div style={{fontSize:big?11:9,color:G.textDim,letterSpacing:"1.5px",textTransform:"uppercase",marginTop:2}}>Group Real Estate</div>
      </div>
    </div>
  );
};

// ── LOGIN SCREEN ──────────────────────────────────────────────
const LoginScreen = ({onLogin}) => {
  const [email,setEmail]   = useState("");
  const [pass,setPass]     = useState("");
  const [apiKey,setAKey]   = useState("");
  const [showPass,setShow] = useState(false);
  const [showKey,setShowK] = useState(false);
  const [loading,setLoad]  = useState(false);
  const [error,setError]   = useState("");
  const [mode,setMode]     = useState("login"); // login | recover | reset
  const [info,setInfo]     = useState("");

  // Detectar se vimos de um link de recuperação
  useEffect(() => {
    if (window.location.search.includes("reset=true") || window.location.hash.includes("type=recovery")) {
      setMode("reset");
    }
  }, []);

  const tryLogin = async () => {
    setLoad(true); setError(""); setInfo("");
    if (!email.trim() || !pass) { setError("Preenche e-mail e palavra-passe."); setLoad(false); return; }
    try {
      if (!dbReady) throw new Error("Base de dados não configurada.");
      const u = await dbUtilizadores.signIn(email.trim(), pass);
      const isNetlify = window.location.hostname.includes("netlify.app") ||
                        (window.location.hostname !== "localhost" && !window.location.hostname.includes("claude.ai"));
      if (!isNetlify && apiKey.trim() && !apiKey.trim().startsWith("sk-ant-")) {
        setError("Chave de API inválida. Deve começar com sk-ant-");
        setLoad(false); return;
      }
      setApiKey(apiKey);
      onLogin(u);
    } catch (e) {
      // Mensagens em português para erros comuns
      const msg = e.message || "";
      if (msg.includes("Invalid login") || msg.includes("credentials")) setError("E-mail ou palavra-passe incorretos.");
      else if (msg.includes("Email not confirmed")) setError("E-mail ainda não confirmado. Verifica a tua caixa de entrada.");
      else setError(msg);
    }
    setLoad(false);
  };

  const tryRecover = async () => {
    setLoad(true); setError(""); setInfo("");
    if (!email.trim()) { setError("Introduz o e-mail."); setLoad(false); return; }
    try {
      await dbUtilizadores.resetPassword(email.trim());
      setInfo("✓ Enviámos um e-mail com instruções para recuperar a palavra-passe. Verifica a tua caixa de entrada (e spam).");
    } catch (e) { setError(e.message || "Não foi possível enviar o e-mail."); }
    setLoad(false);
  };

  const tryReset = async () => {
    setLoad(true); setError(""); setInfo("");
    if (!pass || pass.length < 6) { setError("A nova palavra-passe deve ter pelo menos 6 caracteres."); setLoad(false); return; }
    try {
      await dbUtilizadores.updatePassword(pass);
      setInfo("✓ Palavra-passe alterada! Já podes iniciar sessão.");
      // Limpar URL e voltar ao login
      window.history.replaceState({}, "", "/");
      setTimeout(()=>{ setMode("login"); setPass(""); setInfo(""); }, 2500);
    } catch (e) { setError(e.message || "Erro ao alterar a palavra-passe."); }
    setLoad(false);
  };

  const fillDemo = (u) => { setEmail(u.email); setPass(u.password); setError(""); };

  return (
    <div className="login-wrap">
      <style>{css}</style>
      {/* Orbs */}
      <div className="orb" style={{width:500,height:500,background:`${G.goldDark}18`,top:-150,left:-150}}/>
      <div className="orb" style={{width:300,height:300,background:`${G.purple}12`,bottom:-80,left:200}}/>

      {/* Left — form */}
      <div className="login-left">
        <div className="login-card">
          <div style={{marginBottom:36}}><Logo size="lg"/></div>

          <h1 className="login-title">
            {mode==="login" && <>Bem-vindo<br/><span className="gg">de volta.</span></>}
            {mode==="recover" && <>Esqueceu-se da<br/><span className="gg">palavra-passe?</span></>}
            {mode==="reset" && <>Nova<br/><span className="gg">palavra-passe.</span></>}
          </h1>
          <p className="login-sub">
            {mode==="login" && "Inicie sessão para aceder ao seu CRM imobiliário."}
            {mode==="recover" && "Indique o seu e-mail e enviaremos instruções."}
            {mode==="reset" && "Escolha uma nova palavra-passe (mín. 6 caracteres)."}
          </p>

          {error && (
            <div className="login-error">
              <Ic n="x" s={15} c={G.red}/> {error}
            </div>
          )}

          {mode !== "reset" && (
            <div className="login-field">
              <label>E-mail</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}><Ic n="mail" s={15} c={G.textDim}/></span>
                <input className="login-input" style={{paddingLeft:42}} type="email" placeholder="o-seu@email.pt"
                  value={email} onChange={e=>{setEmail(e.target.value);setError("")}}
                  onKeyDown={e=>e.key==="Enter"&&(mode==="login"?tryLogin():tryRecover())}/>
              </div>
            </div>
          )}

          {mode !== "recover" && (
            <div className="login-field">
              <label>{mode==="reset" ? "Nova palavra-passe" : "Palavra-passe"}</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}><Ic n="lock" s={15} c={G.textDim}/></span>
                <input className="login-input" style={{paddingLeft:42,paddingRight:44}}
                  type={showPass?"text":"password"} placeholder="••••••••"
                  value={pass} onChange={e=>{setPass(e.target.value);setError("")}}
                  onKeyDown={e=>e.key==="Enter"&&(mode==="login"?tryLogin():tryReset())}/>
                <button onClick={()=>setShow(!showPass)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",display:"flex"}}>
                  <Ic n={showPass?"eyeoff":"eye"} s={16} c={G.textDim}/>
                </button>
              </div>
            </div>
          )}

          {/* API Key — só no modo login */}
          {mode === "login" && (
          <div className="login-field">
            <label style={{display:"flex",alignItems:"center",gap:6}}>
              Chave de API Anthropic
              <span style={{background:`${G.purple}25`,color:G.purple,fontSize:9,padding:"1px 6px",borderRadius:4,fontWeight:600,letterSpacing:".5px"}}>IA</span>
              <span style={{background:`${G.green}20`,color:G.green,fontSize:9,padding:"1px 6px",borderRadius:4,fontWeight:500}}>opcional no Netlify</span>
            </label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}><Ic n="spark" s={15} c={G.textDim}/></span>
              <input className="login-input" style={{paddingLeft:42,paddingRight:44,fontFamily:"monospace",fontSize:12}}
                type={showKey?"text":"password"} placeholder="sk-ant-api03-... (opcional se configurada no Netlify)"
                value={apiKey} onChange={e=>{setAKey(e.target.value);setError("")}}
                onKeyDown={e=>e.key==="Enter"&&tryLogin()}/>
              <button onClick={()=>setShowK(!showKey)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",display:"flex"}}>
                <Ic n={showKey?"eyeoff":"eye"} s={16} c={G.textDim}/>
              </button>
            </div>
            <p style={{fontSize:11,color:G.textDim,marginTop:5}}>
              No <strong style={{color:G.text}}>Netlify</strong>: define <code style={{background:G.surface3,padding:"1px 5px",borderRadius:3,fontSize:10}}>ANTHROPIC_API_KEY</code> em <em>Site Settings → Environment Variables</em> e deixa este campo vazio.
              Ou obtém em <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{color:G.gold1,textDecoration:"none"}}>console.anthropic.com</a>
            </p>
          </div>
          )}

          {/* Mensagem informativa (sucesso) */}
          {info && <div style={{background:`${G.green}15`,border:`1px solid ${G.green}40`,borderRadius:8,padding:"11px 14px",marginBottom:14,display:"flex",alignItems:"flex-start",gap:8}}>
            <span style={{color:G.green,flexShrink:0}}>✓</span>
            <p style={{fontSize:13,color:G.green,lineHeight:1.5}}>{info}</p>
          </div>}

          {mode === "login" && (
            <button className="login-btn" onClick={tryLogin} disabled={loading||!email||!pass}>
              {loading ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span className="spinner"/>A verificar...</span> : "Iniciar Sessão"}
            </button>
          )}

          {mode === "recover" && (
            <button className="login-btn" onClick={tryRecover} disabled={loading||!email}>
              {loading ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span className="spinner"/>A enviar...</span> : "Enviar email de recuperação"}
            </button>
          )}

          {mode === "reset" && (
            <button className="login-btn" onClick={tryReset} disabled={loading||!pass}>
              {loading ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span className="spinner"/>A guardar...</span> : "Definir nova palavra-passe"}
            </button>
          )}

          {/* Links de mudança de modo */}
          {mode === "login" && (
            <p style={{textAlign:"center",fontSize:13,color:G.textMuted,marginTop:14}}>
              <a onClick={()=>{setMode("recover");setError("");setInfo("");setPass("");}} style={{color:G.gold1,cursor:"pointer",textDecoration:"none"}}>Esqueci-me da palavra-passe</a>
            </p>
          )}
          {mode === "recover" && (
            <p style={{textAlign:"center",fontSize:13,color:G.textMuted,marginTop:14}}>
              <a onClick={()=>{setMode("login");setError("");setInfo("");}} style={{color:G.gold1,cursor:"pointer",textDecoration:"none"}}>← Voltar ao início de sessão</a>
            </p>
          )}

          {/* Demo credentials — só em modo login */}
          {mode === "login" && (
            <div className="demo-hint">
              <p style={{fontSize:11,color:G.textDim,marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Magna Group Real Estate</p>
              <p style={{fontSize:12,color:G.textMuted,lineHeight:1.6}}>
                Para criar contas adicionais, inicia sessão como administrador e vai à secção <strong style={{color:G.text}}>Equipa</strong>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right — decorative */}
      <div className="login-right">
        <div className="orb" style={{width:400,height:400,background:`${G.gold1}08`,top:"10%",right:"-10%"}}/>
        <div className="orb" style={{width:250,height:250,background:`${G.purple}12`,bottom:"15%",left:"5%"}}/>
        <div style={{textAlign:"center",zIndex:2,padding:40}}>
          <div style={{fontSize:72,marginBottom:24}}>🏛️</div>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:600,lineHeight:1.3,color:G.gold1,marginBottom:16}}>
            O seu mercado.<br/>As suas oportunidades.
          </p>
          <p style={{fontSize:14,color:G.textMuted,lineHeight:1.7,maxWidth:320}}>
            Gerencie imóveis, clientes e prospecções com inteligência artificial — tudo pensado para o mercado imobiliário português.
          </p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:28}}>
            <Ic n="pt" s={18}/>
            <span style={{fontSize:13,color:G.textDim}}>Adaptado para Portugal · Valores em Euro</span>
          </div>
          {/* Stats decorativos */}
          <div style={{display:"flex",gap:24,justifyContent:"center",marginTop:40}}>
            {[["Lisboa","4.200 €/m²"],["Porto","3.100 €/m²"],["Algarve","3.800 €/m²"]].map(([c,v])=>(
              <div key={c} style={{textAlign:"center"}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:G.gold2}}>{v}</p>
                <p style={{fontSize:11,color:G.textDim}}>{c}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────
const Field = ({label,children}) => <div style={{marginBottom:14}}><label>{label}</label>{children}</div>;

const Modal = ({title,onClose,children,wide}) => (
  <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className={`modal${wide?" modal-wide":""}`}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:600}}>{title}</h2>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:G.textMuted,display:"flex"}}><Ic n="x" s={18}/></button>
      </div>
      {children}
    </div>
  </div>
);

// ── AI helpers ────────────────────────────────────────────────
// ── API Key store (session only) ──────────────────────────────
let _apiKey = "";
const setApiKey = (k) => { _apiKey = k.trim(); };
const getApiKey = () => _apiKey;

const callClaude = async (prompt, model = "claude-sonnet-4-6", useSearch = true) => {
  const key = getApiKey();

  const body = JSON.stringify({
    model: model,
    max_tokens: 2000,
    ...(useSearch ? { tools: [{ type: "web_search_20250305", name: "web_search" }] } : {}),
    messages: [{ role: "user", content: prompt }],
  });

  // ── Estratégia 1: Netlify Function (sem CORS, sem chave no browser) ──
  // Funciona automaticamente quando o CRM está no Netlify
  const isNetlify = window.location.hostname.includes("netlify.app") ||
                    window.location.hostname.includes("netlify.com") ||
                    (window.location.hostname !== "localhost" && !window.location.hostname.includes("claude.ai"));

  if (isNetlify) {
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (data.error) {
        const msg = data.error.message || data.error;
        // Erros de autenticação ou da API — propagar imediatamente
        if (res.status === 401 || msg.toLowerCase().includes("auth") || msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("credit")) {
          throw new Error(`Erro da API Anthropic: ${msg}`);
        }
        throw new Error(msg);
      }
      const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
      if (text) return text;
      throw new Error("Resposta vazia da API.");
    } catch(e) {
      // No Netlify, NÃO tentar a chamada directa (CORS bloqueia sempre)
      // Propagar o erro real para o utilizador ver
      console.error("Netlify function falhou:", e.message);
      throw new Error(`Erro: ${e.message}`);
    }
  }

  // ── Estratégia 2: Chamada directa com chave do utilizador ──
  // Funciona no Claude.ai (sem CORS) ou com backend próprio
  if (!key) throw new Error(
    isNetlify
      ? "Configura a variável ANTHROPIC_API_KEY nas definições do Netlify (Site Settings → Environment Variables)."
      : "Chave de API não configurada. Por favor inicia sessão novamente."
  );

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };

  const API = "https://api.anthropic.com/v1/messages";
  const proxies = [
    API,
    `https://corsproxy.io/?${encodeURIComponent(API)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(API)}`,
    `https://proxy.cors.sh/${API}`,
  ];

  let lastErr = "";
  for (const url of proxies) {
    try {
      const res = await fetch(url, { method:"POST", headers, body });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Resposta inválida."); }
      if (!res.ok || data.error) {
        const msg = data?.error?.message || `HTTP ${res.status}`;
        if (res.status===401 || msg.toLowerCase().includes("auth") || msg.toLowerCase().includes("api key")) {
          throw new Error("Chave de API inválida ou sem créditos. Verifica em console.anthropic.com");
        }
        throw new Error(msg);
      }
      const result = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
      if (!result) throw new Error("Resposta vazia da API.");
      return result;
    } catch(e) {
      if (e.message.includes("Chave de API") || e.message.includes("créditos")) throw e;
      lastErr = e.message;
    }
  }

  throw new Error(
    `Não foi possível ligar à API (CORS). ` +
    `No Netlify, configura a variável ANTHROPIC_API_KEY em Site Settings → Environment Variables. ` +
    `Usa o método "Colar Texto" como alternativa.`
  );
};

const parseJSON = (text) => {
  if (!text) return null;
  // 1. Try clean json block
  const block = text.match(/```json\s*([\s\S]*?)```/);
  if (block) { try { return JSON.parse(block[1].trim()); } catch {} }
  // 2. Try largest {...} block
  const matches = [...text.matchAll(/\{[\s\S]*?\}/g)];
  for (const m of matches.sort((a,b) => b[0].length - a[0].length)) {
    try { const r = JSON.parse(m[0]); if (Object.keys(r).length > 3) return r; } catch {}
  }
  // 3. Try full text as JSON
  try { return JSON.parse(text.trim()); } catch {}
  // 4. Extract key fields manually from text as last resort
  const extract = (key) => {
    const m = text.match(new RegExp(`"${key}"\\s*:\\s*([\\d.]+)`));
    return m ? Number(m[1]) : null;
  };
  const extractStr = (key) => {
    const m = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
    return m ? m[1] : null;
  };
  const vm = extract("valorMedio"), vs = extract("valorSugerido");
  if (vm && vs) {
    return {
      valorMinimo: extract("valorMinimo") || vm * 0.85,
      valorMedio: vm,
      valorMaximo: extract("valorMaximo") || vm * 1.15,
      valorSugerido: vs,
      precoPorM2: extract("precoPorM2") || Math.round(vm / 100),
      tendencia: extractStr("tendencia") || "Estável",
      percentualVariacao: extract("percentualVariacao") || 3,
      avaliacao: extractStr("avaliacao") || "Dentro do mercado",
      diferencaPercent: extract("diferencaPercent") || 0,
      pontosFavoraveis: ["Localização valorizada","Bom estado geral","Boa exposição solar"],
      pontosAtencao: ["Mercado competitivo","Verificar documentação"],
      recomendacao: extractStr("recomendacao") || "Imóvel com potencial interessante para o mercado actual.",
      fontesConsultadas: ["Idealista","Imovirtual"],
      dataAnalise: new Date().toLocaleDateString("pt-PT"),
    };
  }
  return null;
};

// ── Market Modal ──────────────────────────────────────────────
const MarketModal = ({imovel,onClose,onPDF}) => {
  const [loading,setLoad]  = useState(false);
  const [step,setStep]     = useState("");
  const [result,setResult] = useState(null);
  const [error,setError]   = useState("");

  const analyze = async () => {
    setLoad(true); setError(""); setResult(null);
    try {
      setStep("🔍 A pesquisar preços no mercado português...");
      const locFull = [imovel.freguesia, imovel.bairro, imovel.concelho, imovel.cidade, imovel.distrito].filter(Boolean).join(", ");
      const zona = imovel.freguesia || imovel.bairro || imovel.concelho || imovel.cidade;
      const prompt = `És um especialista em avaliação imobiliária em Portugal.
Analisa o mercado para este imóvel e devolve APENAS JSON válido (sem markdown nem texto extra):

IMÓVEL:
- Tipo: ${imovel.tipo}
- Finalidade: ${imovel.finalidade}
- Freguesia: ${imovel.freguesia || "N/A"}
- Zona/Bairro: ${imovel.bairro}
- Concelho: ${imovel.concelho || imovel.cidade}
- Distrito: ${imovel.distrito || imovel.cidade}
- País: Portugal
- Área: ${imovel.area}m²
- Quartos: ${imovel.quartos || 0}
- Valor actual: ${fmtFull(imovel.valor)}

Usa web_search para pesquisar preços reais de imóveis similares. Faz estas pesquisas:
1. "${imovel.tipo} ${zona} ${imovel.finalidade==="Venda"?"venda":"arrendamento"} preço euros 2025 2026 Portugal"
2. "Idealista Imovirtual ${imovel.tipo} ${zona} metro quadrado preço"
3. "mercado imobiliário ${zona} valorização 2025"

Devolve EXATAMENTE este JSON (todos os valores em euros):
{
  "valorMinimo": <número>,
  "valorMedio": <número>,
  "valorMaximo": <número>,
  "valorSugerido": <número>,
  "precoPorM2": <número>,
  "tendencia": "Alta" | "Estável" | "Queda",
  "percentualVariacao": <número>,
  "avaliacao": "Abaixo do mercado" | "Dentro do mercado" | "Acima do mercado",
  "diferencaPercent": <número positivo se acima do sugerido>,
  "pontosFavoraveis": ["ponto1","ponto2","ponto3"],
  "pontosAtencao": ["ponto1","ponto2"],
  "recomendacao": "<2-3 frases com estratégia de preço em português de Portugal>",
  "fontesConsultadas": ["Idealista","Imovirtual"],
  "dataAnalise": "${new Date().toLocaleDateString("pt-PT")}"
}`;
      setStep("🤖 A analisar com IA...");
      const raw = await callClaude(prompt);
      setStep("📊 A processar resultados...");
      const json = parseJSON(raw);
      if (!json || !json.valorMedio) throw new Error("A IA não devolveu dados suficientes. Tenta novamente ou verifica se o bairro/cidade estão corretos.");
      setResult(json);
    } catch(e) { setError(e.message||"Erro na análise. Tente novamente."); }
    finally { setLoad(false); setStep(""); }
  };

  const pos = result ? Math.max(4,Math.min(96,((Number(imovel.valor)-result.valorMinimo)/(result.valorMaximo-result.valorMinimo))*100)) : 50;

  return (
    <Modal title="" onClose={onClose} wide>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,paddingBottom:18,borderBottom:`1px solid ${G.border}`}}>
        <div style={{padding:10,borderRadius:8,background:`${G.purple}20`}}><Ic n="spark" s={20} c={G.purple}/></div>
        <div>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:600}}>Avaliação de Mercado · IA</h2>
          <p style={{fontSize:13,color:G.textMuted,marginTop:2}}>{imovel.titulo} · {imovel.bairro}, {imovel.cidade}</p>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
        {[["Tipo",imovel.tipo],["Área",`${imovel.area} m²`],["Quartos",imovel.quartos||"—"],["Finalidade",imovel.finalidade]].map(([l,v],k)=>(
          <div key={k} style={{background:G.surface2,borderRadius:8,padding:"10px 14px"}}>
            <p style={{fontSize:11,color:G.textDim,marginBottom:4}}>{l}</p>
            <p style={{fontSize:14,fontWeight:500}}>{v}</p>
          </div>
        ))}
      </div>

      {!result&&!loading&&(
        <div style={{textAlign:"center",padding:"44px 20px"}}>
          <div style={{fontSize:52,marginBottom:16}}>🔮</div>
          <p style={{fontSize:16,fontWeight:500,marginBottom:8}}>Análise inteligente de mercado</p>
          <p style={{fontSize:13,color:G.textMuted,marginBottom:28,maxWidth:400,margin:"0 auto 28px"}}>
            A IA pesquisa imóveis similares em Portugal em tempo real e gera uma avaliação completa com sugestão de preço em euros.
          </p>
          <button className="btn-purple" onClick={analyze}><Ic n="spark" s={15} c="#fff"/> Iniciar Análise</button>
        </div>
      )}

      {loading&&(
        <div style={{textAlign:"center",padding:"50px 0"}}>
          <div className="spinner spinner-gold" style={{width:36,height:36,margin:"0 auto 20px",borderWidth:3}}/>
          <p className="pulsing" style={{color:G.gold1,fontSize:14}}>{step}</p>
        </div>
      )}

      {error&&(
        <div style={{background:`${G.red}15`,border:`1px solid ${G.red}40`,borderRadius:8,padding:16,textAlign:"center"}}>
          <p style={{color:G.red,fontSize:14}}>{error}</p>
          <button className="btn-ghost" style={{marginTop:12}} onClick={analyze}>Tentar novamente</button>
        </div>
      )}

      {result&&(
        <div>
          <div className="ai-box" style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <p style={{fontSize:12,color:G.textMuted,marginBottom:4}}>VALOR SUGERIDO PELA IA</p>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:36,fontWeight:700,color:G.gold2}}>{fmtFull(result.valorSugerido)}</p>
                <p style={{fontSize:13,color:G.textMuted}}>{fmtM2(result.precoPorM2)}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <span style={{padding:"6px 14px",borderRadius:20,fontSize:13,fontWeight:500,
                  background:result.avaliacao==="Abaixo do mercado"?`${G.green}20`:result.avaliacao==="Acima do mercado"?`${G.red}20`:`${G.blue}20`,
                  color:result.avaliacao==="Abaixo do mercado"?G.green:result.avaliacao==="Acima do mercado"?G.red:G.blue
                }}>{result.avaliacao}</span>
                <p style={{fontSize:12,color:G.textMuted,marginTop:8}}>
                  Valor actual: {fmtFull(imovel.valor)}
                  {result.diferencaPercent>0&&<span style={{color:G.red}}> ({result.diferencaPercent.toFixed(1)}% acima)</span>}
                  {result.diferencaPercent<0&&<span style={{color:G.green}}> ({Math.abs(result.diferencaPercent).toFixed(1)}% abaixo)</span>}
                </p>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:G.textDim,marginBottom:6}}>
              <span>Mín: {fmtFull(result.valorMinimo)}</span><span>Máx: {fmtFull(result.valorMaximo)}</span>
            </div>
            <div className="price-bar"><div className="price-indicator" style={{left:`${pos}%`}}/></div>
            <p style={{fontSize:11,color:G.textDim,textAlign:"center",marginTop:8}}>▲ Posição do imóvel no mercado</p>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
            {[
              {l:"Tendência",v:result.tendencia,sub:`${result.percentualVariacao>0?"+":""}${result.percentualVariacao}% ao ano`,e:result.tendencia==="Alta"?"📈":result.tendencia==="Queda"?"📉":"➡️",c:result.tendencia==="Alta"?G.green:result.tendencia==="Queda"?G.red:G.textMuted},
              {l:"Média de Mercado",v:fmtFull(result.valorMedio),sub:fmtM2(result.precoPorM2),c:G.gold1},
              {l:"Data da Análise",v:result.dataAnalise,sub:"Dados em tempo real",c:G.text},
            ].map((m,i)=>(
              <div key={i} className="ai-section" style={{textAlign:"center"}}>
                <p style={{fontSize:11,color:G.textDim,marginBottom:6}}>{m.l}</p>
                {m.e&&<p style={{fontSize:20}}>{m.e}</p>}
                <p style={{fontSize:m.e?14:16,fontWeight:500,color:m.c}}>{m.v}</p>
                <p style={{fontSize:12,color:G.textMuted}}>{m.sub}</p>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div className="ai-section">
              <p style={{fontSize:12,color:G.green,fontWeight:500,marginBottom:10}}>✦ Pontos Favoráveis</p>
              {(result.pontosFavoraveis||[]).map((p,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:6}}><span style={{color:G.green,fontSize:12,marginTop:1}}>✓</span><span style={{fontSize:13,color:G.textMuted}}>{p}</span></div>
              ))}
            </div>
            <div className="ai-section">
              <p style={{fontSize:12,color:"#E0A052",fontWeight:500,marginBottom:10}}>⚠ Pontos de Atenção</p>
              {(result.pontosAtencao||[]).map((p,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:6}}><span style={{color:"#E0A052",fontSize:12,marginTop:1}}>!</span><span style={{fontSize:13,color:G.textMuted}}>{p}</span></div>
              ))}
            </div>
          </div>

          <div className="ai-section" style={{marginBottom:16,borderLeft:`3px solid ${G.gold1}`}}>
            <p style={{fontSize:12,color:G.gold1,fontWeight:500,marginBottom:8}}>💡 Recomendação Estratégica</p>
            <p style={{fontSize:13,color:G.textMuted,lineHeight:1.6}}>{result.recomendacao}</p>
          </div>

          {result.fontesConsultadas?.length>0&&<p style={{fontSize:11,color:G.textDim,marginBottom:16}}>Fontes: {result.fontesConsultadas.join(" · ")}</p>}

          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button className="btn-ghost" onClick={onClose}>Fechar</button>
            <button className="btn-gold" onClick={()=>onPDF(imovel,result)}><Ic n="pdf" s={14} c="#0E0E0F"/> Exportar PDF</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── PDF ───────────────────────────────────────────────────────
const generatePDF = (imovel,analise) => {
  const pos = Math.max(4,Math.min(96,((Number(imovel.valor)-analise.valorMinimo)/(analise.valorMaximo-analise.valorMinimo))*100));
  const win = window.open("","_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Relatório Magna — ${imovel.titulo}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;color:#1a1a1a;background:#fff}
.page{max-width:800px;margin:0 auto;padding:50px}
.header{background:linear-gradient(135deg,#1a1a1a,#2d2408);color:#fff;padding:40px 50px;margin:-50px -50px 40px;border-bottom:3px solid #C9A84C}
.logo-name{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:700;color:#C9A84C;letter-spacing:2px}
.logo-sub{font-size:10px;color:#888;letter-spacing:3px;text-transform:uppercase;margin-top:3px}
.report-title{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:600;margin:20px 0 6px;color:#fff}
.report-meta{font-size:13px;color:#aaa}
h2{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#8B6914;border-bottom:1.5px solid #C9A84C;padding-bottom:8px;margin:32px 0 18px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px}
.box{background:#f9f7f1;border-radius:8px;padding:14px 16px;border-left:3px solid #C9A84C}
.lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.val{font-size:15px;font-weight:500}
.val-big{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:700;color:#8B6914}
.highlight{background:linear-gradient(135deg,#fdf8ed,#fff9e6);border:1px solid #C9A84C50;border-radius:10px;padding:24px;text-align:center;margin-bottom:20px}
.tag{display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:500;margin-top:10px}
.bar{height:8px;border-radius:4px;background:linear-gradient(90deg,#4caf50,#C9A84C,#ef5350);position:relative;margin:8px 0}
.dot{position:absolute;top:-5px;width:18px;height:18px;border-radius:50%;background:#C9A84C;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.25);transform:translateX(-50%)}
.pt{display:flex;gap:10px;margin-bottom:8px;align-items:flex-start;font-size:13px;color:#555;line-height:1.5}
.rec{background:#fff8e1;border-left:4px solid #C9A84C;border-radius:0 8px 8px 0;padding:16px 18px;font-size:13px;color:#444;line-height:1.7}
.footer{margin-top:50px;padding-top:18px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="page">
<div class="header">
  <div style="display:flex;align-items:center;gap:16px">
    <svg width="44" height="38" viewBox="0 0 80 70"><defs><linearGradient id="g"><stop offset="0%" stop-color="#8B6914"/><stop offset="50%" stop-color="#E8C96A"/><stop offset="100%" stop-color="#C9A84C"/></linearGradient></defs><path d="M5 65 L5 30 L25 10 L40 25 L55 10 L75 30 L75 65" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 65 L20 45 L40 25 L60 45 L60 65" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div><div class="logo-name">MAGNA</div><div class="logo-sub">Group Real Estate · Portugal</div></div>
  </div>
  <div class="report-title">Relatório de Avaliação de Mercado</div>
  <div class="report-meta">${imovel.titulo} · ${imovel.bairro}, ${imovel.cidade} · ${analise.dataAnalise}</div>
</div>

<h2>Dados do Imóvel</h2>
<div class="grid4">
${[["Tipo",imovel.tipo],["Finalidade",imovel.finalidade],["Área",`${imovel.area} m²`],["Quartos",imovel.quartos||"—"],["Zona",imovel.bairro],["Cidade",imovel.cidade],["Estado",imovel.status],["Valor Actual",fmtFull(imovel.valor)]].map(([l,v])=>`<div class="box"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join("")}
</div>

<h2>Avaliação de Mercado</h2>
<div class="highlight">
  <div class="lbl">VALOR SUGERIDO PELA IA</div>
  <div class="val-big">${fmtFull(analise.valorSugerido)}</div>
  <div style="font-size:13px;color:#888;margin-top:4px">${fmtM2(analise.precoPorM2)}</div>
  <div><span class="tag" style="background:${analise.avaliacao==="Abaixo do mercado"?"#e8f5e9;color:#2e7d32":analise.avaliacao==="Acima do mercado"?"#ffebee;color:#c62828":"#e3f2fd;color:#1565c0"}">${analise.avaliacao}</span></div>
</div>
<div class="grid3" style="margin-bottom:20px">
  <div class="box"><div class="lbl">Mínimo</div><div class="val" style="color:#8B6914">${fmtFull(analise.valorMinimo)}</div></div>
  <div class="box"><div class="lbl">Médio</div><div class="val" style="color:#8B6914">${fmtFull(analise.valorMedio)}</div></div>
  <div class="box"><div class="lbl">Máximo</div><div class="val" style="color:#8B6914">${fmtFull(analise.valorMaximo)}</div></div>
</div>
<div style="margin-bottom:24px">
  <div style="display:flex;justify-content:space-between;font-size:11px;color:#888;margin-bottom:6px"><span>Mín</span><span>Máx</span></div>
  <div class="bar"><div class="dot" style="left:${pos}%"></div></div>
  <div style="text-align:center;font-size:11px;color:#999;margin-top:6px">Posição do imóvel no mercado</div>
</div>

<h2>Tendências e Análise</h2>
<div class="grid3">
  <div class="box"><div class="lbl">Tendência</div><div class="val">${analise.tendencia} (${analise.percentualVariacao>0?"+":""}${analise.percentualVariacao}%/ano)</div></div>
  <div class="box"><div class="lbl">Diferença s/ Mercado</div><div class="val" style="color:${analise.diferencaPercent>0?"#c62828":"#2e7d32"}">${analise.diferencaPercent>0?"+":""}${(analise.diferencaPercent||0).toFixed(1)}%</div></div>
  <div class="box"><div class="lbl">Preço/m²</div><div class="val" style="color:#8B6914">${fmtM2(analise.precoPorM2)}</div></div>
</div>

<h2>Avaliação Detalhada</h2>
<div class="grid2">
  <div>
    <p style="font-size:13px;font-weight:500;color:#2e7d32;margin-bottom:10px">✦ Pontos Favoráveis</p>
    ${(analise.pontosFavoraveis||[]).map(p=>`<div class="pt"><span style="color:#4caf50;font-size:12px;margin-top:1px">✓</span>${p}</div>`).join("")}
  </div>
  <div>
    <p style="font-size:13px;font-weight:500;color:#ff9800;margin-bottom:10px">⚠ Pontos de Atenção</p>
    ${(analise.pontosAtencao||[]).map(p=>`<div class="pt"><span style="color:#ff9800;font-size:12px;margin-top:1px">!</span>${p}</div>`).join("")}
  </div>
</div>

<h2>Recomendação Estratégica</h2>
<div class="rec">💡 ${analise.recomendacao}</div>

${analise.fontesConsultadas?.length?`<p style="font-size:11px;color:#999;margin-top:16px">Fontes consultadas: ${analise.fontesConsultadas.join(" · ")}</p>`:""}

<div class="footer">
  <strong>MAGNA Group Real Estate · Portugal</strong><br>
  Relatório gerado automaticamente com Inteligência Artificial e dados de mercado em tempo real · ${analise.dataAnalise}<br>
  <em>Este relatório é uma estimativa e não substitui uma avaliação presencial por perito certificado.</em>
</div>
</div><script>window.print();window.onafterprint=()=>window.close();</script></body></html>`);
  win.document.close();
};

// ── Prospection Panel ─────────────────────────────────────────
// ── GESTÃO DE UTILIZADORES ────────────────────────────────────
const cargos = ["Diretor","Diretor Comercial","Consultora","Consultor","Gestor de Clientes","Administrativo"];
const emptyU = {nome:"",email:"",password:"",cargo:"Consultor",role:"agente",avatar:""};

// ── ANGARIAÇÕES ───────────────────────────────────────────────
const emptyAng = {
  // Proprietário
  propNome:"", propNif:"", propEmail:"", propTelefone:"", propMorada:"",
  // Imóvel
  tipo:"Apartamento", finalidade:"Venda", valor:"", valorRenda:"",
  area:"", quartos:"", casasBanho:"", descricao:"",
  distrito:"", concelho:"", freguesia:"", morada:"",
  // Contrato
  tipoMandato:"Exclusivo", comissao:"5", prazo:"6",
  dataInicio: new Date().toISOString().split("T")[0],
  // Estado
  estado:"Rascunho",
};

// Signature pad component
const SignaturePad = ({ label, onSave, saved }) => {
  const canvasRef = React.useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const start = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setHasStrokes(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = G.text;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const end = (e) => { e.preventDefault(); setDrawing(false); };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div style={{marginBottom:20}}>
      <p style={{fontSize:12,color:G.textMuted,marginBottom:8,letterSpacing:".3px"}}>{label}</p>
      {saved ? (
        <div style={{border:`2px solid ${G.green}`,borderRadius:8,padding:12,background:`${G.green}08`,display:"flex",alignItems:"center",gap:12}}>
          <img src={saved} alt="Assinatura" style={{height:50,background:"transparent",filter:"invert(1)"}}/>
          <div style={{flex:1}}>
            <p style={{fontSize:13,color:G.green,fontWeight:500}}>✓ Assinatura registada</p>
            <p style={{fontSize:11,color:G.textDim}}>{new Date().toLocaleString("pt-PT")}</p>
          </div>
          <button onClick={()=>onSave(null)} className="btn-ghost" style={{padding:"6px 12px",fontSize:12}}>Repetir</button>
        </div>
      ) : (
        <div>
          <div style={{border:`1px dashed ${G.border}`,borderRadius:8,background:G.surface2,position:"relative",touchAction:"none"}}>
            <canvas ref={canvasRef} width={600} height={150}
              style={{width:"100%",height:150,display:"block",borderRadius:8,cursor:"crosshair"}}
              onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
              onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
            />
            {!hasStrokes && (
              <p style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:G.textDim,fontSize:13,pointerEvents:"none",whiteSpace:"nowrap"}}>
                ✍️ Assine aqui com o dedo ou rato
              </p>
            )}
          </div>
          <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"flex-end"}}>
            <button className="btn-ghost" style={{padding:"7px 14px",fontSize:12}} onClick={clear}>Limpar</button>
            <button className="btn-gold" style={{padding:"7px 14px",fontSize:12}} onClick={save} disabled={!hasStrokes}>
              <Ic n="check" s={13} c="#0E0E0F"/> Confirmar Assinatura
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Generate Angariação PDF
const gerarPDFAngariacao = (ang, sigProp, sigAgente, agente) => {
  const win = window.open("","_blank");
  const hoje = new Date().toLocaleDateString("pt-PT");
  const dataFim = new Date(ang.dataInicio);
  dataFim.setMonth(dataFim.getMonth() + Number(ang.prazo));

  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Mandato de Mediação — ${ang.propNome}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;color:#1a1a1a;background:#fff;font-size:14px;line-height:1.6}
.page{max-width:780px;margin:0 auto;padding:50px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #C9A84C}
.logo-name{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#8B6914;letter-spacing:2px}
.logo-sub{font-size:10px;color:#888;letter-spacing:3px;text-transform:uppercase;margin-top:3px}
.title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;text-align:right;color:#1a1a1a}
.badge{display:inline-block;background:#8B6914;color:#fff;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:500;margin-top:4px}
h2{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#8B6914;border-bottom:1px solid #e8d5a0;padding-bottom:6px;margin:24px 0 14px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:8px}
.field{padding:10px 14px;background:#f9f7f1;border-radius:6px;border-left:3px solid #C9A84C}
.field-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.field-value{font-size:14px;font-weight:500;color:#1a1a1a}
.clausula{margin-bottom:16px;padding:14px 16px;background:#fafafa;border-radius:6px;border:1px solid #eee}
.clausula-num{font-size:12px;font-weight:600;color:#8B6914;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
.clausula p{font-size:13px;color:#444;line-height:1.7}
.sig-area{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px}
.sig-box{text-align:center}
.sig-img{height:70px;display:block;margin:0 auto 8px;max-width:220px}
.sig-line{border-top:1px solid #333;padding-top:8px;font-size:12px;color:#555}
.footer{margin-top:36px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#999;text-align:center}
.highlight{background:linear-gradient(135deg,#fdf8ed,#fff9e6);border:1px solid #C9A84C50;border-radius:8px;padding:16px;margin:16px 0}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="page">

<div class="header">
  <div>
    <svg width="44" height="38" viewBox="0 0 80 70"><defs><linearGradient id="g"><stop offset="0%" stop-color="#8B6914"/><stop offset="100%" stop-color="#C9A84C"/></linearGradient></defs><path d="M5 65 L5 30 L25 10 L40 25 L55 10 L75 30 L75 65" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 65 L20 45 L40 25 L60 45 L60 65" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="logo-name">MAGNA</div>
    <div class="logo-sub">Group Real Estate · Portugal</div>
  </div>
  <div style="text-align:right">
    <div class="title">Contrato de Mediação Imobiliária</div>
    <div><span class="badge">${ang.tipoMandato.toUpperCase()}</span></div>
    <div style="font-size:12px;color:#888;margin-top:6px">Data: ${hoje} · Ref: MG-${Date.now().toString().slice(-6)}</div>
  </div>
</div>

<h2>1. Identificação das Partes</h2>
<p style="font-size:13px;color:#555;margin-bottom:12px"><strong>MEDIADORA:</strong> Magna Group Real Estate, Lda · Agente: ${agente.nome} · Cargo: ${agente.cargo}</p>
<div class="grid2">
  ${[["Nome do Proprietário",ang.propNome],["NIF",ang.propNif],["E-mail",ang.propEmail],["Telefone",ang.propTelefone]].map(([l,v])=>`<div class="field"><div class="field-label">${l}</div><div class="field-value">${v||"—"}</div></div>`).join("")}
  <div class="field" style="grid-column:1/-1"><div class="field-label">Morada</div><div class="field-value">${ang.propMorada||"—"}</div></div>
</div>

<h2>2. Identificação do Imóvel</h2>
<div class="grid3">
  ${[["Tipo",ang.tipo],["Finalidade",ang.finalidade],["Área",`${ang.area} m²`],["Quartos",ang.quartos||"N/A"],["WC",ang.casasBanho||"N/A"],["Valor",`${Number(ang.valor).toLocaleString("pt-PT")} €`]].map(([l,v])=>`<div class="field"><div class="field-label">${l}</div><div class="field-value">${v}</div></div>`).join("")}
</div>
<div class="grid2" style="margin-top:10px">
  ${[["Distrito",ang.distrito],["Concelho",ang.concelho],["Freguesia",ang.freguesia||"—"],["Morada do Imóvel",ang.morada||"—"]].map(([l,v])=>`<div class="field"><div class="field-label">${l}</div><div class="field-value">${v||"—"}</div></div>`).join("")}
</div>
${ang.descricao?`<div class="field" style="margin-top:10px"><div class="field-label">Descrição</div><div class="field-value" style="font-size:13px;color:#555">${ang.descricao}</div></div>`:""}

<h2>3. Condições do Mandato</h2>
<div class="highlight">
<div class="grid3">
  ${[["Tipo de Mandato",ang.tipoMandato],["Comissão",`${ang.comissao}% + IVA`],["Prazo",`${ang.prazo} meses`],["Data de Início",new Date(ang.dataInicio).toLocaleDateString("pt-PT")],["Data de Fim",dataFim.toLocaleDateString("pt-PT")],["Valor do Imóvel",`${Number(ang.valor).toLocaleString("pt-PT")} €`]].map(([l,v])=>`<div class="field"><div class="field-label">${l}</div><div class="field-value">${v}</div></div>`).join("")}
</div>
</div>

<h2>4. Cláusulas</h2>
<div class="clausula"><div class="clausula-num">Cláusula 1ª — Objecto</div><p>O PROPRIETÁRIO confere à MEDIADORA o mandato ${ang.tipoMandato === "Exclusivo" ? "em regime de exclusividade" : "não exclusivo"} para a mediação imobiliária do imóvel acima identificado, pelo valor de <strong>${Number(ang.valor).toLocaleString("pt-PT")} €</strong>.</p></div>
<div class="clausula"><div class="clausula-num">Cláusula 2ª — Remuneração</div><p>A remuneração da MEDIADORA é de <strong>${ang.comissao}% sobre o valor de venda, acrescido de IVA à taxa legal em vigor</strong>, sendo devida no momento da assinatura do contrato promessa de compra e venda ou equivalente.</p></div>
<div class="clausula"><div class="clausula-num">Cláusula 3ª — Prazo</div><p>O presente contrato tem a duração de <strong>${ang.prazo} meses</strong>, com início em ${new Date(ang.dataInicio).toLocaleDateString("pt-PT")} e termo em ${dataFim.toLocaleDateString("pt-PT")}, renovando-se automaticamente por iguais períodos salvo denúncia por qualquer das partes.</p></div>
<div class="clausula"><div class="clausula-num">Cláusula 4ª — Obrigações da Mediadora</div><p>A MEDIADORA obriga-se a promover o imóvel nos canais adequados, a realizar visitas, a apresentar propostas ao PROPRIETÁRIO e a acompanhar todo o processo até à conclusão do negócio.</p></div>
${ang.tipoMandato==="Exclusivo"?`<div class="clausula"><div class="clausula-num">Cláusula 5ª — Exclusividade</div><p>Em regime de exclusividade, o PROPRIETÁRIO obriga-se a não celebrar contratos de mediação com outras entidades durante a vigência deste contrato. Caso o negócio seja concluído por intervenção direta do PROPRIETÁRIO ou de terceiro, a remuneração acordada será igualmente devida.</p></div>`:""}

<div class="sig-area">
  <div class="sig-box">
    <p style="font-size:12px;color:#888;margin-bottom:8px">O Proprietário</p>
    ${sigProp?`<img src="${sigProp}" class="sig-img" alt="Assinatura Proprietário"/>`:`<div style="height:70px;border-bottom:1px solid #333;margin-bottom:8px"></div>`}
    <div class="sig-line">${ang.propNome}<br/><span style="color:#888">NIF: ${ang.propNif}</span></div>
  </div>
  <div class="sig-box">
    <p style="font-size:12px;color:#888;margin-bottom:8px">Pela Mediadora</p>
    ${sigAgente?`<img src="${sigAgente}" class="sig-img" alt="Assinatura Agente"/>`:`<div style="height:70px;border-bottom:1px solid #333;margin-bottom:8px"></div>`}
    <div class="sig-line">${agente.nome}<br/><span style="color:#888">${agente.cargo} · Magna Group Real Estate</span></div>
  </div>
</div>

<div class="footer">
  Magna Group Real Estate · Contrato gerado em ${hoje} · Este documento tem validade legal quando devidamente assinado por ambas as partes.
</div>
</div><script>window.print();window.onafterprint=()=>window.close();</script></body></html>`);
  win.document.close();
};

// Main Angariações component
const AngariacaoDetalhe = ({ang,user,onClose,onEdit,onDelete,onImportar,onPDF,mob}) => {
  const a = ang;
  const estadoCor = { "Rascunho":G.textDim, "Pendente":G.blue, "Assinado":G.green, "Cancelado":G.red };
  const loc = [a.freguesia,a.concelho,a.distrito].filter(Boolean).join(", ") || "—";
  const podeEditar = a.estado !== "Assinado";
  const tipoIcons = {"Apartamento":"🏙️","Moradia":"🏡","Terreno":"🌿","Comercial":"🏢","Escritório":"🏢","Garagem":"🏗️"};
  return (
    <Modal title="" onClose={onClose}>
      {/* Cabeçalho */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,paddingBottom:16,borderBottom:`1px solid ${G.border}`}}>
        <div style={{width:54,height:54,borderRadius:12,background:`${G.gold1}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>{tipoIcons[a.tipo]||"📋"}</div>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?20:24,fontWeight:600,marginBottom:4}}>{a.propNome}</h2>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:11,padding:"2px 10px",borderRadius:10,background:`${estadoCor[a.estado]||G.textDim}20`,color:estadoCor[a.estado]||G.textDim,fontWeight:600}}>{a.estado}</span>
            <span className="tag" style={{background:G.surface3,color:G.textMuted}}>{a.tipoMandato}</span>
            <span className="tag" style={{background:G.surface3,color:G.textMuted}}>{a.tipo}</span>
          </div>
        </div>
      </div>

      {/* Valor + Comissão destacados */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div style={{background:`linear-gradient(135deg,${G.gold1}10,${G.goldDark}05)`,border:`1px solid ${G.gold1}30`,borderRadius:10,padding:"14px 16px"}}>
          <p style={{fontSize:10,color:G.textDim,marginBottom:3,textTransform:"uppercase",letterSpacing:".3px"}}>Valor</p>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?20:24,fontWeight:700,color:G.gold1}}>{fmtFull(a.valor)}</p>
          <p style={{fontSize:11,color:G.textDim}}>{a.finalidade==="Arrendamento"?"por mês":a.finalidade}</p>
        </div>
        <div style={{background:G.surface2,borderRadius:10,padding:"14px 16px"}}>
          <p style={{fontSize:10,color:G.textDim,marginBottom:3,textTransform:"uppercase",letterSpacing:".3px"}}>Comissão</p>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?20:24,fontWeight:700,color:G.green}}>{a.comissao}%</p>
          <p style={{fontSize:11,color:G.textDim}}>+ IVA · {a.prazo} meses</p>
        </div>
      </div>

      {/* Proprietário */}
      <p style={{fontSize:11,color:G.gold1,marginBottom:8,textTransform:"uppercase",letterSpacing:".5px",fontWeight:500}}>👤 Proprietário</p>
      <div style={{background:G.surface2,borderRadius:8,padding:"12px 14px",marginBottom:14,display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10}}>
        {[["NIF",a.propNif],["Telefone",a.propTelefone],["E-mail",a.propEmail],["Morada",a.propMorada]].map(([l,v])=>(
          <div key={l}><p style={{fontSize:10,color:G.textDim,marginBottom:2,textTransform:"uppercase",letterSpacing:".3px"}}>{l}</p><p style={{fontSize:13,color:G.text,wordBreak:"break-word"}}>{v||"—"}</p></div>
        ))}
      </div>

      {/* Imóvel */}
      <p style={{fontSize:11,color:G.gold1,marginBottom:8,textTransform:"uppercase",letterSpacing:".5px",fontWeight:500}}>🏠 Imóvel</p>
      <div style={{background:G.surface2,borderRadius:8,padding:"12px 14px",marginBottom:14}}>
        <p style={{fontSize:13,color:G.text,marginBottom:8}}>📍 {loc}</p>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:8}}>
          {[["Área",a.area?`${a.area} m²`:"—"],["Quartos",a.quartos||"—"],["WC",a.casasBanho||"—"],["Tipo",a.tipo]].map(([l,v])=>(
            <div key={l}><p style={{fontSize:10,color:G.textDim,marginBottom:2,textTransform:"uppercase",letterSpacing:".3px"}}>{l}</p><p style={{fontSize:13,fontWeight:500}}>{v}</p></div>
          ))}
        </div>
        {a.descricao && <p style={{fontSize:12,color:G.textMuted,marginTop:10,paddingTop:10,borderTop:`1px solid ${G.border}`,lineHeight:1.6}}>{a.descricao}</p>}
      </div>

      {/* Datas */}
      <p style={{fontSize:11,color:G.gold1,marginBottom:8,textTransform:"uppercase",letterSpacing:".5px",fontWeight:500}}>📅 Mandato</p>
      <div style={{background:G.surface2,borderRadius:8,padding:"12px 14px",marginBottom:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><p style={{fontSize:10,color:G.textDim,marginBottom:2,textTransform:"uppercase",letterSpacing:".3px"}}>Início</p><p style={{fontSize:13,fontWeight:500}}>{a.dataInicio?new Date(a.dataInicio).toLocaleDateString("pt-PT"):"—"}</p></div>
        <div><p style={{fontSize:10,color:G.textDim,marginBottom:2,textTransform:"uppercase",letterSpacing:".3px"}}>Duração</p><p style={{fontSize:13,fontWeight:500}}>{a.prazo} meses</p></div>
      </div>

      {/* Assinaturas se assinada */}
      {a.estado === "Assinado" && (a.sigProp || a.sigAgente) && (
        <>
          <p style={{fontSize:11,color:G.green,marginBottom:8,textTransform:"uppercase",letterSpacing:".5px",fontWeight:500}}>✓ Assinaturas</p>
          <div style={{background:`${G.green}08`,border:`1px solid ${G.green}30`,borderRadius:8,padding:"12px 14px",marginBottom:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{textAlign:"center"}}>
              <p style={{fontSize:10,color:G.textDim,marginBottom:4}}>Proprietário</p>
              {a.sigProp ? <img src={a.sigProp} alt="" style={{maxHeight:50,maxWidth:"100%",filter:"invert(1)"}}/> : <p style={{fontSize:12,color:G.textDim}}>—</p>}
            </div>
            <div style={{textAlign:"center"}}>
              <p style={{fontSize:10,color:G.textDim,marginBottom:4}}>Agente</p>
              {a.sigAgente ? <img src={a.sigAgente} alt="" style={{maxHeight:50,maxWidth:"100%",filter:"invert(1)"}}/> : <p style={{fontSize:12,color:G.textDim}}>—</p>}
            </div>
          </div>
        </>
      )}

      {/* Ações */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",borderTop:`1px solid ${G.border}`,paddingTop:16}}>
        <button className="btn-gold" onClick={onPDF} style={{flex:mob?"1 1 100%":1}}><Ic n="pdf" s={14} c="#0E0E0F"/>Gerar PDF</button>
        {a.estado === "Assinado" && onImportar && <button className="btn-ghost" onClick={onImportar} style={{flex:mob?1:"none",borderColor:`${G.purple}40`,color:G.purple}}>🏠 Importar para Imóveis</button>}
        {podeEditar && <button className="btn-ghost" onClick={onEdit} style={{flex:mob?1:"none"}}><Ic n="edit" s={14} c={G.textMuted}/>Editar</button>}
        <button className="btn-ghost" onClick={onDelete} style={{flex:mob?1:"none",borderColor:`${G.red}40`,color:G.red}}><Ic n="trash" s={14} c={G.red}/>Eliminar</button>
      </div>
    </Modal>
  );
};

const Angariações = ({user, mob, setImoveis, setPage}) => {
  const [lista, setLista]         = useState([]);
  const [step, setStep]           = useState("lista"); // lista | form | assinar | preview
  const [form, setForm]           = useState(emptyAng);
  const [editId, setEditId]       = useState(null);
  const [sigProp, setSigProp]     = useState(null);
  const [sigAgente, setSigAgente] = useState(null);
  const [filtro, setFiltro]       = useState("Todos");
  const [importado, setImportado] = useState(false);
  const [detailAng, setDetailAng] = useState(null);

  // Carregar angariações da BD
  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      try { const data = await dbAngariacoes.list(); setLista(data); }
      catch (e) { console.error("load angariacoes:", e); }
    })();
  }, []);

  // Helper: guardar uma angariação na BD
  const saveToDB = async (item) => {
    if (!dbReady) return item;
    try {
      if (item.id && typeof item.id === "number" && item.id < 1e12) {
        // ID curto = veio da BD, é update
        return await dbAngariacoes.update(item.id, item);
      } else {
        // ID grande (Date.now) = novo, é insert
        const { id: tempId, ...rest } = item;
        return await dbAngariacoes.insert(rest);
      }
    } catch (e) {
      console.error("save angariacao:", e);
      alert("Erro ao guardar: " + e.message);
      return item;
    }
  };

  const removeFromDB = async (id) => {
    if (!dbReady) return;
    try { await dbAngariacoes.remove(id); }
    catch (e) { console.error("remove angariacao:", e); alert("Erro: " + e.message); }
  };

  const importarParaImoveis = () => {
    const fotoMap = {"Apartamento":"🏙️","Moradia":"🏡","Terreno":"🌿","Comercial":"🏢","Escritório":"🏢","Garagem":"🏗️"};
    const novoImovel = {
      id: Date.now(),
      titulo: `${form.tipo} - ${form.propNome}`,
      tipo: form.tipo,
      finalidade: form.finalidade,
      status: "Disponível",
      valor: Number(form.valor),
      area: Number(form.area) || 0,
      quartos: Number(form.quartos) || 0,
      casasBanho: Number(form.casasBanho) || 0,
      bairro: form.morada || form.freguesia || form.concelho,
      distrito: form.distrito,
      concelho: form.concelho,
      freguesia: form.freguesia,
      cidade: form.concelho,
      morada: form.morada,
      descricao: form.descricao,
      foto: fotoMap[form.tipo] || "🏠",
      // Referência à angariação
      angariacao: { propNome: form.propNome, propNif: form.propNif, comissao: form.comissao, tipoMandato: form.tipoMandato },
    };
    setImoveis(prev => [novoImovel, ...prev]);
    setImportado(true);
  };

  const estadoCor = { "Rascunho":G.textDim, "Pendente":G.blue, "Assinado":G.green, "Cancelado":G.red };
  const estadosBadge = ["Todos","Rascunho","Pendente","Assinado"];

  const nova = () => { setForm(emptyAng); setEditId(null); setSigProp(null); setSigAgente(null); setImportado(false); setStep("form"); };
  const editar = (a) => { setForm(a); setEditId(a.id); setSigProp(a.sigProp||null); setSigAgente(a.sigAgente||null); setStep("form"); };

  const guardar = async (irAssinar=false) => {
    if (!form.propNome || !form.distrito || !form.valor) return;
    const isNew = !editId;
    const item = {...form, sigProp, sigAgente, dataModif: new Date().toISOString()};
    if (!isNew) item.id = editId;
    // Guardar na BD
    const saved = await saveToDB(item);
    if (isNew) setLista(p=>[saved, ...p]);
    else setLista(p=>p.map(a=>a.id===editId?saved:a));
    setEditId(saved.id);
    setForm(saved);
    if (irAssinar) setStep("assinar");
    else setStep("lista");
  };

  const concluirAssinatura = async () => {
    const item = {...form, id: editId, sigProp, sigAgente, estado:"Assinado", dataModif: new Date().toISOString()};
    const saved = await saveToDB(item);
    setLista(p=>p.map(a=>a.id===item.id?saved:a));
    setForm(saved);
    setStep("preview");
  };

  const filtered = lista.filter(a => filtro==="Todos" ? true : a.estado===filtro);

  // ── LISTA ──
  if (step==="lista") return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:mob?16:24}}>
        <div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?22:28,fontWeight:600}}>Angariações</h1>
          <p style={{color:G.textMuted,fontSize:12,marginTop:2}}>{lista.length} contratos</p>
        </div>
        <button className="btn-gold" style={{padding:mob?"9px 14px":"10px 22px",fontSize:12}} onClick={nova}>
          <Ic n="plus" s={14} c="#0E0E0F"/>{mob?"Nova":"Nova Angariação"}
        </button>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {estadosBadge.map(f=>(
          <button key={f} onClick={()=>setFiltro(f)} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${filtro===f?G.gold1:G.border}`,background:filtro===f?G.gold1+"15":"transparent",color:filtro===f?G.gold1:G.textMuted,cursor:"pointer",fontSize:12}}>{f}</button>
        ))}
      </div>

      {filtered.length===0 && (
        <div style={{textAlign:"center",padding:"60px 20px",color:G.textDim}}>
          <div style={{fontSize:48,marginBottom:16}}>📋</div>
          <p style={{fontSize:16,fontWeight:500,marginBottom:8,color:G.text}}>Sem angariações</p>
          <p style={{fontSize:13,marginBottom:24}}>Cria a tua primeira ficha de angariação</p>
          <button className="btn-gold" onClick={nova}><Ic n="plus" s={14} c="#0E0E0F"/>Nova Angariação</button>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(a=>(
          <div key={a.id} className="card" style={{display:"flex",alignItems:"center",gap:16,cursor:"pointer"}} onClick={()=>setDetailAng(a)}>
            <div style={{width:44,height:44,borderRadius:8,background:`${G.gold1}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22}}>
              {a.tipo==="Apartamento"?"🏙️":a.tipo==="Moradia"?"🏡":a.tipo==="Comercial"?"🏢":"🏠"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <p style={{fontWeight:500,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.propNome}</p>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`${estadoCor[a.estado]||G.textDim}20`,color:estadoCor[a.estado]||G.textDim,fontWeight:600,flexShrink:0}}>{a.estado}</span>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:G.surface3,color:G.textDim,flexShrink:0}}>{a.tipoMandato}</span>
              </div>
              <p style={{fontSize:12,color:G.textMuted}}>{a.tipo} · {a.freguesia||a.concelho}, {a.distrito} · {Number(a.valor).toLocaleString("pt-PT")} € · {a.comissao}%</p>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
              {a.estado!=="Assinado" && (
                <button onClick={()=>editar(a)} style={{background:`${G.gold1}15`,border:`1px solid ${G.gold1}30`,borderRadius:7,padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,color:G.gold1,fontFamily:"'DM Sans',sans-serif"}}>
                  <Ic n="edit" s={13} c={G.gold1}/>{!mob&&"Editar"}
                </button>
              )}
              <button onClick={()=>gerarPDFAngariacao(a,a.sigProp,a.sigAgente,user)} style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:7,padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,color:G.textMuted,fontFamily:"'DM Sans',sans-serif"}}>
                <Ic n="pdf" s={13} c={G.textMuted}/>{!mob&&"PDF"}
              </button>
              <button onClick={async()=>{if(!confirm("Eliminar esta angariação?"))return; await removeFromDB(a.id); setLista(p=>p.filter(x=>x.id!==a.id));}} style={{background:"none",border:`1px solid ${G.border}`,borderRadius:7,padding:"8px 10px",cursor:"pointer",display:"flex"}}>
                <Ic n="trash" s={13} c={G.red}/>
              </button>
            </div>
          </div>
        ))}
      </div>
      {detailAng && <AngariacaoDetalhe ang={detailAng} user={user} mob={mob} onClose={()=>setDetailAng(null)} onEdit={()=>{editar(detailAng);setDetailAng(null);}} onPDF={()=>gerarPDFAngariacao(detailAng,detailAng.sigProp,detailAng.sigAgente,user)} onDelete={async()=>{if(!confirm("Eliminar esta angariação?"))return; await removeFromDB(detailAng.id); setLista(p=>p.filter(x=>x.id!==detailAng.id)); setDetailAng(null);}}/>}
    </div>
  );

  // ── FORMULÁRIO ──
  if (step==="form") return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={()=>setStep("lista")} className="btn-ghost" style={{padding:"8px 12px"}}><Ic n="x" s={15}/></button>
        <div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?20:26,fontWeight:600}}>{editId?"Editar Angariação":"Nova Angariação"}</h1>
          <p style={{color:G.textMuted,fontSize:12,marginTop:2}}>Preenche os dados para gerar o contrato</p>
        </div>
      </div>

      {/* Proprietário */}
      <div className="card" style={{marginBottom:16}}>
        <p style={{fontSize:12,color:G.gold1,fontWeight:500,marginBottom:14,textTransform:"uppercase",letterSpacing:".5px"}}>👤 Dados do Proprietário</p>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
          <Field label="Nome completo *"><input value={form.propNome} onChange={e=>setForm(p=>({...p,propNome:e.target.value}))} placeholder="Ex: João Silva"/></Field>
          <Field label="NIF *"><input value={form.propNif} onChange={e=>setForm(p=>({...p,propNif:e.target.value}))} placeholder="123456789"/></Field>
          <Field label="E-mail"><input type="email" value={form.propEmail} onChange={e=>setForm(p=>({...p,propEmail:e.target.value}))} placeholder="joao@email.pt"/></Field>
          <Field label="Telefone"><input value={form.propTelefone} onChange={e=>setForm(p=>({...p,propTelefone:e.target.value}))} placeholder="912 345 678"/></Field>
          <div style={{gridColumn:mob?"1":"1/-1"}}>
            <Field label="Morada do Proprietário"><input value={form.propMorada} onChange={e=>setForm(p=>({...p,propMorada:e.target.value}))} placeholder="Rua, número, código postal, localidade"/></Field>
          </div>
        </div>
      </div>

      {/* Imóvel */}
      <div className="card" style={{marginBottom:16}}>
        <p style={{fontSize:12,color:G.gold1,fontWeight:500,marginBottom:14,textTransform:"uppercase",letterSpacing:".5px"}}>🏠 Dados do Imóvel</p>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
          <Field label="Tipo">
            <select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}>
              {["Apartamento","Moradia","Terreno","Comercial","Escritório","Garagem"].map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Finalidade">
            <select value={form.finalidade} onChange={e=>setForm(p=>({...p,finalidade:e.target.value}))}>
              <option>Venda</option><option>Arrendamento</option>
            </select>
          </Field>
          <Field label={`Valor ${form.finalidade==="Arrendamento"?"Renda (€/mês)":"Venda (€)"} *`}>
            <input type="number" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))} placeholder="0"/>
          </Field>
          <Field label="Área (m²)"><input type="number" value={form.area} onChange={e=>setForm(p=>({...p,area:e.target.value}))} placeholder="0"/></Field>
          <Field label="Quartos"><input type="number" value={form.quartos} onChange={e=>setForm(p=>({...p,quartos:e.target.value}))} placeholder="0"/></Field>
          <Field label="Casas de Banho"><input type="number" value={form.casasBanho} onChange={e=>setForm(p=>({...p,casasBanho:e.target.value}))} placeholder="0"/></Field>
          <div style={{gridColumn:mob?"1":"1/-1"}}>
            <Field label="Morada do Imóvel"><input value={form.morada} onChange={e=>setForm(p=>({...p,morada:e.target.value}))} placeholder="Rua, número, código postal"/></Field>
          </div>
        </div>
        <div style={{marginTop:4}}>
          <p style={{fontSize:12,color:G.textMuted,marginBottom:10,textTransform:"uppercase",letterSpacing:".3px"}}>Localização *</p>
          <LocSelector distrito={form.distrito} concelho={form.concelho} freguesia={form.freguesia}
            onChange={({distrito,concelho,freguesia})=>setForm(p=>({...p,distrito,concelho,freguesia}))}/>
        </div>
        <Field label="Descrição do Imóvel">
          <textarea rows={3} value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} placeholder="Características principais, estado de conservação, pontos de interesse..."/>
        </Field>
      </div>

      {/* Contrato */}
      <div className="card" style={{marginBottom:20}}>
        <p style={{fontSize:12,color:G.gold1,fontWeight:500,marginBottom:14,textTransform:"uppercase",letterSpacing:".5px"}}>📋 Condições do Mandato</p>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12}}>
          <Field label="Tipo de Mandato">
            <select value={form.tipoMandato} onChange={e=>setForm(p=>({...p,tipoMandato:e.target.value}))}>
              <option>Exclusivo</option><option>Não Exclusivo</option>
            </select>
          </Field>
          <Field label="Comissão (%)">
            <input type="number" value={form.comissao} onChange={e=>setForm(p=>({...p,comissao:e.target.value}))} step="0.5" min="0" max="10"/>
          </Field>
          <Field label="Prazo (meses)">
            <select value={form.prazo} onChange={e=>setForm(p=>({...p,prazo:e.target.value}))}>
              {["3","6","9","12","18","24"].map(m=><option key={m} value={m}>{m} meses</option>)}
            </select>
          </Field>
          <Field label="Data de Início">
            <input type="date" value={form.dataInicio} onChange={e=>setForm(p=>({...p,dataInicio:e.target.value}))}/>
          </Field>
          <Field label="Estado">
            <select value={form.estado} onChange={e=>setForm(p=>({...p,estado:e.target.value}))}>
              <option>Rascunho</option><option>Pendente</option><option>Assinado</option><option>Cancelado</option>
            </select>
          </Field>
        </div>
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
        <button className="btn-ghost" onClick={()=>setStep("lista")}>Cancelar</button>
        <button className="btn-ghost" style={{borderColor:G.gold1,color:G.gold1}} onClick={()=>guardar(false)}>
          <Ic n="check" s={14} c={G.gold1}/>Guardar Rascunho
        </button>
        <button className="btn-gold" onClick={()=>guardar(true)} disabled={!form.propNome||!form.distrito||!form.valor}>
          <Ic n="edit" s={14} c="#0E0E0F"/>Guardar e Assinar
        </button>
      </div>
    </div>
  );

  // ── ASSINATURA ──
  if (step==="assinar") return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={()=>setStep("form")} className="btn-ghost" style={{padding:"8px 12px"}}><Ic n="x" s={15}/></button>
        <div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?20:26,fontWeight:600}}>Assinatura Digital</h1>
          <p style={{color:G.textMuted,fontSize:12,marginTop:2}}>{form.propNome} · {form.tipo} em {form.concelho}</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="card" style={{marginBottom:20,background:`linear-gradient(135deg,${G.goldDark}10,${G.gold1}05)`}}>
        <p style={{fontSize:12,color:G.gold1,fontWeight:500,marginBottom:12,textTransform:"uppercase",letterSpacing:".5px"}}>✦ Resumo do Contrato</p>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
          {[["Proprietário",form.propNome],["Mandato",form.tipoMandato],["Comissão",`${form.comissao}%`],["Valor",`${Number(form.valor).toLocaleString("pt-PT")} €`]].map(([l,v])=>(
            <div key={l} style={{background:G.surface2,borderRadius:6,padding:"10px 12px"}}>
              <p style={{fontSize:10,color:G.textDim,marginBottom:3}}>{l.toUpperCase()}</p>
              <p style={{fontSize:13,fontWeight:500}}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <p style={{fontSize:13,color:G.textMuted,marginBottom:16,lineHeight:1.6}}>
          Ambas as partes devem assinar abaixo para validar o contrato de mediação imobiliária. Assine com o dedo no telemóvel/tablet ou com o rato no computador.
        </p>
        <SignaturePad label="Assinatura do Proprietário *" onSave={setSigProp} saved={sigProp}/>
        <SignaturePad label={`Assinatura do Agente (${user.nome}) *`} onSave={setSigAgente} saved={sigAgente}/>
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button className="btn-ghost" onClick={()=>setStep("form")}>Voltar</button>
        <button className="btn-gold" onClick={concluirAssinatura} disabled={!sigProp||!sigAgente}>
          <Ic n="check" s={14} c="#0E0E0F"/>Concluir e Gerar PDF
        </button>
      </div>
    </div>
  );

  // ── PREVIEW / SUCESSO ──
  if (step==="preview") return (
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:64,marginBottom:16}}>✅</div>
      <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:600,marginBottom:8}}>Contrato Assinado!</h1>
      <p style={{color:G.textMuted,fontSize:14,marginBottom:32,maxWidth:400,margin:"0 auto 32px"}}>
        O mandato de mediação de <strong>{form.propNome}</strong> foi assinado com sucesso.
      </p>

      {/* Botões principais */}
      <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:28}}>
        <button className="btn-gold" onClick={()=>gerarPDFAngariacao(form,sigProp,sigAgente,user)}>
          <Ic n="pdf" s={14} c="#0E0E0F"/>Descarregar PDF
        </button>
        {!importado ? (
          <button className="btn-purple" onClick={importarParaImoveis}>
            <Ic n="building" s={14} c="#fff"/>Adicionar aos Imóveis
          </button>
        ) : (
          <button className="btn-ghost" style={{borderColor:G.green,color:G.green}} onClick={()=>{setPage("imoveis");}}>
            <Ic n="check" s={14} c={G.green}/>Ver em Imóveis
          </button>
        )}
        <button className="btn-ghost" onClick={()=>{setStep("lista");setSigProp(null);setSigAgente(null);setImportado(false);}}>
          Ver Angariações
        </button>
      </div>

      {/* Confirmação de importação */}
      {importado && (
        <div style={{background:`${G.green}15`,border:`1px solid ${G.green}40`,borderRadius:10,padding:16,maxWidth:420,margin:"0 auto 24px",display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:24}}>🏠</span>
          <div style={{textAlign:"left"}}>
            <p style={{fontSize:14,fontWeight:500,color:G.green,marginBottom:2}}>Imóvel adicionado à carteira!</p>
            <p style={{fontSize:12,color:G.textMuted}}>{form.tipo} · {form.freguesia||form.concelho}, {form.distrito} · {Number(form.valor).toLocaleString("pt-PT")} €</p>
          </div>
        </div>
      )}

      {/* Próximos passos */}
      <div style={{marginTop:8,padding:20,background:G.surface,borderRadius:10,border:`1px solid ${G.border}`,maxWidth:420,margin:"0 auto",textAlign:"left"}}>
        <p style={{fontSize:12,color:G.textMuted,marginBottom:12,textTransform:"uppercase",letterSpacing:".5px"}}>Próximos Passos</p>
        {[
          {feito:true,  txt:"Contrato assinado por ambas as partes"},
          {feito:importado, txt:"Imóvel adicionado à carteira"},
          {feito:false, txt:"Envia o PDF ao proprietário por e-mail"},
          {feito:false, txt:"Publica o imóvel no Idealista / Imovirtual"},
          {feito:false, txt:"Cria uma tarefa de acompanhamento na Agenda"},
        ].map((s,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:9,alignItems:"flex-start"}}>
            <span style={{fontSize:13,color:s.feito?G.green:G.textDim,marginTop:1,flexShrink:0}}>{s.feito?"✓":"○"}</span>
            <p style={{fontSize:13,color:s.feito?G.text:G.textMuted,textDecoration:s.feito?"none":"none"}}>{s.txt}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return null;
};

const GestaoUtilizadores = ({currentUser}) => {
  const [lista, setLista]   = useState([]);
  const [modal, setMod]     = useState(false);
  const [form, setForm]     = useState(emptyU);
  const [editId, setEditId] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [erro, setErro]     = useState("");
  const [info, setInfo]     = useState("");

  const isAdmin = currentUser.role === "admin";

  // Carregar utilizadores da BD
  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      try { const data = await dbUtilizadores.list(); setLista(data); }
      catch (e) { console.error("load utilizadores:", e); }
    })();
  }, []);

  const save = async () => {
    setErro(""); setInfo("");
    if (!form.nome || !form.email) { setErro("Preenche todos os campos obrigatórios."); return; }
    if (!form.email.includes("@")) { setErro("E-mail inválido."); return; }
    if (!editId && (!form.password || form.password.length < 6)) { setErro("A palavra-passe deve ter pelo menos 6 caracteres."); return; }
    const avatar = form.avatar || form.nome.charAt(0).toUpperCase();
    try {
      if (editId) {
        // EDITAR — só atualiza o perfil (não dá para mudar email/password aqui)
        const payload = { nome: form.nome, cargo: form.cargo, avatar, role: form.role };
        const updated = await dbUtilizadores.updateProfile(editId, payload);
        setLista(lista.map(u => u.id === editId ? { ...u, ...updated } : u));
        setInfo("✓ Perfil atualizado.");
      } else {
        // CRIAR — cria conta no Auth e perfil
        if (lista.find(u => u.email === form.email)) { setErro("Já existe um utilizador com este e-mail."); return; }
        const novo = await dbUtilizadores.create({
          email: form.email.trim(),
          password: form.password,
          nome: form.nome,
          cargo: form.cargo,
          avatar,
          role: form.role || "agente",
        });
        setLista([...lista, novo]);
        setInfo("✓ Utilizador criado.");
      }
      setMod(false); setForm(emptyU); setEditId(null); setErro("");
      setTimeout(()=>setInfo(""), 3000);
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("already registered") || msg.includes("already been registered")) setErro("Já existe uma conta com este e-mail.");
      else if (msg.includes("Password")) setErro("Palavra-passe demasiado fraca (mín. 6 caracteres).");
      else setErro("Erro ao guardar: " + msg);
    }
  };

  const del = async (id) => {
    if (id === currentUser.id) { alert("Não podes eliminar o teu próprio utilizador."); return; }
    if (!confirm("Eliminar este utilizador? Isto remove o perfil — a conta de autenticação fica activa até ser removida manualmente na Supabase.")) return;
    try {
      await dbUtilizadores.remove(id);
      setLista(lista.filter(u => u.id !== id));
    } catch (e) { alert("Erro: " + e.message); }
  };

  const edit = (u) => { setForm({...u, password:""}); setEditId(u.id); setShowPw(false); setMod(true); setErro(""); };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:600}}>Utilizadores</h1>
          <p style={{color:G.textMuted,fontSize:13,marginTop:2}}>{lista.length} utilizadores registados</p>
        </div>
        {isAdmin && <button className="btn-gold" onClick={()=>{setForm(emptyU);setEditId(null);setErro("");setMod(true);}}><Ic n="plus" s={14} c="#0E0E0F"/>Novo Utilizador</button>}
      </div>

      {!isAdmin && (
        <div style={{background:`${G.blue}15`,border:`1px solid ${G.blue}40`,borderRadius:8,padding:"12px 16px",marginBottom:20,display:"flex",gap:10,alignItems:"center"}}>
          <Ic n="info" s={16} c={G.blue}/>
          <span style={{fontSize:13,color:G.textMuted}}>Apenas administradores podem gerir utilizadores.</span>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {lista.map(u => (
          <div key={u.id} className="card" style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:46,height:46,borderRadius:"50%",background:`linear-gradient(135deg,${G.goldDark},${G.gold1})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:20,color:"#0E0E0F",flexShrink:0}}>{u.avatar}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <p style={{fontWeight:500,fontSize:15}}>{u.nome}</p>
                {u.id === currentUser.id && <span style={{fontSize:10,background:`${G.gold1}20`,color:G.gold1,padding:"1px 7px",borderRadius:10,fontWeight:600}}>TU</span>}
                <span style={{fontSize:10,background:u.role==="admin"?`${G.purple}20`:`${G.blue}20`,color:u.role==="admin"?G.purple:G.blue,padding:"1px 7px",borderRadius:10,fontWeight:600,textTransform:"uppercase"}}>{u.role==="admin"?"Admin":"Agente"}</span>
              </div>
              <p style={{fontSize:13,color:G.textMuted}}>{u.cargo} · {u.email}</p>
            </div>
            {isAdmin && (
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>edit(u)} style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:7,padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:12,color:G.textMuted,fontFamily:"'DM Sans',sans-serif"}}><Ic n="edit" s={14} c={G.textMuted}/>Editar</button>
                {u.id !== currentUser.id && <button onClick={()=>del(u.id)} style={{background:"none",border:`1px solid ${G.border}`,borderRadius:7,padding:"8px 10px",cursor:"pointer",display:"flex"}}><Ic n="trash" s={14} c={G.red}/></button>}
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={editId?"Editar Utilizador":"Novo Utilizador"} onClose={()=>setMod(false)}>
          {erro && <div style={{background:`${G.red}15`,border:`1px solid ${G.red}40`,borderRadius:7,padding:"10px 14px",fontSize:13,color:G.red,marginBottom:14}}>{erro}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{gridColumn:"1/-1"}}>
              <Field label="Nome completo *"><input value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} placeholder="Ex: Ana Rodrigues"/></Field>
            </div>
            <Field label="E-mail *"><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="ana@magna.pt" disabled={!!editId} style={editId?{opacity:.6,cursor:"not-allowed"}:{}}/></Field>
            {!editId && (
              <Field label="Palavra-passe *">
                <div style={{position:"relative"}}>
                  <input type={showPw?"text":"password"} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Mínimo 6 caracteres" style={{paddingRight:40}}/>
                  <button onClick={()=>setShowPw(!showPw)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",display:"flex"}}><Ic n={showPw?"eyeoff":"eye"} s={15} c={G.textDim}/></button>
                </div>
              </Field>
            )}
            {editId && (
              <div style={{display:"flex",alignItems:"center",background:`${G.blue}10`,border:`1px solid ${G.blue}30`,borderRadius:8,padding:"10px 12px",fontSize:11,color:G.textMuted,gap:8}}>
                <Ic n="info" s={14} c={G.blue}/>
                <span>Para alterar a palavra-passe, o utilizador pode usar "Esqueci-me da palavra-passe" no login.</span>
              </div>
            )}
            <Field label="Cargo">
              <select value={form.cargo} onChange={e=>setForm(p=>({...p,cargo:e.target.value}))}>
                {cargos.map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Permissão">
              <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                <option value="agente">Agente</option>
                <option value="admin">Administrador</option>
              </select>
            </Field>
            <div style={{gridColumn:"1/-1"}}>
              <Field label="Inicial do avatar (opcional)"><input value={form.avatar} onChange={e=>setForm(p=>({...p,avatar:e.target.value.charAt(0).toUpperCase()}))} placeholder="Ex: A" maxLength={1}/></Field>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
            <button className="btn-ghost" onClick={()=>setMod(false)}>Cancelar</button>
            <button className="btn-gold" onClick={save}>{editId?"Guardar":"Criar Utilizador"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Location selector component ───────────────────────────────
const LocSelector = ({distrito,concelho,freguesia,onChange}) => {
  const distritos  = getDistritos();
  const concelhos  = getConcelhos(distrito);
  const freguesias = getFreguesias(distrito, concelho);

  const onDistrito = (d) => onChange({ distrito:d, concelho:"", freguesia:"" });
  const onConcelho = (c) => onChange({ distrito, concelho:c, freguesia:"" });
  const onFreguesia= (f) => onChange({ distrito, concelho, freguesia:f });

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      <Field label="Distrito *">
        <select value={distrito} onChange={e=>onDistrito(e.target.value)}>
          <option value="">Seleccionar...</option>
          {distritos.map(d=><option key={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Concelho *">
        <select value={concelho} onChange={e=>onConcelho(e.target.value)} disabled={!distrito}>
          <option value="">Seleccionar...</option>
          {concelhos.map(c=><option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Freguesia">
        <select value={freguesia} onChange={e=>onFreguesia(e.target.value)} disabled={!concelho}>
          <option value="">Seleccionar...</option>
          {freguesias.map(f=><option key={f}>{f}</option>)}
        </select>
      </Field>
    </div>
  );
};

const ProspeccaoPanel = ({mob}) => {
  const [loc, setLoc]           = useState({distrito:"",concelho:"",freguesia:""});
  const [tipo,setTipo]           = useState("Apartamento");
  const [finalidade,setFinalid]  = useState("Venda");
  const [loading,setLoad]        = useState(false);
  const [result,setResult]       = useState(null);
  const [error,setError]         = useState("");
  const [step,setStep]           = useState("");

  const locStr = [loc.freguesia, loc.concelho, loc.distrito].filter(Boolean).join(", ");
  const canSearch = loc.distrito && loc.concelho;

  const buscar = async () => {
    if (!canSearch) return;
    setLoad(true); setError(""); setResult(null);
    try {
      setStep("🌐 A pesquisar mercado imobiliário português...");
      const zona = loc.freguesia || loc.concelho;
      const prompt = `És um especialista em mercado imobiliário em Portugal.
Faz uma análise de prospecção de mercado detalhada para:
- Tipo de imóvel: ${tipo}
- Finalidade: ${finalidade}
- Freguesia: ${loc.freguesia || "N/A"}
- Concelho: ${loc.concelho}
- Distrito: ${loc.distrito}
- País: Portugal

Usa web_search para pesquisar dados reais e actualizados:
1. "${tipo} ${zona} ${loc.concelho} ${finalidade==="Venda"?"venda":"arrendamento"} preço 2025 2026 euros Portugal"
2. "imóveis ${loc.concelho} ${loc.distrito} valorização mercado 2025"
3. "Idealista Imovirtual ${tipo} ${zona} preço metro quadrado"

Devolve APENAS este JSON válido:
{
  "precoM2Venda": <número em euros>,
  "precoM2Locacao": <número em euros/mês>,
  "ticketMedioVenda": <número em euros>,
  "ticketMedioLocacao": <número em euros/mês>,
  "ofertaAtual": <número estimado de imóveis disponíveis>,
  "demanda": "Alta" | "Média" | "Baixa",
  "tendencia12m": <variação percentual últimos 12 meses>,
  "tendencia6m": <variação percentual últimos 6 meses>,
  "tempMedioVenda": <número médio de dias para vender>,
  "perfilComprador": "<perfil típico do comprador/arrendatário nesta zona>",
  "oportunidades": ["oportunidade1","oportunidade2","oportunidade3"],
  "riscos": ["risco1","risco2"],
  "melhorEpoca": "<melhor época do ano para transacionar>",
  "comparativoBairros": [
    {"bairro":"${zona}","precoM2":<número>,"variacao":<número>},
    {"bairro":"<zona vizinha 1 no mesmo concelho>","precoM2":<número>,"variacao":<número>},
    {"bairro":"<zona vizinha 2 no mesmo concelho>","precoM2":<número>,"variacao":<número>}
  ],
  "resumoMercado": "<análise de 3-4 frases sobre o mercado em ${zona}, ${loc.concelho} em português de Portugal>",
  "score": <número de 0 a 10 indicando atractividade do mercado>,
  "dataAnalise": "${new Date().toLocaleDateString("pt-PT")}"
}`;
      setStep("🤖 A processar com IA...");
      const raw = await callClaude(prompt);
      const json = parseJSON(raw);
      if (!json||!json.precoM2Venda) throw new Error("A IA não devolveu dados suficientes. Tenta com outra localização.");
      setResult({...json, zona, ...loc, tipo, finalidade});
    } catch(e) { setError(e.message||"Erro na prospecção."); }
    finally { setLoad(false); setStep(""); }
  };

  const sc = result ? (result.score>=7?G.green:result.score>=5?"#E0A052":G.red) : G.gold1;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:mob?16:24}}>
        <div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?22:28,fontWeight:600}}>Prospecção IA</h1>
          <p style={{color:G.textMuted,fontSize:mob?11:13,marginTop:2}}>Análise em tempo real · Portugal · Distrito → Concelho → Freguesia</p>
        </div>
      </div>

      <div className="card" style={{marginBottom:mob?16:24}}>
        <p style={{fontSize:12,color:G.textMuted,marginBottom:14,textTransform:"uppercase",letterSpacing:".5px"}}>Localização</p>
        <LocSelector distrito={loc.distrito} concelho={loc.concelho} freguesia={loc.freguesia} onChange={setLoc}/>
        {loc.distrito && loc.concelho && (
          <div style={{marginTop:4,fontSize:12,color:G.gold1}}>
            📍 {[loc.freguesia,loc.concelho,loc.distrito].filter(Boolean).join(" · ")}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr auto",gap:12,marginTop:14,alignItems:"end"}}>
          <Field label="Tipo de Imóvel">
            <select value={tipo} onChange={e=>setTipo(e.target.value)}>
              {["Apartamento","Moradia","Comercial","Terreno","Escritório"].map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Finalidade">
            <select value={finalidade} onChange={e=>setFinalid(e.target.value)}><option>Venda</option><option>Arrendamento</option></select>
          </Field>
          <div style={{paddingBottom:14}}>
            <button className="btn-purple" style={{width:mob?"100%":"auto",whiteSpace:"nowrap"}} onClick={buscar} disabled={loading||!canSearch}>
              {loading?<span className="spinner"/>:<Ic n="search2" s={15} c="#fff"/>}
              {loading?"A analisar...":"Analisar"}
            </button>
          </div>
        </div>
        {!canSearch && <p style={{fontSize:11,color:G.textDim,marginTop:4}}>Selecciona pelo menos Distrito e Concelho para analisar.</p>}
      </div>

      {loading&&<div style={{textAlign:"center",padding:"60px 0"}}><div className="spinner spinner-gold" style={{width:40,height:40,margin:"0 auto 20px",borderWidth:3}}/><p className="pulsing" style={{color:G.gold1,fontSize:14}}>{step}</p></div>}
      {error&&<div style={{background:`${G.red}15`,border:`1px solid ${G.red}40`,borderRadius:8,padding:16,textAlign:"center"}}><p style={{color:G.red}}>{error}</p></div>}

      {result&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:16,marginBottom:20}}>
            <div className="card" style={{textAlign:"center",minWidth:150}}>
              <p style={{fontSize:11,color:G.textDim,marginBottom:10,textTransform:"uppercase",letterSpacing:".5px"}}>Score</p>
              <div style={{width:80,height:80,borderRadius:"50%",border:`4px solid ${sc}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",background:`${sc}10`}}>
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:sc}}>{result.score}</span>
              </div>
              <p style={{fontSize:12,color:sc,fontWeight:500}}>{result.score>=7?"Atrativo":result.score>=5?"Moderado":"Baixo"}</p>
              <p style={{fontSize:11,color:G.textDim,marginTop:4}}>{result.zona} · {result.concelho}</p>
            </div>
            <div className="card">
              <p style={{fontSize:12,color:G.gold1,fontWeight:500,marginBottom:10}}>📋 Resumo do Mercado</p>
              <p style={{fontSize:13,color:G.textMuted,lineHeight:1.7}}>{result.resumoMercado}</p>
              <div style={{display:"flex",gap:10,marginTop:14}}>
                <span className={`tag badge-${result.demanda.toLowerCase().replace("é","e")}`}>Procura {result.demanda}</span>
                <span style={{fontSize:12,color:G.textDim}}>{result.dataAnalise}</span>
              </div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
            {[
              {l:"Preço/m² Venda",v:fmtM2(result.precoM2Venda),c:G.gold1},
              {l:"Preço/m² Arrend.",v:`${fmtM2(result.precoM2Locacao)}/mês`,c:G.blue},
              {l:"Ticket Médio Venda",v:fmtFull(result.ticketMedioVenda),c:G.green},
              {l:"Ticket Médio Arrend.",v:`${fmtFull(result.ticketMedioLocacao)}/mês`,c:G.purple},
            ].map((m,i)=>(
              <div key={i} className="stat-card">
                <p style={{fontSize:11,color:G.textDim,marginBottom:8}}>{m.l}</p>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:m.c}}>{m.v}</p>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            <div className="card">
              <p style={{fontSize:12,fontWeight:500,marginBottom:14,color:G.textMuted,textTransform:"uppercase",letterSpacing:".5px"}}>Tendências</p>
              <div style={{display:"flex",gap:12,marginBottom:14}}>
                {[["6 meses",result.tendencia6m],["12 meses",result.tendencia12m]].map(([l,v])=>(
                  <div key={l} style={{flex:1,textAlign:"center",background:G.surface2,borderRadius:8,padding:14}}>
                    <p style={{fontSize:11,color:G.textDim,marginBottom:6}}>{l.toUpperCase()}</p>
                    <p style={{fontSize:22,fontWeight:700,color:v>0?G.green:G.red,fontFamily:"'Cormorant Garamond',serif"}}>{v>0?"+":""}{v}%</p>
                  </div>
                ))}
              </div>
              <div style={{borderTop:`1px solid ${G.border}`,paddingTop:12}}>
                <p style={{fontSize:12,color:G.textDim,marginBottom:4}}>Tempo médio de venda</p>
                <p style={{fontSize:15,fontWeight:500}}>{result.tempMedioVenda} dias</p>
                <p style={{fontSize:12,color:G.textDim,marginTop:8,marginBottom:3}}>Melhor época</p>
                <p style={{fontSize:13,color:G.textMuted}}>{result.melhorEpoca}</p>
              </div>
            </div>

            <div className="card">
              <p style={{fontSize:12,fontWeight:500,marginBottom:14,color:G.textMuted,textTransform:"uppercase",letterSpacing:".5px"}}>Comparativo de Zonas (€/m²)</p>
              {(result.comparativoBairros||[]).map((b,i)=>{
                const max = Math.max(...(result.comparativoBairros||[]).map(x=>x.precoM2))||1;
                return (
                  <div key={i} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontSize:13,fontWeight:i===0?500:400,color:i===0?G.gold1:G.text}}>{b.bairro}</span>
                      <span style={{fontSize:13,color:G.textMuted}}>{fmtM2(b.precoM2)}</span>
                    </div>
                    <div style={{height:4,background:G.surface3,borderRadius:2}}>
                      <div style={{height:"100%",borderRadius:2,width:`${(b.precoM2/max)*100}%`,background:i===0?`linear-gradient(90deg,${G.goldDark},${G.gold1})`:G.surface2}}/>
                    </div>
                    <span style={{fontSize:11,color:b.variacao>0?G.green:G.red}}>{b.variacao>0?"+":""}{b.variacao}% ao ano</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div className="card">
              <p style={{fontSize:12,color:G.green,fontWeight:500,marginBottom:12}}>✦ Oportunidades</p>
              {(result.oportunidades||[]).map((o,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:10}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:G.green,marginTop:5,flexShrink:0}}/>
                  <span style={{fontSize:13,color:G.textMuted,lineHeight:1.5}}>{o}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <p style={{fontSize:12,color:"#E0A052",fontWeight:500,marginBottom:12}}>⚠ Riscos</p>
              {(result.riscos||[]).map((r,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:10}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#E0A052",marginTop:5,flexShrink:0}}/>
                  <span style={{fontSize:13,color:G.textMuted,lineHeight:1.5}}>{r}</span>
                </div>
              ))}
              <div style={{marginTop:14,borderTop:`1px solid ${G.border}`,paddingTop:14}}>
                <p style={{fontSize:12,color:G.textDim,marginBottom:4}}>Perfil do Comprador</p>
                <p style={{fontSize:13,color:G.textMuted}}>{result.perfilComprador}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── DATA ──────────────────────────────────────────────────────
const initIm = [
  {id:1,titulo:"Apartamento T3 Chiado",tipo:"Apartamento",finalidade:"Venda",status:"Disponível",valor:850000,area:120,quartos:3,bairro:"Chiado",cidade:"Lisboa",foto:"🏙️"},
  {id:2,titulo:"Moradia V4 Cascais",tipo:"Moradia",finalidade:"Venda",status:"Reservado",valor:1250000,area:280,quartos:4,bairro:"Cascais",cidade:"Cascais",foto:"🏡"},
  {id:3,titulo:"Escritório Boavista",tipo:"Comercial",finalidade:"Arrendamento",status:"Disponível",valor:3200,area:85,quartos:0,bairro:"Boavista",cidade:"Porto",foto:"🏢"},
  {id:4,titulo:"T2 Bairro Alto",tipo:"Apartamento",finalidade:"Venda",status:"Vendido",valor:420000,area:75,quartos:2,bairro:"Bairro Alto",cidade:"Lisboa",foto:"🌿"},
];
const initCl = [
  {id:1,nome:"António Ferreira",email:"antonio@email.pt",telefone:"912 345 678",interesse:"Comprar",orcamento:900000,temperatura:"Quente",bairros:"Chiado, Príncipe Real",obs:"Procura T3 com terraço"},
  {id:2,nome:"Maria Santos",email:"maria@email.pt",telefone:"913 456 789",interesse:"Arrendar",orcamento:2500,temperatura:"Morno",bairros:"Boavista, Foz",obs:"Escritório para advogada"},
  {id:3,nome:"Grupo Investar",email:"info@investar.pt",telefone:"21 333 4444",interesse:"Comprar",orcamento:3000000,temperatura:"Quente",bairros:"Lisboa","obs":"Portfolio de apartamentos"},
];
const initT = [
  {id:1,titulo:"Visita — Chiado T3",cliente:"António Ferreira",data:"2026-05-22",hora:"10:00",tipo:"Visita",prioridade:"Alta",concluida:false},
  {id:2,titulo:"Proposta — Grupo Investar",cliente:"Grupo Investar",data:"2026-05-21",hora:"14:30",tipo:"Reunião",prioridade:"Alta",concluida:false},
  {id:3,titulo:"Enviar contrato Maria",cliente:"Maria Santos",data:"2026-05-23",hora:"09:00",tipo:"Documento",prioridade:"Média",concluida:false},
];

// ── IMÓVEIS ───────────────────────────────────────────────────
const emptyIm={titulo:"",tipo:"Apartamento",finalidade:"Venda",status:"Disponível",valor:"",area:"",quartos:"",bairro:"",distrito:"",concelho:"",cidade:"",freguesia:"",foto:"🏠",descricao:"",fotos:[],destaque:false};

// ── Import from Idealista / Imovirtual ────────────────────────
const ImportModal = ({onClose, onImport}) => {
  const [modo, setModo]       = useState("texto"); // "texto" | "link"
  const [url, setUrl]         = useState("");
  const [texto, setTexto]     = useState("");
  const [loading, setLoad]    = useState(false);
  const [step, setStep]       = useState("");
  const [error, setError]     = useState("");
  const [preview, setPreview] = useState(null);

  const detectPortal = (u) => {
    if (u.includes("idealista.pt"))  return "Idealista";
    if (u.includes("imovirtual.com")) return "Imovirtual";
    return null;
  };
  const portal = detectPortal(url);
  const fotoMap = {"Apartamento":"🏙️","Moradia":"🏡","Terreno":"🌿","Comercial":"🏢","Escritório":"🏢"};

  // ── Extracção local do texto colado ──────────────────────────
  const extrairDoTexto = (txt) => {
    const valorMatch = txt.match(/(\d[\d\s.,]+)\s*[€Ee](?:ur(?:os?)?)?/i);
    const valor = parseFloat((valorMatch?.[1]||"").replace(/[\s.]/g,"").replace(",",".")) || 0;
    const areaMatch = txt.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
    const area = areaMatch ? parseFloat(areaMatch[1]) : 0;
    const quartosMatch = txt.match(/T(\d)|(\d)\s*(?:quarto|assoalhada|divis)/i);
    const quartos = quartosMatch ? parseInt(quartosMatch[1]||quartosMatch[2]||0) : 0;
    const wc = txt.match(/(\d)\s*(?:casa[s]?\s*de\s*banho|wc|bathroom)/i);
    const casasBanho = wc ? parseInt(wc[1]) : 0;
    const tipoMap = [[/moradia|vivenda|villa/i,"Moradia"],[/apartamento|flat|andar/i,"Apartamento"],[/terreno|lote/i,"Terreno"],[/comercial|loja|armaz/i,"Comercial"],[/escrit/i,"Escritório"]];
    const tipo = tipoMap.find(([r])=>r.test(txt))?.[1] || "Apartamento";
    const finalidade = /arrendar|arrendamento|aluguer|renda/i.test(txt) ? "Arrendamento" : "Venda";
    const concelhoMatch = txt.match(/(?:concelho|munic)[:\s]+([A-ZÀ-Ü][a-zà-ü\s]+)/i) || txt.match(/,\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)?)\s*,?\s*Portugal/i);
    const concelho = concelhoMatch ? concelhoMatch[1].trim() : "";
    const distritoMatch = txt.match(/(?:distrito)[:\s]+([A-ZÀ-Ü][a-zà-ü\s]+)/i);
    const distrito = distritoMatch ? distritoMatch[1].trim() : "";
    const bairroMatch = txt.match(/(?:zona|bairro|área|freguesia)[:\s]+([A-ZÀ-Ü][a-zà-ü\s]+)/i);
    const bairro = bairroMatch ? bairroMatch[1].trim() : "";
    const refMatch = txt.match(/(?:ref(?:erência)?|id|código)[.:\s#]+([A-Z0-9\-\/]+)/i);
    const referencia = refMatch ? refMatch[1] : "";
    const linhas = txt.split("\n").map(l=>l.trim()).filter(l=>l.length>10&&l.length<120);
    const titulo = linhas[0] || `${tipo}${quartos>0?" T"+quartos:""} ${concelho}`.trim() || "Imóvel Importado";
    const descricao = txt.replace(/\s+/g," ").trim().slice(0,300);
    return {titulo,tipo,finalidade,valor,area,quartos,casasBanho,bairro,concelho,distrito,cidade:concelho,descricao,referencia,foto:fotoMap[tipo]||"🏠",status:"Disponível",portal:detectPortal(url)||"Manual",encontrado:valor>0||area>0||quartos>0};
  };

  // ── Importar por link (via API / callClaude) ──────────────────
  const importarPorLink = async () => {
    if (!portal) { setError("Cola um link válido do Idealista ou Imovirtual."); return; }
    setLoad(true); setError(""); setPreview(null);
    try {
      setStep(`🔍 A pesquisar o anúncio no ${portal}...`);
      const prompt = `Acede a este anúncio imobiliário português e extrai todos os dados.
URL: ${url}
Usa web_search para pesquisar: "${url}"
Portal: ${portal}
Devolve APENAS JSON válido (sem markdown):
{"titulo":"<título>","tipo":"<Apartamento|Moradia|Terreno|Comercial|Escritório>","finalidade":"<Venda|Arrendamento>","valor":<número>,"area":<número>,"quartos":<número>,"casasBanho":<número>,"freguesia":"<freguesia>","concelho":"<concelho>","distrito":"<distrito>","bairro":"<zona>","descricao":"<até 300 chars>","referencia":"<ref>","encontrado":true}
Se não encontrares: {"encontrado":false,"motivo":"<razão>"}`;
      setStep("🤖 A extrair dados com IA...");
      const raw = await callClaude(prompt, "claude-haiku-4-5");
      setStep("📋 A preparar pré-visualização...");
      const json = parseJSON(raw);
      if (!json) throw new Error("Não foi possível processar a resposta da IA.");
      if (json.encontrado === false) throw new Error(json.motivo || "Anúncio não encontrado. Verifica se o link está correcto e activo.");
      json.foto = fotoMap[json.tipo] || "🏠";
      json.status = "Disponível";
      json.cidade = json.concelho || "";
      setPreview(json);
    } catch(e) {
      const msg = e.message||"";
      if (msg.includes("CORS")||msg.includes("fetch")||msg.includes("Failed")||msg.includes("ligar")) {
        setError("Não foi possível ligar à API fora do Claude.ai (CORS). Usa o método \"Colar Texto\" — funciona em qualquer lugar.");
      } else {
        setError(msg || "Erro ao importar. Tenta novamente.");
      }
    } finally { setLoad(false); setStep(""); }
  };

  // ── Importar por texto colado (via Haiku, sem web search) ─────
  const importarPorTexto = async () => {
    if (texto.trim().length < 30) { setError("Cola mais texto do anúncio para a extracção funcionar."); return; }
    setLoad(true); setError("");
    try {
      setStep("🤖 A extrair dados com IA (Haiku)...");
      const prompt = `Extrai os dados deste anúncio imobiliário português. O texto foi copiado de um portal (Idealista, Imovirtual, Casa Sapo, etc.).

TEXTO DO ANÚNCIO:
"""
${texto.slice(0, 6000)}
"""

Devolve APENAS JSON válido (sem markdown, sem explicações):
{"titulo":"<título curto e descritivo>","tipo":"<Apartamento|Moradia|Terreno|Comercial|Escritório>","finalidade":"<Venda|Arrendamento>","valor":<número sem símbolos>,"area":<número em m²>,"quartos":<número, ex: T3 = 3>,"casasBanho":<número>,"freguesia":"<freguesia se mencionada>","concelho":"<concelho>","distrito":"<distrito>","bairro":"<zona/bairro>","descricao":"<resumo até 300 chars>","referencia":"<referência do anúncio se houver>","encontrado":true}

Regras:
- Se um campo não existir no texto, usa "" para texto ou 0 para números.
- "valor" é o preço (remove € e espaços). Se for arrendamento, é o valor mensal.
- "quartos": extrai de T0/T1/T2/T3... ou "X quartos/assoalhadas".
- Identifica o distrito a partir do concelho se possível (ex: Cascais → Lisboa).
- Se o texto não tiver dados imobiliários suficientes: {"encontrado":false,"motivo":"Texto sem dados suficientes"}`;

      const raw = await callClaude(prompt, "claude-haiku-4-5", false);
      setStep("📋 A preparar pré-visualização...");
      const json = parseJSON(raw);

      if (json && json.encontrado !== false && (json.valor > 0 || json.area > 0 || json.titulo)) {
        json.foto = fotoMap[json.tipo] || "🏠";
        json.status = "Disponível";
        json.cidade = json.concelho || "";
        json.portal = detectPortal(url) || "Manual";
        setPreview(json);
      } else {
        // Fallback: extração local por regex
        const dados = extrairDoTexto(texto);
        if (!dados.encontrado) { setError("Não foi possível extrair dados. Cola o texto completo do anúncio."); }
        else setPreview(dados);
      }
    } catch(e) {
      // Se a IA falhar, tenta a extração local gratuita
      console.warn("Haiku falhou, a usar extração local:", e.message);
      try {
        const dados = extrairDoTexto(texto);
        if (!dados.encontrado) { setError("Não foi possível extrair dados. Cola o texto completo do anúncio."); }
        else setPreview(dados);
      } catch(e2) { setError("Erro ao processar o texto."); }
    } finally { setLoad(false); setStep(""); }
  };

  const resetar = () => { setPreview(null); setError(""); };

  return (
    <Modal title="" onClose={onClose}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18,paddingBottom:16,borderBottom:`1px solid ${G.border}`}}>
        <div style={{padding:10,borderRadius:8,background:`${G.gold1}20`}}><Ic n="link" s={20} c={G.gold1}/></div>
        <div>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600}}>Importar Anúncio</h2>
          <p style={{fontSize:12,color:G.textMuted,marginTop:2}}>Idealista · Imovirtual</p>
        </div>
      </div>

      {/* Tabs */}
      {!preview && (
        <div style={{display:"flex",gap:4,background:G.surface2,borderRadius:8,padding:3,marginBottom:16}}>
          {[["texto","📋 Colar Texto"],["link","🔗 Importar por Link"]].map(([v,l])=>(
            <button key={v} onClick={()=>{setModo(v);setError("");}} style={{flex:1,padding:"8px 10px",borderRadius:6,border:"none",background:modo===v?G.surface3:"transparent",color:modo===v?G.gold1:G.textMuted,cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",transition:"all .15s"}}>{l}</button>
          ))}
        </div>
      )}

      {/* ── TAB: COLAR TEXTO ── */}
      {modo==="texto" && !preview && (
        <>
          <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,padding:"12px 14px",marginBottom:12}}>
            <p style={{fontSize:12,fontWeight:500,color:G.text,marginBottom:8}}>📋 Como fazer:</p>
            {["Abre o anúncio no Idealista ou Imovirtual","Selecciona todo o texto (Ctrl+A / Cmd+A no PC, pressiona e segura no telemóvel)","Copia (Ctrl+C / Cmd+C)","Cola aqui em baixo e clica \"Extrair Dados\""].map((s,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:i<3?7:0}}>
                <span style={{width:18,height:18,borderRadius:"50%",background:`linear-gradient(135deg,${G.goldDark},${G.gold1})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#0E0E0F",flexShrink:0}}>{i+1}</span>
                <p style={{fontSize:12,color:G.textMuted,lineHeight:1.5}}>{s}</p>
              </div>
            ))}
          </div>
          <div style={{marginBottom:4}}>
            <label>Texto copiado do anúncio</label>
            <textarea value={texto} onChange={e=>{setTexto(e.target.value);setError("");}}
              placeholder="Cola aqui o texto completo do anúncio (título, preço, área, localização, descrição)..."
              rows={6} style={{marginTop:6,resize:"vertical"}}/>
            <p style={{fontSize:11,color:G.textDim,marginTop:3}}>{texto.length} caracteres · A IA (Haiku) extrai todos os campos — barato e sem pesquisa web</p>
          </div>
        </>
      )}

      {/* ── TAB: LINK ── */}
      {modo==="link" && !preview && (
        <>
          <div style={{marginBottom:12}}>
            <label>Link do anúncio</label>
            <div style={{position:"relative",marginTop:6}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}><Ic n="link" s={15} c={G.textDim}/></span>
              <input value={url} onChange={e=>{setUrl(e.target.value);setError("");}}
                placeholder="https://www.idealista.pt/imovel/... ou https://www.imovirtual.com/..."
                style={{paddingLeft:38}} onKeyDown={e=>e.key==="Enter"&&!loading&&portal&&importarPorLink()}/>
            </div>
            {portal && <p style={{fontSize:12,color:G.green,marginTop:5,display:"flex",alignItems:"center",gap:5}}><Ic n="check" s={12} c={G.green}/> Link {portal} detectado</p>}
            {url && !portal && <p style={{fontSize:12,color:"#E0A052",marginTop:5}}>⚠ Cola um link do Idealista ou Imovirtual</p>}
          </div>
          <div style={{background:`${G.blue}10`,border:`1px solid ${G.blue}30`,borderRadius:8,padding:"11px 14px",marginBottom:12}}>
            <p style={{fontSize:12,color:G.blue,fontWeight:500,marginBottom:4}}>ℹ️ Requer ligação à API</p>
            <p style={{fontSize:12,color:G.textMuted,lineHeight:1.6}}>
              Este método usa IA para aceder ao anúncio. Funciona <strong style={{color:G.text}}>dentro do Claude.ai</strong> ou com o <strong style={{color:G.text}}>backend Node.js</strong> instalado. Se deres erro, usa o método <strong style={{color:G.gold1,cursor:"pointer"}} onClick={()=>{setModo("texto");setError("");}}>Colar Texto →</strong>
            </p>
          </div>
        </>
      )}

      {/* Erro */}
      {error && (
        <div style={{background:`${G.red}15`,border:`1px solid ${G.red}40`,borderRadius:8,padding:"11px 14px",marginBottom:12}}>
          <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom: error.includes("Colar Texto") ? 8 : 0}}>
            <Ic n="x" s={14} c={G.red}/><p style={{fontSize:13,color:G.red}}>{error}</p>
          </div>
          {error.includes("Colar Texto") && (
            <button onClick={()=>{setModo("texto");setError("");}} style={{background:`${G.gold1}20`,border:`1px solid ${G.gold1}40`,borderRadius:6,padding:"6px 12px",cursor:"pointer",color:G.gold1,fontSize:12,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6}}>
              <Ic n="check" s={13} c={G.gold1}/>Mudar para Colar Texto
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{textAlign:"center",padding:"24px 0"}}>
          <div className="spinner spinner-gold" style={{width:30,height:30,margin:"0 auto 12px",borderWidth:3}}/>
          <p className="pulsing" style={{color:G.gold1,fontSize:13}}>{step||"A extrair dados..."}</p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div>
          <div style={{background:`${G.green}10`,border:`1px solid ${G.green}40`,borderRadius:10,padding:16,marginBottom:12}}>
            <p style={{fontSize:12,color:G.green,fontWeight:500,marginBottom:12,display:"flex",alignItems:"center",gap:6}}><Ic n="check" s={14} c={G.green}/> Dados extraídos · Confirma antes de adicionar</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Título",preview.titulo],["Tipo",preview.tipo],["Finalidade",preview.finalidade],["Valor",preview.valor?`${Number(preview.valor).toLocaleString("pt-PT")} €`:"—"],["Área",preview.area?`${preview.area} m²`:"—"],["Quartos",preview.quartos||"—"],["Concelho",preview.concelho||"—"],["Distrito",preview.distrito||"—"]].map(([l,v])=>(
                <div key={l} style={{background:G.surface2,borderRadius:6,padding:"8px 11px"}}>
                  <p style={{fontSize:10,color:G.textDim,marginBottom:2}}>{l.toUpperCase()}</p>
                  <p style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</p>
                </div>
              ))}
            </div>
            {preview.descricao && <p style={{fontSize:11,color:G.textMuted,fontStyle:"italic",marginTop:10,borderTop:`1px solid ${G.border}`,paddingTop:8}}>"{preview.descricao.slice(0,160)}..."</p>}
            {preview.referencia && <p style={{fontSize:11,color:G.textDim,marginTop:6}}>Ref: {preview.referencia} · {preview.portal}</p>}
          </div>
          <div style={{background:`${G.blue}10`,border:`1px solid ${G.blue}30`,borderRadius:8,padding:"9px 13px",marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
            <Ic n="info" s={14} c={G.blue}/>
            <p style={{fontSize:12,color:G.textMuted}}>Podes corrigir qualquer campo depois, editando o imóvel normalmente.</p>
          </div>
        </div>
      )}

      {/* Botões */}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button className="btn-ghost" onClick={()=>{if(preview)resetar();else onClose();}}>{preview?"Corrigir":"Cancelar"}</button>
        {!preview ? (
          modo==="texto"
            ? <button className="btn-gold" onClick={importarPorTexto} disabled={loading||texto.length<30}>Extrair Dados</button>
            : <button className="btn-gold" onClick={importarPorLink} disabled={loading||!portal}><Ic n="link" s={14} c="#0E0E0F"/>{loading?"A importar...":"Importar pelo Link"}</button>
        ) : (
          <button className="btn-gold" onClick={()=>onImport(preview)}><Ic n="check" s={14} c="#0E0E0F"/>Adicionar ao CRM</button>
        )}
      </div>
    </Modal>
  );
};



// ── FICHA DETALHADA DO IMÓVEL ─────────────────────────────────
// Gera PDF de apresentação do imóvel
const gerarFichaPDF=(imovel)=>{
  const fotos=imovel.fotos||[];
  const loc=[imovel.freguesia,imovel.concelho,imovel.distrito].filter(Boolean).join(", ")||imovel.bairro||"—";
  const precoStr=imovel.finalidade==="Arrendamento"?`${fmtFull(imovel.valor)} / mês`:fmtFull(imovel.valor);
  const m2=imovel.area>0?`${Math.round(imovel.valor/imovel.area).toLocaleString("pt-PT")} €/m²`:"";
  const win=window.open("","_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Ficha — ${imovel.titulo}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;color:#1a1a1a;background:#fff}
.page{max-width:800px;margin:0 auto;padding:50px}
.header{background:linear-gradient(135deg,#1a1a1a,#2d2408);color:#fff;padding:36px 50px;margin:-50px -50px 36px;border-bottom:3px solid #C9A84C}
.logo-name{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#C9A84C;letter-spacing:2px}
.logo-sub{font-size:10px;color:#888;letter-spacing:3px;text-transform:uppercase;margin-top:3px}
.title{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;margin:18px 0 4px;color:#fff}
.meta{font-size:13px;color:#aaa}
.price{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:700;color:#8B6914;margin:8px 0 2px}
.price-sub{font-size:12px;color:#888;margin-bottom:20px}
.gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:24px}
.gallery img{width:100%;height:200px;object-fit:cover;border-radius:8px}
.gallery img.cover{grid-column:1/-1;height:320px}
.tags{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
.tag{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500;background:#f5efe0;color:#8B6914}
h2{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#8B6914;border-bottom:1.5px solid #C9A84C;padding-bottom:8px;margin:24px 0 16px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
.box{background:#f9f7f1;border-radius:8px;padding:12px 16px}
.box .l{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.box .v{font-size:15px;font-weight:500;color:#1a1a1a}
.desc{font-size:14px;line-height:1.8;color:#444}
.footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999}
@media print{.no-print{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.btn-print{position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#8B6914,#C9A84C);color:#fff;border:none;padding:14px 28px;border-radius:30px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.2)}
</style></head><body>
<div class="page">
  <div class="header">
    <div class="logo-name">MAGNA</div><div class="logo-sub">Group Real Estate</div>
    <div class="title">${imovel.titulo}</div>
    <div class="meta">${loc}</div>
  </div>
  <div class="price">${precoStr}</div>
  <div class="price-sub">${m2}</div>
  ${fotos.length>0?`<div class="gallery">${fotos.map((src,i)=>`<img src="${src}" class="${i===0&&fotos.length>1?'cover':''}"/>`).join("")}</div>`:""}
  <div class="tags"><span class="tag">${imovel.status}</span><span class="tag">${imovel.finalidade}</span><span class="tag">${imovel.tipo}</span></div>
  <h2>Características</h2>
  <div class="grid">
    <div class="box"><div class="l">Área</div><div class="v">${imovel.area?imovel.area+" m²":"—"}</div></div>
    <div class="box"><div class="l">Quartos</div><div class="v">${imovel.quartos||"—"}</div></div>
    <div class="box"><div class="l">Casas de Banho</div><div class="v">${imovel.casasBanho||"—"}</div></div>
    <div class="box"><div class="l">Tipo</div><div class="v">${imovel.tipo}</div></div>
    <div class="box"><div class="l">Estado</div><div class="v">${imovel.status}</div></div>
    <div class="box"><div class="l">Finalidade</div><div class="v">${imovel.finalidade}</div></div>
  </div>
  <h2>Localização</h2>
  <div class="grid">
    <div class="box"><div class="l">Distrito</div><div class="v">${imovel.distrito||"—"}</div></div>
    <div class="box"><div class="l">Concelho</div><div class="v">${imovel.concelho||"—"}</div></div>
    <div class="box"><div class="l">Freguesia</div><div class="v">${imovel.freguesia||"—"}</div></div>
  </div>
  ${imovel.descricao?`<h2>Descrição</h2><p class="desc">${imovel.descricao}</p>`:""}
  <div class="footer">Magna Group Real Estate · Ficha gerada em ${new Date().toLocaleDateString("pt-PT")}</div>
</div>
<button class="btn-print no-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
</body></html>`);
  win.document.close();
};

// Partilha nativa (telemóvel) com fallback para copiar (computador)
const partilharImovel=async(imovel)=>{
  const loc=[imovel.freguesia,imovel.concelho,imovel.distrito].filter(Boolean).join(", ")||imovel.bairro||"";
  const precoStr=imovel.finalidade==="Arrendamento"?`${fmtFull(imovel.valor)}/mês`:fmtFull(imovel.valor);
  const texto=`🏠 ${imovel.titulo}\n📍 ${loc}\n💶 ${precoStr}\n📐 ${imovel.area||"—"} m² · ${imovel.tipo} · ${imovel.quartos||0} quartos\n${imovel.descricao?"\n"+imovel.descricao.slice(0,200)+"\n":""}\nMagna Group Real Estate`;
  if(navigator.share){
    try{ await navigator.share({title:imovel.titulo,text:texto}); }
    catch(e){ /* utilizador cancelou */ }
  }else{
    try{ await navigator.clipboard.writeText(texto); alert("✓ Resumo do imóvel copiado para a área de transferência!"); }
    catch(e){ alert("Não foi possível partilhar neste dispositivo."); }
  }
};

const ImovelDetalhe=({imovel,onClose,onEdit,onMkt,onDelete,mob})=>{
  const [fotoIdx,setFotoIdx]=useState(0);
  const fotos=imovel.fotos||[];
  const temFotos=fotos.length>0;
  const loc=[imovel.freguesia,imovel.concelho,imovel.distrito].filter(Boolean).join(", ")||imovel.bairro||"—";
  return(
    <Modal title="" onClose={onClose}>
      {/* Galeria */}
      <div style={{margin:"-4px 0 18px"}}>
        {temFotos ? (
          <div>
            <div style={{position:"relative",width:"100%",height:mob?220:300,borderRadius:12,overflow:"hidden",background:G.surface2}}>
              <img src={fotos[fotoIdx]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              {fotos.length>1&&<>
                <button onClick={()=>setFotoIdx(i=>i===0?fotos.length-1:i-1)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,.55)",border:"none",color:"#fff",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                <button onClick={()=>setFotoIdx(i=>i===fotos.length-1?0:i+1)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,.55)",border:"none",color:"#fff",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
                <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.6)",borderRadius:12,padding:"3px 10px",fontSize:12,color:"#fff"}}>{fotoIdx+1} / {fotos.length}</div>
              </>}
            </div>
            {fotos.length>1&&<div style={{display:"flex",gap:6,marginTop:8,overflowX:"auto",paddingBottom:4}}>
              {fotos.map((src,i)=>(
                <img key={i} src={src} alt="" onClick={()=>setFotoIdx(i)} style={{width:54,height:54,borderRadius:6,objectFit:"cover",cursor:"pointer",flexShrink:0,border:i===fotoIdx?`2px solid ${G.gold1}`:"2px solid transparent",opacity:i===fotoIdx?1:.6}}/>
              ))}
            </div>}
          </div>
        ) : (
          <div style={{width:"100%",height:mob?160:200,borderRadius:12,background:G.surface2,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,border:`1px dashed ${G.border}`}}>
            <span style={{fontSize:56}}>{imovel.foto}</span>
            <p style={{fontSize:12,color:G.textDim}}>Sem fotografias · adiciona ao editar</p>
          </div>
        )}
      </div>

      {/* Cabeçalho */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:16}}>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?22:26,fontWeight:600,marginBottom:4}}>{imovel.titulo}</h2>
          <p style={{fontSize:13,color:G.textMuted}}>{loc}</p>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <p style={{fontSize:mob?20:24,fontWeight:700,color:G.gold1,fontFamily:"'Cormorant Garamond',serif"}}>{imovel.finalidade==="Arrendamento"?`${fmtFull(imovel.valor)}`:fmt(imovel.valor)}</p>
          <p style={{fontSize:11,color:G.textDim}}>{imovel.finalidade==="Arrendamento"?"por mês":imovel.area>0?`${Math.round(imovel.valor/imovel.area).toLocaleString("pt-PT")} €/m²`:""}</p>
        </div>
      </div>

      {/* Tags */}
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        <span className={`tag badge-${imovel.status.toLowerCase()}`}>{imovel.status}</span>
        <span className={`tag badge-${imovel.finalidade.toLowerCase().replace("ç","c").replace("ã","a")}`}>{imovel.finalidade}</span>
        <span className="tag" style={{background:`${G.textDim}20`,color:G.textMuted}}>{imovel.tipo}</span>
      </div>

      {/* Características */}
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr",gap:10,marginBottom:18}}>
        {[["Área",imovel.area?`${imovel.area} m²`:"—"],["Quartos",imovel.quartos||"—"],["WC",imovel.casasBanho||"—"],["Tipo",imovel.tipo],["Estado",imovel.status],["Finalidade",imovel.finalidade]].map(([l,v])=>(
          <div key={l} style={{background:G.surface2,borderRadius:8,padding:"10px 14px"}}>
            <p style={{fontSize:10,color:G.textDim,marginBottom:3,textTransform:"uppercase",letterSpacing:".3px"}}>{l}</p>
            <p style={{fontSize:14,fontWeight:500}}>{v}</p>
          </div>
        ))}
      </div>

      {/* Localização detalhada */}
      <div style={{background:G.surface2,borderRadius:8,padding:"12px 14px",marginBottom:18}}>
        <p style={{fontSize:11,color:G.textDim,marginBottom:8,textTransform:"uppercase",letterSpacing:".3px"}}>Localização</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Distrito",imovel.distrito||"—"],["Concelho",imovel.concelho||"—"],["Freguesia",imovel.freguesia||"—"],["Zona/Bairro",imovel.bairro||"—"]].map(([l,v])=>(
            <div key={l}><p style={{fontSize:10,color:G.textDim}}>{l}</p><p style={{fontSize:13,fontWeight:500}}>{v}</p></div>
          ))}
        </div>
      </div>

      {/* Descrição */}
      {imovel.descricao&&<div style={{marginBottom:18}}>
        <p style={{fontSize:11,color:G.textDim,marginBottom:6,textTransform:"uppercase",letterSpacing:".3px"}}>Descrição</p>
        <p style={{fontSize:13,color:G.textMuted,lineHeight:1.7}}>{imovel.descricao}</p>
      </div>}

      {/* Ações */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",borderTop:`1px solid ${G.border}`,paddingTop:16}}>
        <button className="btn-gold" onClick={onMkt} style={{flex:mob?"1 1 100%":1}}><Ic n="spark" s={14} c="#0E0E0F"/>Avaliar com IA</button>
        <button className="btn-ghost" onClick={()=>gerarFichaPDF(imovel)} style={{flex:mob?1:"none"}}><Ic n="pdf" s={14} c={G.gold1}/>Gerar PDF</button>
        <button className="btn-ghost" onClick={()=>partilharImovel(imovel)} style={{flex:mob?1:"none"}}><Ic n="share" s={14} c={G.blue}/>Partilhar</button>
        <button className="btn-ghost" onClick={onEdit} style={{flex:mob?1:"none"}}><Ic n="edit" s={14} c={G.textMuted}/>Editar</button>
        <button className="btn-ghost" onClick={onDelete} style={{flex:mob?1:"none",borderColor:`${G.red}40`,color:G.red}}><Ic n="trash" s={14} c={G.red}/>Eliminar</button>
      </div>
    </Modal>
  );
};

const Imoveis=({imoveis,setImoveis,mob})=>{
  const [search,setSrch]=useState("");
  const [modal,setMod]=useState(false);
  const [importMod,setImportMod]=useState(false);
  const [form,setForm]=useState(emptyIm);
  const [editId,setEditId]=useState(null);
  const [mktIm,setMktIm]=useState(null);
  const [detailIm,setDetailIm]=useState(null);
  const [uploading,setUploading]=useState(false);
  const filtered=imoveis.filter(i=>i.titulo.toLowerCase().includes(search.toLowerCase())||i.bairro.toLowerCase().includes(search.toLowerCase()));
  const save=()=>{if(!form.titulo)return;const d={...form,status:(form.status||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""),valor:Number(form.valor),area:Number(form.area),quartos:Number(form.quartos),fotos:form.fotos||[]};if(editId)setImoveis(p=>p.map(i=>i.id===editId?{...d,id:editId}:i));else setImoveis(p=>[...p,{...d,id:Date.now()}]);setMod(false);setForm(emptyIm);setEditId(null);};
  const onImport=(data)=>{setImoveis(p=>[...p,{...data,id:Date.now(),valor:Number(data.valor),area:Number(data.area),quartos:Number(data.quartos)||0}]);setImportMod(false);};
  // Eliminar imóvel + fotos do Storage
  const eliminar=async(im)=>{
    if(!confirm("Eliminar este imóvel? As fotos também serão apagadas."))return;
    // Apagar fotos do Storage (só URLs da Supabase, ignora base64 antigos)
    const fotosStorage=(im.fotos||[]).filter(f=>typeof f==="string"&&f.startsWith("http"));
    if(fotosStorage.length>0&&dbReady){try{await deleteFotos(fotosStorage);}catch(e){console.warn("erro a apagar fotos:",e);}}
    setImoveis(p=>p.filter(i=>i.id!==im.id));
  };
  const fotos=["🏠","🏡","🏢","🏙️","🌿","🏗️","🏪","🏨"];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:mob?16:24}}>
        <div><h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?22:28,fontWeight:600}}>Imóveis</h1><p style={{color:G.textMuted,fontSize:12,marginTop:2}}>{imoveis.length} em carteira</p></div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn-ghost" style={{padding:mob?"9px 12px":"9px 16px",fontSize:12}} onClick={()=>setImportMod(true)}>
            <Ic n="link" s={14} c={G.gold1}/>
            {!mob && "Importar Anúncio"}
          </button>
          <button className="btn-gold" style={{padding:mob?"9px 14px":"10px 22px",fontSize:12}} onClick={()=>{setForm(emptyIm);setEditId(null);setMod(true);}}>
            <Ic n="plus" s={14} c="#0E0E0F"/>{mob?"Novo":"Novo Imóvel"}
          </button>
        </div>
      </div>
      <div style={{position:"relative",marginBottom:16}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}><Ic n="search2" s={15} c={G.textDim}/></span><input placeholder="Pesquisar..." value={search} onChange={e=>setSrch(e.target.value)} style={{paddingLeft:36}}/></div>

      {/* Desktop table */}
      {!mob&&<>
        <div className="table-row table-header-mob" style={{gridTemplateColumns:"2fr 1fr 1fr 1fr 1.2fr 110px",color:G.textDim,fontSize:11,letterSpacing:".5px",textTransform:"uppercase",cursor:"default"}}>
          <span>Imóvel</span><span>Tipo</span><span>Finalidade</span><span>Estado</span><span>Valor</span><span>Ações</span>
        </div>
        {filtered.map(im=>(
          <div key={im.id} className="table-row" style={{gridTemplateColumns:"2fr 1fr 1fr 1fr 1.2fr 110px",borderBottom:`1px solid ${G.border}`,cursor:"pointer"}} onClick={()=>setDetailIm(im)}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {im.fotos&&im.fotos.length>0
                ? <img src={im.fotos[0]} alt="" style={{width:46,height:46,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
                : <span style={{fontSize:24,width:46,textAlign:"center"}}>{im.foto}</span>}
              <div><p style={{fontSize:14,fontWeight:500}}>{im.titulo}</p><p style={{fontSize:12,color:G.textMuted}}>{im.bairro} · {im.area}m²{im.fotos&&im.fotos.length>0?` · 📷 ${im.fotos.length}`:""}</p></div>
            </div>
            <span style={{fontSize:13,color:G.textMuted}}>{im.tipo}</span>
            <span className={`tag badge-${im.finalidade.toLowerCase().replace("ç","c").replace("ã","a")}`}>{im.finalidade}</span>
            <span className={`tag badge-${im.status.toLowerCase()}`}>{im.status}</span>
            <span style={{fontSize:13,color:G.gold1,fontWeight:500}}>{im.finalidade==="Arrendamento"?`${fmtFull(im.valor)}/mês`:fmt(im.valor)}</span>
            <div style={{display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
              <button title="Ver ficha" onClick={()=>setDetailIm(im)} style={{background:`${G.gold1}20`,border:"none",borderRadius:6,padding:"6px 8px",cursor:"pointer",display:"flex"}}><Ic n="eye" s={14} c={G.gold1}/></button>
              <button title="Avaliar com IA" onClick={()=>setMktIm(im)} style={{background:`${G.purple}20`,border:"none",borderRadius:6,padding:"6px 8px",cursor:"pointer",display:"flex"}}><Ic n="spark" s={14} c={G.purple}/></button>
              <button onClick={()=>{setForm(im);setEditId(im.id);setMod(true);}} style={{background:"none",border:"none",cursor:"pointer",padding:"6px 7px",display:"flex"}}><Ic n="edit" s={14} c={G.textMuted}/></button>
              <button onClick={()=>eliminar(im)} style={{background:"none",border:"none",cursor:"pointer",padding:"6px 7px",display:"flex"}}><Ic n="trash" s={14} c={G.red}/></button>
            </div>
          </div>
        ))}
      </>}

      {/* Mobile cards */}
      {mob&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(im=>(
          <div key={im.id} className="card imovel-card" style={{padding:"14px"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}} onClick={()=>setDetailIm(im)}>
              {im.fotos&&im.fotos.length>0
                ? <img src={im.fotos[0]} alt="" style={{width:64,height:64,borderRadius:10,objectFit:"cover",flexShrink:0}}/>
                : <span style={{fontSize:28,flexShrink:0,width:64,textAlign:"center"}}>{im.foto}</span>}
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:15,fontWeight:600,marginBottom:3}}>{im.titulo}</p>
                <p style={{fontSize:12,color:G.textMuted,marginBottom:8}}>{im.bairro}, {im.cidade} · {im.area}m² · {im.tipo}{im.fotos&&im.fotos.length>0?` · 📷 ${im.fotos.length}`:""}</p>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span className={`tag badge-${im.status.toLowerCase()}`}>{im.status}</span>
                  <span className={`tag badge-${im.finalidade.toLowerCase().replace("ç","c").replace("ã","a")}`}>{im.finalidade}</span>
                  <span style={{fontSize:13,color:G.gold1,fontWeight:600,marginLeft:"auto"}}>{im.finalidade==="Arrendamento"?`${fmtFull(im.valor)}/mês`:fmt(im.valor)}</span>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12,paddingTop:10,borderTop:`1px solid ${G.border}`}}>
              <button onClick={()=>setDetailIm(im)} style={{flex:1,background:`${G.gold1}20`,border:`1px solid ${G.gold1}40`,borderRadius:7,padding:"9px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,color:G.gold1,fontFamily:"'DM Sans',sans-serif"}}><Ic n="eye" s={13} c={G.gold1}/>Ver</button>
              <button onClick={()=>setMktIm(im)} style={{flex:1,background:`${G.purple}20`,border:`1px solid ${G.purple}40`,borderRadius:7,padding:"9px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,color:G.purple,fontFamily:"'DM Sans',sans-serif"}}><Ic n="spark" s={13} c={G.purple}/>IA</button>
              <button onClick={()=>{setForm(im);setEditId(im.id);setMod(true);}} style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:7,padding:"9px 12px",cursor:"pointer",display:"flex"}}><Ic n="edit" s={15} c={G.textMuted}/></button>
              <button onClick={()=>eliminar(im)} style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:7,padding:"9px 12px",cursor:"pointer",display:"flex"}}><Ic n="trash" s={15} c={G.red}/></button>
            </div>
          </div>
        ))}
      </div>}

      {modal&&<Modal title={editId?"Editar Imóvel":"Novo Imóvel"} onClose={()=>setMod(false)}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Título"><input value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} placeholder="Ex: Apartamento T3 Chiado"/></Field></div>
          <Field label="Ícone"><select value={form.foto} onChange={e=>setForm(p=>({...p,foto:e.target.value}))}>{fotos.map(f=><option key={f} value={f}>{f}</option>)}</select></Field>
          <Field label="Tipo"><select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}>{["Apartamento","Moradia","Terreno","Comercial","Escritório"].map(t=><option key={t}>{t}</option>)}</select></Field>
          <Field label="Finalidade"><select value={form.finalidade} onChange={e=>setForm(p=>({...p,finalidade:e.target.value}))}><option>Venda</option><option>Arrendamento</option></select></Field>
          <Field label="Estado"><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option>Disponível</option><option>Reservado</option><option>Vendido</option><option>Arrendado</option></select></Field>
          <Field label="Valor (€)"><input type="number" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))} placeholder="0"/></Field>
          <Field label="Área (m²)"><input type="number" value={form.area} onChange={e=>setForm(p=>({...p,area:e.target.value}))} placeholder="0"/></Field>
          <Field label="Quartos"><input type="number" value={form.quartos} onChange={e=>setForm(p=>({...p,quartos:e.target.value}))} placeholder="0"/></Field>
          <div style={{gridColumn:"1/-1"}}>
            <p style={{fontSize:12,color:G.textMuted,marginBottom:10,textTransform:"uppercase",letterSpacing:".3px"}}>Fotografias</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
              {(form.fotos||[]).map((src,idx)=>(
                <div key={idx} style={{position:"relative",width:80,height:80}}>
                  <img src={src} alt="" style={{width:80,height:80,borderRadius:8,objectFit:"cover"}}/>
                  <button onClick={async()=>{
                    // Apagar do Storage também se for URL Supabase
                    if(dbReady&&typeof src==="string"&&src.startsWith("http")){
                      try{await deleteFoto(src);}catch(e){console.warn("delete foto:",e);}
                    }
                    setForm(p=>({...p,fotos:p.fotos.filter((_,i)=>i!==idx)}));
                  }} style={{position:"absolute",top:-6,right:-6,width:22,height:22,borderRadius:"50%",background:G.red,border:"2px solid "+G.surface1,color:"#fff",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</button>
                </div>
              ))}
              <label style={{width:80,height:80,borderRadius:8,border:`2px dashed ${G.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:uploading?"wait":"pointer",color:G.textMuted,gap:4,opacity:uploading?.5:1}}>
                {uploading?<div className="spinner" style={{width:18,height:18,border:`2px solid ${G.textDim}`,borderTopColor:G.gold1,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>:<><Ic n="plus" s={18} c={G.textMuted}/><span style={{fontSize:10}}>Adicionar</span></>}
                <input type="file" accept="image/*" multiple disabled={uploading} style={{display:"none"}} onChange={async e=>{
                  const files=Array.from(e.target.files||[]);
                  if(files.length===0)return;
                  e.target.value="";
                  if(!dbReady){
                    // Fallback: base64 em memória (sessão apenas)
                    files.forEach(file=>{
                      if(file.size>3*1024*1024){alert(`A foto "${file.name}" é demasiado grande (máx 3MB).`);return;}
                      const reader=new FileReader();
                      reader.onload=ev=>setForm(p=>({...p,fotos:[...(p.fotos||[]),ev.target.result]}));
                      reader.readAsDataURL(file);
                    });
                    return;
                  }
                  // Upload para Supabase Storage
                  setUploading(true);
                  for(const file of files){
                    if(file.size>5*1024*1024){alert(`A foto "${file.name}" é demasiado grande (máx 5MB).`);continue;}
                    try{
                      const url=await uploadFoto(file);
                      setForm(p=>({...p,fotos:[...(p.fotos||[]),url]}));
                    }catch(err){
                      console.error("upload erro:",err);
                      alert(`Erro ao carregar "${file.name}": ${err.message}`);
                    }
                  }
                  setUploading(false);
                }}/>
              </label>
            </div>
            <p style={{fontSize:11,color:G.textDim,marginBottom:14}}>{dbReady?"As fotos ficam guardadas para sempre. Máx 5MB cada. A primeira é a foto de capa.":"As fotos ficam guardadas durante a sessão. Máx 3MB cada."}</p>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <p style={{fontSize:12,color:G.textMuted,marginBottom:10,textTransform:"uppercase",letterSpacing:".3px"}}>Localização</p>
            <LocSelector
              distrito={form.distrito} concelho={form.concelho} freguesia={form.freguesia}
              onChange={({distrito,concelho,freguesia})=>setForm(p=>({...p,distrito,concelho,cidade:concelho,bairro:freguesia||concelho,freguesia}))}
            />
           <div style={{gridColumn:"1/-1"}}><label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",padding:"12px 14px",background:form.destaque?`${G.gold1}15`:G.surface2,borderRadius:8,border:`1px solid ${form.destaque?G.gold1:G.border}`,transition:"all .2s"}}><div onClick={()=>setForm(p=>({...p,destaque:!p.destaque}))} style={{width:44,height:24,borderRadius:12,background:form.destaque?G.gold1:G.border,position:"relative",transition:"background .2s",cursor:"pointer",flexShrink:0}}><div style={{position:"absolute",top:2,left:form.destaque?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/></div><div><p style={{fontSize:13,fontWeight:500,color:form.destaque?G.gold1:G.text}}>Imóvel em Destaque</p><p style={{fontSize:11,color:G.textDim,marginTop:2}}>Aparece na homepage do site público</p></div></label></div>
<Field label="Zona / Bairro (opcional)"><input value={form.bairro} onChange={e=>setForm(p=>({...p,bairro:e.target.value}))} placeholder="Ex: Chiado, Beira Mar..."/></Field>
          </div>
          <div style={{gridColumn:"1/-1"}}><Field label="Descrição"><textarea value={form.descricao||""} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} placeholder="Descrição do imóvel, características principais..." rows={3} style={{resize:"vertical"}}/></Field></div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}><button className="btn-ghost" onClick={()=>setMod(false)}>Cancelar</button><button className="btn-gold" onClick={save}>{editId?"Guardar":"Cadastrar"}</button></div>
      </Modal>}
      {mktIm&&<MarketModal imovel={mktIm} onClose={()=>setMktIm(null)} onPDF={generatePDF}/>}
      {importMod&&<ImportModal onClose={()=>setImportMod(false)} onImport={onImport}/>}
      {detailIm&&<ImovelDetalhe imovel={detailIm} onClose={()=>setDetailIm(null)} onEdit={()=>{setForm(detailIm);setEditId(detailIm.id);setDetailIm(null);setMod(true);}} onMkt={()=>{setMktIm(detailIm);setDetailIm(null);}} onDelete={async()=>{await eliminar(detailIm);setDetailIm(null);}} mob={mob}/>}
    </div>
  );
};

// ── CLIENTES ──────────────────────────────────────────────────
const emptyCl={nome:"",email:"",telefone:"",interesse:"Comprar",orcamento:"",temperatura:"Morno",bairros:"",obs:""};
// ── FICHA DETALHADA DO CLIENTE ────────────────────────────────
const partilharCliente = async (c) => {
  const texto = `👤 ${c.nome}\n📞 ${c.telefone||"—"}\n✉️ ${c.email||"—"}\n💼 ${c.interesse} · Até ${fmtFull(c.orcamento)}${c.interesse==="Arrendar"?"/mês":""}\n📍 ${c.bairros||"—"}\n${c.obs?"\n"+c.obs:""}\n\nMagna Group Real Estate`;
  if (navigator.share) { try { await navigator.share({title:c.nome,text:texto}); } catch {} }
  else { try { await navigator.clipboard.writeText(texto); alert("✓ Contacto copiado!"); } catch { alert("Não foi possível partilhar."); } }
};

const ClienteDetalhe = ({cliente,onClose,onEdit,onDelete,mob}) => {
  const c = cliente;
  return (
    <Modal title="" onClose={onClose}>
      {/* Cabeçalho com avatar */}
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:18,paddingBottom:18,borderBottom:`1px solid ${G.border}`}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${G.goldDark},${G.gold1})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:28,color:"#0E0E0F",flexShrink:0}}>{c.nome.charAt(0)}</div>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?22:26,fontWeight:600,marginBottom:4}}>{c.nome}</h2>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <span className={`tag badge-${c.temperatura.toLowerCase()}`}>{c.temperatura}</span>
            <span className="tag" style={{background:G.surface3,color:G.textMuted}}>{c.interesse}</span>
          </div>
        </div>
      </div>

      {/* Contactos clicáveis */}
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10,marginBottom:18}}>
        {c.telefone && <a href={`tel:${c.telefone.replace(/\s/g,"")}`} style={{textDecoration:"none",background:G.surface2,borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background=G.surface3} onMouseLeave={e=>e.currentTarget.style.background=G.surface2}>
          <div style={{width:36,height:36,borderRadius:8,background:`${G.green}20`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="phone" s={16} c={G.green}/></div>
          <div style={{flex:1,minWidth:0}}><p style={{fontSize:10,color:G.textDim,marginBottom:2,textTransform:"uppercase",letterSpacing:".3px"}}>Telefone</p><p style={{fontSize:14,fontWeight:500,color:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.telefone}</p></div>
        </a>}
        {c.email && <a href={`mailto:${c.email}`} style={{textDecoration:"none",background:G.surface2,borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background=G.surface3} onMouseLeave={e=>e.currentTarget.style.background=G.surface2}>
          <div style={{width:36,height:36,borderRadius:8,background:`${G.blue}20`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="mail" s={16} c={G.blue}/></div>
          <div style={{flex:1,minWidth:0}}><p style={{fontSize:10,color:G.textDim,marginBottom:2,textTransform:"uppercase",letterSpacing:".3px"}}>E-mail</p><p style={{fontSize:14,fontWeight:500,color:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.email}</p></div>
        </a>}
      </div>

      {/* Orçamento e interesse */}
      <div style={{background:`linear-gradient(135deg,${G.gold1}10,${G.goldDark}05)`,border:`1px solid ${G.gold1}30`,borderRadius:10,padding:"16px 18px",marginBottom:18}}>
        <p style={{fontSize:11,color:G.textDim,marginBottom:4,textTransform:"uppercase",letterSpacing:".3px"}}>Orçamento Máximo</p>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?22:28,fontWeight:700,color:G.gold1}}>{c.orcamento?fmtFull(c.orcamento):"—"}{c.interesse==="Arrendar"?" / mês":""}</p>
      </div>

      {/* Zonas */}
      {c.bairros && <div style={{background:G.surface2,borderRadius:8,padding:"12px 14px",marginBottom:18}}>
        <p style={{fontSize:11,color:G.textDim,marginBottom:6,textTransform:"uppercase",letterSpacing:".3px"}}>Zonas de Interesse</p>
        <p style={{fontSize:14,color:G.text}}>📍 {c.bairros}</p>
      </div>}

      {/* Observações */}
      {c.obs && <div style={{marginBottom:18}}>
        <p style={{fontSize:11,color:G.textDim,marginBottom:6,textTransform:"uppercase",letterSpacing:".3px"}}>Observações</p>
        <p style={{fontSize:13,color:G.textMuted,lineHeight:1.7,fontStyle:"italic"}}>{c.obs}</p>
      </div>}

      {/* Ações */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",borderTop:`1px solid ${G.border}`,paddingTop:16}}>
        {c.telefone && <a href={`tel:${c.telefone.replace(/\s/g,"")}`} className="btn-gold" style={{textDecoration:"none",flex:mob?1:"none",justifyContent:"center"}}><Ic n="phone" s={14} c="#0E0E0F"/>Ligar</a>}
        {c.email && <a href={`mailto:${c.email}`} className="btn-ghost" style={{textDecoration:"none",flex:mob?1:"none",justifyContent:"center"}}><Ic n="mail" s={14} c={G.blue}/>Email</a>}
        <button className="btn-ghost" onClick={()=>partilharCliente(c)} style={{flex:mob?1:"none"}}><Ic n="share" s={14} c={G.blue}/>Partilhar</button>
        <button className="btn-ghost" onClick={onEdit} style={{flex:mob?1:"none"}}><Ic n="edit" s={14} c={G.textMuted}/>Editar</button>
        <button className="btn-ghost" onClick={onDelete} style={{flex:mob?1:"none",borderColor:`${G.red}40`,color:G.red}}><Ic n="trash" s={14} c={G.red}/>Eliminar</button>
      </div>
    </Modal>
  );
};

const Clientes=({clientes,setClientes,mob})=>{
  const [search,setSrch]=useState("");
  const [modal,setMod]=useState(false);
  const [form,setForm]=useState(emptyCl);
  const [editId,setEditId]=useState(null);
  const [detailCli,setDetailCli]=useState(null);
  const filtered=clientes.filter(c=>c.nome.toLowerCase().includes(search.toLowerCase())||c.email.toLowerCase().includes(search.toLowerCase()));
  const save=()=>{if(!form.nome)return;if(editId)setClientes(p=>p.map(c=>c.id===editId?{...form,id:editId}:c));else setClientes(p=>[...p,{...form,id:Date.now()}]);setMod(false);setForm(emptyCl);setEditId(null);};
  const eliminar=(c)=>{if(!confirm("Eliminar este cliente?"))return;setClientes(p=>p.filter(x=>x.id!==c.id));};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:mob?16:24}}>
        <div><h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?22:28,fontWeight:600}}>Clientes & Leads</h1><p style={{color:G.textMuted,fontSize:12,marginTop:2}}>{clientes.length} contactos</p></div>
        <button className="btn-gold" style={{padding:mob?"9px 14px":"10px 22px",fontSize:12}} onClick={()=>{setForm(emptyCl);setEditId(null);setMod(true);}}><Ic n="plus" s={14} c="#0E0E0F"/>{mob?"Adicionar":"Novo Lead"}</button>
      </div>
      <div style={{position:"relative",marginBottom:20}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}><Ic n="search2" s={15} c={G.textDim}/></span><input placeholder="Pesquisar..." value={search} onChange={e=>setSrch(e.target.value)} style={{paddingLeft:36}}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
        {filtered.map(c=>(
          <div key={c.id} className="card" style={{cursor:"pointer"}} onClick={()=>setDetailCli(c)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${G.goldDark},${G.gold1})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:17,color:"#0E0E0F"}}>{c.nome.charAt(0)}</div>
                <div><p style={{fontWeight:500,fontSize:15}}>{c.nome}</p><span className={`tag badge-${c.temperatura.toLowerCase()}`}>{c.temperatura}</span></div>
              </div>
              <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>{setForm(c);setEditId(c.id);setMod(true);}} style={{background:"none",border:"none",cursor:"pointer",padding:"5px"}}><Ic n="edit" s={14} c={G.textMuted}/></button>
                <button onClick={()=>eliminar(c)} style={{background:"none",border:"none",cursor:"pointer",padding:"5px"}}><Ic n="trash" s={14} c={G.red}/></button>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              <div style={{display:"flex",gap:8}}><Ic n="mail" s={13} c={G.textDim}/><span style={{fontSize:13,color:G.textMuted}}>{c.email}</span></div>
              <div style={{display:"flex",gap:8}}><Ic n="phone" s={13} c={G.textDim}/><span style={{fontSize:13,color:G.textMuted}}>{c.telefone}</span></div>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <span className="tag" style={{background:G.surface3,color:G.textMuted}}>{c.interesse}</span>
                <span style={{fontSize:12,color:G.gold1,fontWeight:500}}>Até {fmtFull(c.orcamento)}{c.interesse==="Arrendar"?"/mês":""}</span>
              </div>
              {c.obs&&<p style={{fontSize:12,color:G.textDim,fontStyle:"italic",borderTop:`1px solid ${G.border}`,paddingTop:8,marginTop:4}}>{c.obs.slice(0,80)}{c.obs.length>80?"…":""}</p>}
            </div>
          </div>
        ))}
      </div>
      {detailCli && <ClienteDetalhe cliente={detailCli} onClose={()=>setDetailCli(null)} onEdit={()=>{setForm(detailCli);setEditId(detailCli.id);setDetailCli(null);setMod(true);}} onDelete={()=>{eliminar(detailCli);setDetailCli(null);}} mob={mob}/>}
      {modal&&<Modal title={editId?"Editar Cliente":"Novo Lead"} onClose={()=>setMod(false)}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Nome completo"><input value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} placeholder="Nome do cliente"/></Field></div>
          <Field label="E-mail"><input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="email@exemplo.pt"/></Field>
          <Field label="Telefone"><input value={form.telefone} onChange={e=>setForm(p=>({...p,telefone:e.target.value}))} placeholder="912 345 678"/></Field>
          <Field label="Interesse"><select value={form.interesse} onChange={e=>setForm(p=>({...p,interesse:e.target.value}))}><option>Comprar</option><option>Arrendar</option><option>Vender</option></select></Field>
          <Field label="Temperatura"><select value={form.temperatura} onChange={e=>setForm(p=>({...p,temperatura:e.target.value}))}><option>Quente</option><option>Morno</option><option>Frio</option></select></Field>
          <Field label="Orçamento (€)"><input type="number" value={form.orcamento} onChange={e=>setForm(p=>({...p,orcamento:e.target.value}))}/></Field>
          <Field label="Zonas de Interesse"><input value={form.bairros} onChange={e=>setForm(p=>({...p,bairros:e.target.value}))} placeholder="Ex: Chiado, Príncipe Real"/></Field>
          <div style={{gridColumn:"1/-1"}}><Field label="Observações"><textarea rows={3} value={form.obs} onChange={e=>setForm(p=>({...p,obs:e.target.value}))} placeholder="Notas sobre o cliente..."/></Field></div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}><button className="btn-ghost" onClick={()=>setMod(false)}>Cancelar</button><button className="btn-gold" onClick={save}>{editId?"Guardar":"Adicionar"}</button></div>
      </Modal>}
    </div>
  );
};

// ── AGENDA ────────────────────────────────────────────────────
// ── ICS EXPORT ───────────────────────────────────────────────
const exportICS = (tarefa) => {
  const pad = n => String(n).padStart(2,'0');
  const toICSDate = (dateStr, timeStr) => {
    const [y,m,d] = dateStr.split('-');
    const [h,min] = (timeStr||'09:00').split(':');
    return `${y}${pad(Number(m))}${pad(Number(d))}T${pad(Number(h))}${pad(Number(min))}00`;
  };
  const dtStart = toICSDate(tarefa.data, tarefa.hora);
  const [h] = (tarefa.hora||'09:00').split(':');
  const endH = String(Number(h)+1).padStart(2,'0');
  const [,min2] = (tarefa.hora||'09:00').split(':');
  const dtEnd = toICSDate(tarefa.data, `${endH}:${min2}`);
  const uid = `magna-${tarefa.id}@magna.pt`;
  const tIcoTxt = {Visita:"🏠",Reunião:"👥",Ligação:"📞",Documento:"📄"};
  const emoji = tIcoTxt[tarefa.tipo]||"📌";
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0',
    'PRODID:-//Magna Group Real Estate//CRM//PT',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(new Date().toISOString().split('T')[0],'00:00')}`,
    `DTSTART:${dtStart}`,`DTEND:${dtEnd}`,
    `SUMMARY:${emoji} ${tarefa.titulo}`,
    `DESCRIPTION:${tarefa.tipo}${tarefa.cliente?' — '+tarefa.cliente:''}\nPrioridade: ${tarefa.prioridade}${tarefa.local?'\nLocal: '+tarefa.local:''}\nMagna Group Real Estate`,
    `CATEGORIES:${tarefa.tipo.toUpperCase()}`,
    tarefa.local?`LOCATION:${tarefa.local}`:'',
    'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([ics],{type:'text/calendar;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=`magna-${tarefa.titulo.replace(/\s+/g,'-').toLowerCase().slice(0,40)}.ics`; a.click();
  URL.revokeObjectURL(url);
};

// ── CALENDAR ─────────────────────────────────────────────────
const CalendarioMes = ({tarefas,mesAtual,setMesAtual,onDiaClick,diaDest}) => {
  const ano=mesAtual.getFullYear(), mes=mesAtual.getMonth();
  const hoje=new Date().toISOString().split('T')[0];
  const nomeMes=mesAtual.toLocaleDateString('pt-PT',{month:'long',year:'numeric'});
  const primeiroDia=new Date(ano,mes,1).getDay();
  const diasMes=new Date(ano,mes+1,0).getDate();
  const offset=(primeiroDia+6)%7;
  const tarefasPorDia={};
  tarefas.forEach(t=>{if(!tarefasPorDia[t.data])tarefasPorDia[t.data]=[];tarefasPorDia[t.data].push(t);});
  const semanas=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const cells=[];
  for(let i=0;i<offset;i++)cells.push(null);
  for(let d=1;d<=diasMes;d++)cells.push(d);
  return(
    <div className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:`1px solid ${G.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>setMesAtual(new Date(ano,mes-1,1))} style={{background:'none',border:`1px solid ${G.border}`,borderRadius:6,padding:'4px 10px',cursor:'pointer',color:G.textMuted,fontSize:16}}>‹</button>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:600,textTransform:'capitalize',minWidth:160,textAlign:'center'}}>{nomeMes}</h3>
          <button onClick={()=>setMesAtual(new Date(ano,mes+1,1))} style={{background:'none',border:`1px solid ${G.border}`,borderRadius:6,padding:'4px 10px',cursor:'pointer',color:G.textMuted,fontSize:16}}>›</button>
        </div>
        <button onClick={()=>setMesAtual(new Date())} style={{background:`${G.gold1}15`,border:`1px solid ${G.gold1}40`,borderRadius:6,padding:'5px 12px',cursor:'pointer',color:G.gold1,fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>Hoje</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:`1px solid ${G.border}`}}>
        {semanas.map(s=><div key={s} style={{padding:'7px 4px',textAlign:'center',fontSize:10,color:G.textDim,fontWeight:500,letterSpacing:'.5px',borderRight:`1px solid ${G.border}`}}>{s}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
        {cells.map((d,i)=>{
          if(!d)return<div key={`e${i}`} style={{minHeight:64,borderRight:`1px solid ${G.border}`,borderBottom:`1px solid ${G.border}`,background:G.surface2}}/>;
          const ds=`${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const tfs=tarefasPorDia[ds]||[];
          const isHoje=ds===hoje;
          const isDest=ds===diaDest;
          const isWeekend=(i%7)>=5;
          const temPend=tfs.some(t=>!t.concluida);
          return(
            <div key={d} onClick={()=>onDiaClick(ds,tfs)}
              style={{minHeight:64,borderRight:`1px solid ${G.border}`,borderBottom:`1px solid ${G.border}`,padding:'5px 6px',cursor:'pointer',background:isDest?`${G.green}20`:isHoje?`${G.gold1}12`:isWeekend?G.surface2:G.surface,transition:'background .15s',outline:isDest?`2px solid ${G.green}`:'none',outlineOffset:'-2px'}}
              onMouseEnter={e=>e.currentTarget.style.background=`${G.surface3}`}
              onMouseLeave={e=>e.currentTarget.style.background=isDest?`${G.green}20`:isHoje?`${G.gold1}12`:isWeekend?G.surface2:G.surface}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:3}}>
                <span style={{fontSize:12,fontWeight:isHoje?700:400,color:isHoje?G.gold1:isWeekend?G.textDim:G.text,width:22,height:22,borderRadius:'50%',background:isHoje?`${G.gold1}25`:'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>{d}</span>
                {tfs.length>0&&<span style={{fontSize:9,background:temPend?`${G.red}20`:`${G.green}20`,color:temPend?G.red:G.green,padding:'1px 5px',borderRadius:8,fontWeight:600}}>{tfs.length}</span>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                {tfs.slice(0,2).map(t=>(
                  <div key={t.id} style={{fontSize:9,padding:'1px 4px',borderRadius:3,background:t.concluida?`${G.textDim}20`:`${G.blue}20`,color:t.concluida?G.textDim:G.blue,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.4}}>
                    {t.hora} {t.titulo}
                  </div>
                ))}
                {tfs.length>2&&<div style={{fontSize:9,color:G.textDim}}>+{tfs.length-2}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── AGENDA ────────────────────────────────────────────────────
const emptyT2={titulo:"",cliente:"",data:"2026-05-22",hora:"09:00",tipo:"Visita",prioridade:"Média",concluida:false,local:"",notas:""};
// ── FICHA DETALHADA DA TAREFA ─────────────────────────────────
const TarefaDetalhe = ({tarefa,onClose,onEdit,onDelete,onToggle,onExportICS,mob}) => {
  const t = tarefa;
  const tIco = {Visita:"🏠",Reunião:"👥",Ligação:"📞",Documento:"📄"};
  const priorCor = {Alta:G.red,Média:"#E0A052",Baixa:G.textDim};
  const dataFmt = new Date(t.data+"T12:00").toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  return (
    <Modal title="" onClose={onClose}>
      {/* Cabeçalho com tipo e estado */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,paddingBottom:16,borderBottom:`1px solid ${G.border}`}}>
        <div style={{width:54,height:54,borderRadius:12,background:t.concluida?`${G.green}20`:`${G.gold1}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>{tIco[t.tipo]||"📌"}</div>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?20:24,fontWeight:600,marginBottom:4,textDecoration:t.concluida?"line-through":"none",color:t.concluida?G.textDim:G.text}}>{t.titulo}</h2>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <span className="tag" style={{background:G.surface3,color:G.textMuted}}>{t.tipo}</span>
            <span className={`tag badge-${t.prioridade.toLowerCase().replace("é","e")}`}>{t.prioridade}</span>
            {t.concluida && <span className="tag" style={{background:`${G.green}20`,color:G.green}}>✓ Concluída</span>}
          </div>
        </div>
      </div>

      {/* Data e hora destacadas */}
      <div style={{background:`linear-gradient(135deg,${G.gold1}10,${G.goldDark}05)`,border:`1px solid ${G.gold1}30`,borderRadius:10,padding:"16px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:44,height:44,borderRadius:8,background:`${G.gold1}25`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic n="calendar" s={20} c={G.gold1}/></div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontSize:11,color:G.textDim,marginBottom:3,textTransform:"uppercase",letterSpacing:".3px"}}>Quando</p>
          <p style={{fontSize:mob?14:16,fontWeight:500,textTransform:"capitalize"}}>{dataFmt}</p>
          <p style={{fontSize:13,color:G.gold1,fontWeight:600,marginTop:2}}>⏰ {t.hora}</p>
        </div>
      </div>

      {/* Cliente associado */}
      {t.cliente && <div style={{background:G.surface2,borderRadius:8,padding:"12px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${G.goldDark},${G.gold1})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:15,color:"#0E0E0F",flexShrink:0}}>{t.cliente.charAt(0)}</div>
        <div style={{flex:1,minWidth:0}}><p style={{fontSize:10,color:G.textDim,marginBottom:2,textTransform:"uppercase",letterSpacing:".3px"}}>Cliente</p><p style={{fontSize:14,fontWeight:500}}>{t.cliente}</p></div>
      </div>}

      {/* Local */}
      {t.local && <div style={{background:G.surface2,borderRadius:8,padding:"12px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:8,background:`${G.blue}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>📍</div>
        <div style={{flex:1,minWidth:0}}><p style={{fontSize:10,color:G.textDim,marginBottom:2,textTransform:"uppercase",letterSpacing:".3px"}}>Local</p><p style={{fontSize:14,fontWeight:500}}>{t.local}</p></div>
      </div>}

      {/* Notas */}
      {t.notas && <div style={{marginBottom:16}}>
        <p style={{fontSize:11,color:G.textDim,marginBottom:6,textTransform:"uppercase",letterSpacing:".3px"}}>Notas</p>
        <p style={{fontSize:13,color:G.textMuted,lineHeight:1.7,background:G.surface2,padding:"12px 14px",borderRadius:8}}>{t.notas}</p>
      </div>}

      {/* Ações */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",borderTop:`1px solid ${G.border}`,paddingTop:16}}>
        <button className="btn-gold" onClick={onToggle} style={{flex:mob?"1 1 100%":1}}><Ic n="check" s={14} c="#0E0E0F"/>{t.concluida?"Marcar Pendente":"Concluir"}</button>
        <button className="btn-ghost" onClick={onExportICS} style={{flex:mob?1:"none"}}><Ic n="calendar" s={14} c={G.blue}/>Calendário</button>
        <button className="btn-ghost" onClick={onEdit} style={{flex:mob?1:"none"}}><Ic n="edit" s={14} c={G.textMuted}/>Editar</button>
        <button className="btn-ghost" onClick={onDelete} style={{flex:mob?1:"none",borderColor:`${G.red}40`,color:G.red}}><Ic n="trash" s={14} c={G.red}/>Eliminar</button>
      </div>
    </Modal>
  );
};

const Agenda=({tarefas,setTarefas,clientes,mob})=>{
  const [modal,setMod]=useState(false);
  const [form,setForm]=useState(emptyT2);
  const [editId,setEditId]=useState(null);
  const [filtro,setFiltro]=useState("Todas");
  const [vista,setVista]=useState("lista");
  const [mesAtual,setMesAtual]=useState(new Date());
  const [diaModal,setDiaModal]=useState(null);
  const [icsOk,setIcsOk]=useState(null);
  const [diaDest,setDiaDest]=useState(null); // dia a destacar após criar
  const [detailT,setDetailT]=useState(null);
  const filtered=tarefas.filter(t=>filtro==="Todas"?true:filtro==="Pendentes"?!t.concluida:t.concluida);

  const save=(irCalendario=false)=>{
    if(!form.titulo)return;
    const nova={...form,id:editId||Date.now()};
    if(editId)setTarefas(p=>p.map(t=>t.id===editId?nova:t));
    else setTarefas(p=>[...p,nova]);
    setMod(false);setForm(emptyT2);setEditId(null);
    if(irCalendario&&nova.data){
      // Navega para o mês da tarefa e destaca o dia
      const [y,m] = nova.data.split('-');
      setMesAtual(new Date(Number(y),Number(m)-1,1));
      setVista("calendario");
      setDiaDest(nova.data);
      setTimeout(()=>setDiaDest(null),3000);
    }
  };
  const exportarEMostrar=(t)=>{exportICS(t);setIcsOk(t.id);setTimeout(()=>setIcsOk(null),3000);};
  const toggleConcluida=(t)=>setTarefas(p=>p.map(x=>x.id===t.id?{...x,concluida:!x.concluida}:x));
  const eliminar=(t)=>{if(!confirm("Eliminar esta tarefa?"))return;setTarefas(p=>p.filter(x=>x.id!==t.id));};
  const tIco={Visita:"🏠",Reunião:"👥",Ligação:"📞",Documento:"📄"};
  const priorCor={Alta:G.red,Média:"#E0A052",Baixa:G.textDim};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:mob?14:20}}>
        <div><h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?22:28,fontWeight:600}}>Agenda & Tarefas</h1><p style={{color:G.textMuted,fontSize:12,marginTop:2}}>{tarefas.filter(t=>!t.concluida).length} pendentes</p></div>
        <button className="btn-gold" style={{padding:mob?"9px 14px":"10px 22px",fontSize:12}} onClick={()=>{setForm(emptyT2);setEditId(null);setMod(true);}}><Ic n="plus" s={14} c="#0E0E0F"/>{mob?"Criar":"Nova Tarefa"}</button>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:6}}>
          {["Todas","Pendentes","Concluídas"].map(f=><button key={f} onClick={()=>setFiltro(f)} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${filtro===f?G.gold1:G.border}`,background:filtro===f?G.gold1+"15":"transparent",color:filtro===f?G.gold1:G.textMuted,cursor:"pointer",fontSize:12}}>{f}</button>)}
        </div>
        <div style={{display:"flex",gap:4,background:G.surface2,borderRadius:8,padding:3}}>
          {[["lista","☰ Lista"],["calendario","📅 Calendário"]].map(([v,l])=>(
            <button key={v} onClick={()=>setVista(v)} style={{padding:"6px 12px",borderRadius:6,border:"none",background:vista===v?G.surface3:"transparent",color:vista===v?G.gold1:G.textMuted,cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>{l}</button>
          ))}
        </div>
      </div>

      {vista==="calendario"&&(
        <>
          <CalendarioMes tarefas={tarefas} mesAtual={mesAtual} setMesAtual={setMesAtual} onDiaClick={(date,tfs)=>setDiaModal({date,tfs})} diaDest={diaDest}/>
          <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:2,background:`${G.blue}50`}}/><span style={{fontSize:11,color:G.textDim}}>Pendente</span></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:2,background:`${G.textDim}40`}}/><span style={{fontSize:11,color:G.textDim}}>Concluída</span></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:`${G.gold1}30`,border:`1px solid ${G.gold1}`}}/><span style={{fontSize:11,color:G.textDim}}>Hoje</span></div>
          </div>
        </>
      )}

      {vista==="lista"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.length===0&&<div style={{textAlign:"center",padding:"50px 0",color:G.textDim}}><p style={{fontSize:28,marginBottom:8}}>✓</p><p>Sem tarefas</p></div>}
          {filtered.sort((a,b)=>a.data.localeCompare(b.data)).map(t=>(
            <div key={t.id} className="card" style={{display:"flex",alignItems:"center",gap:10,opacity:t.concluida?.55:1,padding:"13px 14px",cursor:"pointer"}} onClick={()=>setDetailT(t)}>
              <button onClick={e=>{e.stopPropagation();toggleConcluida(t);}} style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${t.concluida?G.green:G.border}`,background:t.concluida?G.green:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{t.concluida&&<Ic n="check" s={11} c="#fff"/>}</button>
              <span style={{fontSize:18,flexShrink:0}}>{tIco[t.tipo]||"📌"}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:14,fontWeight:500,textDecoration:t.concluida?"line-through":"none",color:t.concluida?G.textDim:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</p>
                <p style={{fontSize:11,color:G.textMuted,marginTop:1}}>{t.cliente&&`${t.cliente} · `}{t.tipo}</p>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}><p style={{fontSize:12,fontWeight:500,color:G.gold1}}>{t.hora}</p><p style={{fontSize:10,color:G.textDim}}>{t.data.split("-").reverse().join("/")}</p></div>
              <span className={`tag badge-${t.prioridade.toLowerCase().replace("é","e")}`} style={{flexShrink:0,fontSize:10}}>{t.prioridade}</span>
              {icsOk===t.id&&<span style={{fontSize:10,color:G.green,flexShrink:0}}>✓ics</span>}
              <div style={{display:"flex",gap:2,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                <button title="Adicionar ao Calendário (.ics)" onClick={()=>exportarEMostrar(t)} style={{background:`${G.blue}15`,border:"none",borderRadius:6,padding:"5px 6px",cursor:"pointer",display:"flex"}}><Ic n="calendar" s={14} c={G.blue}/></button>
                <button onClick={()=>{setForm(t);setEditId(t.id);setMod(true);}} style={{background:"none",border:"none",cursor:"pointer",padding:"5px 6px",display:"flex"}}><Ic n="edit" s={14} c={G.textMuted}/></button>
                <button onClick={()=>eliminar(t)} style={{background:"none",border:"none",cursor:"pointer",padding:"5px 6px",display:"flex"}}><Ic n="trash" s={14} c={G.red}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {diaModal&&(
        <Modal title={new Date(diaModal.date+'T12:00').toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long'})} onClose={()=>setDiaModal(null)}>
          {diaModal.tfs.length===0?(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <p style={{color:G.textMuted,fontSize:14,marginBottom:16}}>Sem tarefas neste dia.</p>
              <button className="btn-gold" onClick={()=>{setForm({...emptyT2,data:diaModal.date});setDiaModal(null);setMod(true);}}><Ic n="plus" s={14} c="#0E0E0F"/>Nova Tarefa</button>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {diaModal.tfs.map(t=>(
                <div key={t.id} style={{background:G.surface2,borderRadius:8,padding:"13px 14px",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:3,height:36,borderRadius:2,background:priorCor[t.prioridade]||G.textDim,flexShrink:0}}/>
                  <span style={{fontSize:18}}>{tIco[t.tipo]||"📌"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:500,fontSize:14,textDecoration:t.concluida?"line-through":"none",color:t.concluida?G.textDim:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</p>
                    <p style={{fontSize:11,color:G.textMuted,marginTop:2}}>{t.hora} · {t.tipo}{t.cliente&&` · ${t.cliente}`}</p>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>exportarEMostrar(t)} style={{background:`${G.blue}20`,border:`1px solid ${G.blue}40`,borderRadius:7,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,color:G.blue,fontFamily:"'DM Sans',sans-serif"}}>
                      <Ic n="calendar" s={12} c={G.blue}/>{icsOk===t.id?"✓":"📥"}
                    </button>
                    <button onClick={()=>{setForm(t);setEditId(t.id);setDiaModal(null);setMod(true);}} style={{background:"none",border:`1px solid ${G.border}`,borderRadius:7,padding:"6px 8px",cursor:"pointer",display:"flex"}}><Ic n="edit" s={13} c={G.textMuted}/></button>
                  </div>
                </div>
              ))}
              <button className="btn-gold" style={{marginTop:4}} onClick={()=>{setForm({...emptyT2,data:diaModal.date});setDiaModal(null);setMod(true);}}><Ic n="plus" s={14} c="#0E0E0F"/>Nova Tarefa Neste Dia</button>
            </div>
          )}
        </Modal>
      )}

      {modal&&(
        <Modal title={editId?"Editar Tarefa":"Nova Tarefa"} onClose={()=>setMod(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{gridColumn:"1/-1"}}><Field label="Título *"><input value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} placeholder="Ex: Visita ao apartamento"/></Field></div>
            <Field label="Cliente"><select value={form.cliente} onChange={e=>setForm(p=>({...p,cliente:e.target.value}))}><option value="">Seleccionar...</option>{clientes.map(c=><option key={c.id}>{c.nome}</option>)}</select></Field>
            <Field label="Tipo"><select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}><option>Visita</option><option>Reunião</option><option>Ligação</option><option>Documento</option></select></Field>
            <Field label="Data"><input type="date" value={form.data} onChange={e=>setForm(p=>({...p,data:e.target.value}))}/></Field>
            <Field label="Hora"><input type="time" value={form.hora} onChange={e=>setForm(p=>({...p,hora:e.target.value}))}/></Field>
            <Field label="Prioridade"><select value={form.prioridade} onChange={e=>setForm(p=>({...p,prioridade:e.target.value}))}><option>Alta</option><option>Média</option><option>Baixa</option></select></Field>
            <div style={{gridColumn:"1/-1"}}><Field label="Local (opcional)"><input value={form.local||""} onChange={e=>setForm(p=>({...p,local:e.target.value}))} placeholder="Ex: Rua de Santa Catarina, Porto"/></Field></div>
            <div style={{gridColumn:"1/-1"}}><Field label="Notas (opcional)"><textarea rows={2} value={form.notas||""} onChange={e=>setForm(p=>({...p,notas:e.target.value}))} placeholder="Detalhes adicionais..."/></Field></div>
          </div>
          <div style={{background:`${G.blue}10`,border:`1px solid ${G.blue}30`,borderRadius:8,padding:"11px 14px",marginTop:4,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Ic n="calendar" s={15} c={G.blue}/>
              <div><p style={{fontSize:13,fontWeight:500,color:G.blue}}>Adicionar ao Calendário</p><p style={{fontSize:11,color:G.textMuted}}>Exporta .ics para Google Calendar, Apple ou Outlook</p></div>
            </div>
            <button onClick={()=>exportarEMostrar(form)} className="btn-ghost" style={{borderColor:G.blue,color:G.blue,padding:"6px 12px",fontSize:11,flexShrink:0}}>
              {icsOk===form.id?"✓ Exportado":"Exportar .ics"}
            </button>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:14,flexWrap:"wrap"}}>
            <button className="btn-ghost" onClick={()=>setMod(false)}>Cancelar</button>
            {!editId && (
              <button className="btn-ghost" style={{borderColor:G.blue,color:G.blue}} onClick={()=>save(true)} disabled={!form.titulo}>
                <Ic n="calendar" s={14} c={G.blue}/>Ver no Calendário
              </button>
            )}
            <button className="btn-gold" onClick={()=>save(false)} disabled={!form.titulo}>
              {editId?"Guardar":"Criar Tarefa"}
            </button>
          </div>
        </Modal>
      )}
      {detailT && <TarefaDetalhe tarefa={detailT} onClose={()=>setDetailT(null)} onEdit={()=>{setForm(detailT);setEditId(detailT.id);setDetailT(null);setMod(true);}} onDelete={()=>{eliminar(detailT);setDetailT(null);}} onToggle={()=>{toggleConcluida(detailT);setDetailT(p=>({...p,concluida:!p.concluida}));}} onExportICS={()=>exportarEMostrar(detailT)} mob={mob}/>}
    </div>
  );
};
const Dashboard=({imoveis,clientes,tarefas,user,setPage,mob})=>{
  const disp=imoveis.filter(i=>i.status==="Disponível").length;
  const qt=clientes.filter(c=>c.temperatura==="Quente").length;
  const pend=tarefas.filter(t=>!t.concluida).length;
  const vgv=imoveis.filter(i=>i.finalidade==="Venda"&&i.status!=="Vendido").reduce((a,b)=>a+b.valor,0);
  const stats=[
    {l:"Imóveis",v:disp,i:"building",c:G.gold1},
    {l:"Leads Quentes",v:qt,i:"trend",c:G.red},
    {l:"Pendentes",v:pend,i:"calendar",c:G.blue},
    {l:"VGV",v:fmt(vgv),i:"home",c:G.green},
  ];
  const hr=new Date().getHours();
  const saud=hr<12?"Bom dia":hr<18?"Boa tarde":"Boa noite";
  return(
    <div>
      <div style={{marginBottom:mob?18:28}}>
        <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?24:32,fontWeight:600,marginBottom:4}}>
          {saud}, <span className="gg">{user.nome.split(" ")[0]}</span> ✦
        </h1>
        <p style={{color:G.textMuted,fontSize:mob?12:14}}>{user.cargo} · Magna Group Real Estate</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:mob?10:14,marginBottom:mob?16:24}}>
        {stats.map((s,i)=>(
          <div key={i} className="stat-card" style={{padding:mob?"14px 14px":"18px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <p style={{fontSize:mob?10:12,color:G.textMuted,marginBottom:mob?5:8}}>{s.l}</p>
                <p style={{fontSize:mob?22:28,fontFamily:"'Cormorant Garamond',serif",fontWeight:700,color:s.c}}>{s.v}</p>
              </div>
              <div style={{padding:mob?7:10,borderRadius:8,background:s.c+"15"}}><Ic n={s.i} s={mob?16:20} c={s.c}/></div>
            </div>
          </div>
        ))}
      </div>

      <div onClick={()=>setPage("prospeccao")} style={{background:`linear-gradient(135deg,${G.purple}18,${G.goldDark}18)`,border:`1px solid ${G.purple}40`,borderRadius:12,padding:mob?"14px 16px":"18px 24px",marginBottom:mob?16:24,cursor:"pointer",display:"flex",alignItems:"center",gap:mob?12:16}}>
        <div style={{padding:mob?8:12,borderRadius:10,background:`${G.purple}25`,flexShrink:0}}><Ic n="spark" s={mob?18:24} c={G.purple}/></div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontWeight:500,fontSize:mob?13:15,marginBottom:2}}>✨ Prospecção com IA</p>
          <p style={{fontSize:mob?11:13,color:G.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:mob?"nowrap":"normal"}}>Analise preços e tendências em tempo real</p>
        </div>
        <span style={{color:G.purple,fontSize:mob?16:20,flexShrink:0}}>→</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.2fr 1fr",gap:16}}>
        <div className="card" style={{padding:mob?"14px":"20px"}}>
          <p style={{fontSize:12,color:G.textMuted,marginBottom:14,textTransform:"uppercase",letterSpacing:".5px"}}>Imóveis Recentes</p>
          {imoveis.slice(0,mob?3:4).map(im=>(
            <div key={im.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${G.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:mob?18:22}}>{im.foto}</span><div><p style={{fontSize:mob?13:14,fontWeight:500,marginBottom:2}}>{im.titulo}</p><p style={{fontSize:11,color:G.textMuted}}>{im.bairro} · {im.tipo}</p></div></div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <p style={{fontSize:mob?12:13,color:G.gold1,fontWeight:500}}>{im.finalidade==="Arrendamento"?`${fmtFull(im.valor)}/mês`:fmt(im.valor)}</p>
                <span className={`tag badge-${im.status.toLowerCase()}`} style={{fontSize:9}}>{im.status}</span>
              </div>
            </div>
          ))}
        </div>
        {!mob&&<div className="card">
          <p style={{fontSize:12,color:G.textMuted,marginBottom:16,textTransform:"uppercase",letterSpacing:".5px"}}>Próximas Tarefas</p>
          {tarefas.filter(t=>!t.concluida).slice(0,4).map(t=>(
            <div key={t.id} style={{display:"flex",gap:12,padding:"11px 0",borderBottom:`1px solid ${G.border}`,alignItems:"flex-start"}}>
              <div style={{width:8,height:8,borderRadius:"50%",marginTop:5,flexShrink:0,background:t.prioridade==="Alta"?G.red:t.prioridade==="Média"?"#E0A052":G.textDim}}/>
              <div style={{flex:1}}><p style={{fontSize:14,fontWeight:500,marginBottom:2}}>{t.titulo}</p><p style={{fontSize:12,color:G.textMuted}}>{t.cliente}</p></div>
              <span style={{fontSize:11,color:G.textDim,flexShrink:0}}>{t.data.split("-").reverse().join("/")}</span>
            </div>
          ))}
        </div>}
        {mob&&<div className="card" style={{padding:"14px"}}>
          <p style={{fontSize:12,color:G.textMuted,marginBottom:12,textTransform:"uppercase",letterSpacing:".5px"}}>Tarefas Pendentes</p>
          {tarefas.filter(t=>!t.concluida).slice(0,3).map(t=>(
            <div key={t.id} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:`1px solid ${G.border}`,alignItems:"center"}}>
              <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:t.prioridade==="Alta"?G.red:t.prioridade==="Média"?"#E0A052":G.textDim}}/>
              <div style={{flex:1,minWidth:0}}><p style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</p></div>
              <span style={{fontSize:11,color:G.textDim,flexShrink:0}}>{t.hora}</span>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
};

// ── APP ROOT ──────────────────────────────────────────────────
export default function App() {
  const [user,setUser]         = useState(null);
  const [page,setPage]         = useState("dashboard");
  const [imoveis,setImoveis]   = useState([]);
  const [clientes,setClientes] = useState([]);
  const [tarefas,setTarefas]   = useState([]);
  const [loading,setLoading]   = useState(false);
  const [bootLoading,setBootLoading] = useState(true);
  const mob                    = useIsMobile();

  // Recuperar sessão no arranque
  useEffect(() => {
    (async () => {
      if (!dbReady) { setBootLoading(false); return; }
      try {
        const u = await dbUtilizadores.getSession();
        if (u) setUser(u);
      } catch (e) { console.warn("getSession:", e); }
      setBootLoading(false);
    })();
  }, []);

  // Wrapper de estado para os dados — escreve na BD e actualiza localmente
  const makeDBWrapper = (collection, db, setLocal) => {
    return async (updater) => {
      // updater pode ser uma função (prev => newArr) — calcular o novo estado
      let oldList, newList;
      setLocal(prev => {
        oldList = prev;
        newList = typeof updater === "function" ? updater(prev) : updater;
        return newList;
      });
      if (!dbReady) return; // sem BD, fica só local
      // Considera "id da BD" aqueles que são números pequenos (auto-incrementados pela BD)
      // IDs temporários gerados por Date.now() são > 1e12
      const isDBId = (id) => typeof id === "number" && id < 1e12 && id > 0;
      const oldIds = new Set(oldList.map(x => x.id));
      const newIds = new Set(newList.map(x => x.id));
      const added = newList.filter(x => !oldIds.has(x.id));
      const removed = oldList.filter(x => !newIds.has(x.id) && isDBId(x.id));
      const updated = newList.filter(x => {
        if (!isDBId(x.id)) return false; // só faz update se já tem id da BD
        if (!oldIds.has(x.id)) return false;
        const oldItem = oldList.find(o => o.id === x.id);
        return JSON.stringify(oldItem) !== JSON.stringify(x);
      });
      try {
        for (const item of added) {
          const saved = await db.insert(item);
          if (saved && saved.id !== item.id) {
            // Trocar o id temporário pelo id da BD
            setLocal(prev => prev.map(x => x.id === item.id ? { ...saved } : x));
          }
        }
        for (const item of updated) await db.update(item.id, item);
        for (const item of removed) await db.remove(item.id);
      } catch (e) {
        console.error("DB sync error:", e.message);
        alert("Erro ao guardar na base de dados: " + e.message);
      }
    };
  };

  const wImoveis = makeDBWrapper("imoveis", dbImoveis, setImoveis);
  const wClientes = makeDBWrapper("clientes", dbClientes, setClientes);
  const wTarefas = makeDBWrapper("tarefas", dbTarefas, setTarefas);

  // Carregar dados da BD quando o utilizador entrar
  useEffect(() => {
    if (!user || !dbReady) return;
    setLoading(true);
    (async () => {
      try {
        const [im, cl, ta] = await Promise.all([
          dbImoveis.list(),
          dbClientes.list(),
          dbTarefas.list(),
        ]);
        setImoveis(im);
        setClientes(cl);
        setTarefas(ta);
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Logout — terminar sessão Supabase
  const handleLogout = async () => {
    if (dbReady) { try { await dbUtilizadores.signOut(); } catch {} }
    setUser(null);
    setPage("dashboard");
  };

  // Ecrã de loading durante o boot (a verificar sessão)
  if (bootLoading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:G.bg,flexDirection:"column",gap:18}}>
      <style>{css}</style>
      <div className="spinner" style={{width:32,height:32,borderWidth:3,borderColor:`${G.gold1}30`,borderTopColor:G.gold1}}/>
      <p style={{color:G.textMuted,fontSize:13}}>A carregar...</p>
    </div>
  );

  if (!user) return <LoginScreen onLogin={u=>{setUser(u);setPage("dashboard");}}/>;

 const nav=[
  {id:"dashboard",   label:"Início",       icon:"home"},
  {id:"angariações", label:"Angariações",  icon:"file"},
  {id:"imoveis",     label:"Imóveis",      icon:"building"},
  {id:"clientes",    label:"Clientes",     icon:"users"},
  {id:"funil",       label:"Funil",        icon:"chart"},
  {id:"agenda",      label:"Agenda",       icon:"calendar"},
  {id:"prospeccao",  label:"IA",           icon:"spark"},
];

  const pendentes = tarefas.filter(t=>!t.concluida).length;

  return(
    <>
      <style>{css}</style>

      {/* ── Desktop layout ── */}
      {!mob && (
        <div style={{display:"flex",height:"100vh",overflow:"hidden",background:G.bg}}>
          <aside style={{width:224,flexShrink:0,borderRight:`1px solid ${G.border}`,background:G.surface,display:"flex",flexDirection:"column",padding:"20px 12px"}}>
            <div style={{padding:"0 6px 20px",borderBottom:`1px solid ${G.border}`,marginBottom:16}}><Logo/></div>
            <nav style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
              {nav.map(n=>(
                <div key={n.id} className={`nav-item${page===n.id?" active":""}`} onClick={()=>setPage(n.id)}>
                  <Ic n={n.icon} s={16} c={page===n.id?G.gold1:G.textDim}/>
                  <span>{n.id==="prospeccao"?"Prospecção IA":n.label}</span>
                  {n.id==="agenda"&&pendentes>0&&<span style={{marginLeft:"auto",background:G.red,color:"#fff",borderRadius:10,fontSize:10,padding:"1px 6px",fontWeight:600}}>{pendentes}</span>}
                  {n.id==="prospeccao"&&<span style={{marginLeft:"auto",background:`${G.purple}30`,color:G.purple,borderRadius:10,fontSize:9,padding:"1px 6px",fontWeight:600,letterSpacing:".5px"}}>IA</span>}
                </div>
              ))}
            </nav>
            <div style={{borderTop:`1px solid ${G.border}`,paddingTop:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 8px",borderRadius:8,background:G.surface2}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${G.goldDark},${G.gold1})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:14,color:"#0E0E0F",flexShrink:0}}>{user.avatar}</div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:500,color:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.nome.split(" ")[0]}</p>
                  <p style={{fontSize:11,color:G.textDim}}>{user.cargo}</p>
                </div>
                <button onClick={handleLogout} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",opacity:.6}} title="Terminar sessão">
                  <Ic n="logout" s={16} c={G.red}/>
                </button>
              </div>
            </div>
          </aside>
          <main style={{flex:1,overflow:"auto",padding:32}}>
            {page==="dashboard"&&<Dashboard imoveis={imoveis} clientes={clientes} tarefas={tarefas} user={user} setPage={setPage} mob={false}/>}
            {page==="angariações"&&<Angariações user={user} mob={false} setImoveis={wImoveis} setPage={setPage}/>}
            {page==="imoveis"&&<Imoveis imoveis={imoveis} setImoveis={wImoveis} mob={false}/>}
            {page==="clientes"&&<Clientes clientes={clientes} setClientes={wClientes} mob={false}/>}
            {page==="agenda"&&<Agenda tarefas={tarefas} setTarefas={wTarefas} clientes={clientes} mob={false}/>}
            {page==="funil"&&<Funil mob={false}/>}
            {page==="prospeccao"&&<ProspeccaoPanel mob={false}/>}
            {page==="utilizadores"&&<GestaoUtilizadores currentUser={user}/>}
          </main>
        </div>
      )}

   {/* ── Mobile layout ── */}
      {mob && (
        <div style={{display:"flex",flexDirection:"column",height:"100vh",background:G.bg,overflow:"hidden"}}>
          {/* Top bar */}
          <div style={{background:G.surface,borderBottom:`1px solid ${G.border}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <Logo/>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>setPage("utilizadores")} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",flexDirection:"column",gap:3}}>
                <div style={{width:18,height:2,background:"rgba(245,239,227,0.5)",borderRadius:1}}/>
                <div style={{width:18,height:2,background:"rgba(245,239,227,0.5)",borderRadius:1}}/>
                <div style={{width:18,height:2,background:"rgba(245,239,227,0.5)",borderRadius:1}}/>
              </button>
              <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${G.goldDark},${G.gold1})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:14,color:"#0E0E0F"}}>{user.avatar}</div>
              <button onClick={handleLogout} style={{background:"none",border:"none",cursor:"pointer",padding:"6px",display:"flex"}}>
                <Ic n="logout" s={18} c={G.red}/>
              </button>
            </div>
          </div>
          {/* Main scrollable content */}
          <main style={{flex:1,overflow:"auto",padding:"20px 16px",paddingBottom:80}}>
            {page==="dashboard"&&<Dashboard imoveis={imoveis} clientes={clientes} tarefas={tarefas} user={user} setPage={setPage} mob={true}/>}
            {page==="angariações"&&<Angariações user={user} mob={true} setImoveis={wImoveis} setPage={setPage}/>}
            {page==="imoveis"&&<Imoveis imoveis={imoveis} setImoveis={wImoveis} mob={true}/>}
            {page==="clientes"&&<Clientes clientes={clientes} setClientes={wClientes} mob={true}/>}
            {page==="agenda"&&<Agenda tarefas={tarefas} setTarefas={wTarefas} clientes={clientes} mob={true}/>}
            {page==="funil"&&<Funil mob={true}/>}
            {page==="prospeccao"&&<ProspeccaoPanel mob={true}/>}
            {page==="utilizadores"&&<GestaoUtilizadores currentUser={user}/>}
          </main>

          {/* Bottom navigation */}
          <div className="bottom-nav">
            {nav.map(n=>(
              <div key={n.id} className={`bnav-item${page===n.id?" active":""}`} onClick={()=>setPage(n.id)}>
                <div className="bnav-icon" style={{color:page===n.id?G.gold1:G.textDim}}>
                  <Ic n={n.icon} s={22} c={page===n.id?G.gold1:G.textDim}/>
                </div>
                <span className="bnav-label" style={{color:page===n.id?G.gold1:G.textDim}}>{n.label}</span>
                {n.id==="agenda"&&pendentes>0&&<div className="bnav-dot"/>}
                {n.id==="prospeccao"&&<div className="bnav-dot-purple"/>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
