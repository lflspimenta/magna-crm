import { useState, useEffect, useRef } from "react";
import React from "react";
import { dbReady, dbImoveis, dbClientes, dbTarefas, dbAngariacoes, dbUtilizadores, uploadFoto, deleteFoto, deleteFotos, dbLeadsGestao, dbLeadsAquisicao, dbLeadsHabitar, dbProprietarios, dbDocsProprietario, uploadDocumento, deleteDocumento, dbVisitas } from "./db.js";
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
    key:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
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

// ── Extracção de dados de documentos (Fase 2 - Proprietários) ──
// Envia um documento (PDF/imagem) em base64 e devolve o texto da resposta
const callClaudeDoc = async (base64Data, mediaType, prompt) => {
  const isPdf = mediaType === "application/pdf";
  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } };

  const body = JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
  });

  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || String(data.error));
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  if (!text) throw new Error("Resposta vazia da análise.");
  return text;
};

// Prompts de extracção por tipo de documento
const PROMPTS_EXTRACAO = {
  "Caderneta Predial": "Extrai desta caderneta predial os seguintes dados em JSON (usa null se não encontrares): {\"artigo_matricial\":\"...\",\"fracao\":\"...\",\"area_total\":\"...\",\"area_privativa\":\"...\",\"afetacao\":\"...\",\"titulares\":[{\"nome\":\"...\",\"nif\":\"...\"}],\"morada_predio\":\"...\",\"data_emissao\":\"AAAA-MM-DD\"}. A data de emissão costuma aparecer no rodapé ou cabeçalho do documento. Responde APENAS com o JSON, sem markdown nem explicações.",
  "Certidão Permanente": "Extrai desta certidão permanente os seguintes dados em JSON (usa null se não encontrares): {\"descricao_predial\":\"...\",\"data_emissao\":\"AAAA-MM-DD\",\"onus_encargos\":\"...\",\"titulares\":[{\"nome\":\"...\",\"nif\":\"...\"}]}. A validade é 6 meses após a data de emissão. Responde APENAS com o JSON.",
  "Certificado Energético": "Extrai deste certificado energético os seguintes dados em JSON (usa null se não encontrares): {\"classe_energetica\":\"...\",\"numero_ce\":\"...\",\"validade\":\"AAAA-MM-DD\",\"morada\":\"...\"}. Responde APENAS com o JSON.",
  "CMI": "Extrai deste contrato de mediação imobiliária os seguintes dados em JSON (usa null se não encontrares): {\"proprietario\":\"...\",\"nif_proprietario\":\"...\",\"mediadora\":\"...\",\"prazo_meses\":0,\"data_assinatura\":\"AAAA-MM-DD\",\"validade\":\"AAAA-MM-DD\",\"comissao\":\"...\",\"regime\":\"...\"}. A validade é a data de assinatura mais o prazo. Responde APENAS com o JSON.",
  "Documento de Identificação": "Extrai deste documento de identificação os seguintes dados em JSON (usa null se não encontrares): {\"nome_completo\":\"...\",\"nif\":\"...\",\"numero_documento\":\"...\",\"validade\":\"AAAA-MM-DD\",\"data_nascimento\":\"AAAA-MM-DD\"}. Responde APENAS com o JSON.",
  "Procuração": "Extrai desta procuração os seguintes dados em JSON (usa null se não encontrares): {\"outorgante\":\"...\",\"nif_outorgante\":\"...\",\"procurador\":\"...\",\"nif_procurador\":\"...\",\"poderes\":\"...\",\"validade\":\"AAAA-MM-DD\",\"data\":\"AAAA-MM-DD\"}. Responde APENAS com o JSON.",
  "Licença de Utilização": "Extrai desta licença de utilização os seguintes dados em JSON (usa null se não encontrares): {\"numero_licenca\":\"...\",\"data_emissao\":\"AAAA-MM-DD\",\"camara_municipal\":\"...\",\"finalidade\":\"...\",\"morada\":\"...\"}. Responde APENAS com o JSON.",
  "Ficha Técnica de Habitação": "Extrai desta ficha técnica de habitação os seguintes dados em JSON (usa null se não encontrares): {\"numero_ficha\":\"...\",\"data\":\"AAAA-MM-DD\",\"morada\":\"...\",\"promotor\":\"...\"}. Responde APENAS com o JSON.",
};

// Converte um File em base64 (sem o prefixo data:)
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(",")[1]);
  reader.onerror = () => reject(new Error("Falha ao ler o ficheiro"));
  reader.readAsDataURL(file);
});

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
const MarketModal = ({imovel,onClose,onPDF,onSaved}) => {
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
- Valor actual: ${fmtFull(imovel.valor)}${imovel.tipoAtivo === "terreno" ? `

ESPECIFICAÇÕES DO TERRENO (factores decisivos para o valor):
- Projecto de construção aprovado: ${imovel.temProjetoAprovado ? "Sim" : "Não"}
- Topografia: ${imovel.topografia || "Desconhecida"}
- Viabilidade construtiva / PIP: ${imovel.viabilidadeConstrutivaPip || "Não especificada"}
- Infraestruturas básicas disponíveis: ${(imovel.infraestruturasBasicas||[]).join(", ") || "Não especificadas"}
Considera estes factores na avaliação — um terreno com projecto aprovado e infraestruturas vale significativamente mais do que um terreno rústico sem viabilidade construtiva definida.` : ""}

Faz no máximo 2 pesquisas web para obter preço de venda por m² e renda mensal média nesta zona:
1. "${imovel.tipo} ${zona} preço euros m² Idealista Imovirtual 2026"
2. "arrendamento ${imovel.tipo} ${zona} renda mensal Portugal"

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
  "rendaMensalEstimada": <número, valor médio de arrendamento mensal para imóvel semelhante na zona>,
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
      // Guardar a avaliação no imóvel para reutilizar no Dossier Investidor
      if (dbReady && imovel.id) {
        try { await dbImoveis.update(imovel.id, { avaliacaoIA: json }); onSaved && onSaved(json); }
        catch (e) { console.error("guardar avaliacaoIA:", e); }
      }
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
// ── Ficha de Visita (Fase 3) ─────────────────────────────
const htmlFichaVisita = (v, imovel, incluirPrint = true) => {
  const dataFmt = new Date(v.data).toLocaleDateString("pt-PT");
  const loc = imovel ? [imovel.morada, imovel.freguesia, imovel.concelho, imovel.distrito].filter(Boolean).join(", ") : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Ficha de Visita — ${v.clienteNome}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;color:#1a1a1a;background:#fff;font-size:14px;line-height:1.6}
.page{max-width:780px;margin:0 auto;padding:50px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #C9A84C}
.logo-name{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#8B6914;letter-spacing:2px}
.logo-sub{font-size:10px;color:#888;letter-spacing:3px;text-transform:uppercase;margin-top:3px}
.title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;text-align:right;color:#1a1a1a}
h2{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#8B6914;border-bottom:1px solid #e8d5a0;padding-bottom:6px;margin:24px 0 14px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}
.field{padding:10px 14px;background:#f9f7f1;border-radius:6px;border-left:3px solid #C9A84C}
.field-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.field-value{font-size:14px;font-weight:500;color:#1a1a1a}
.clausula{margin-bottom:14px;padding:14px 16px;background:#fafafa;border-radius:6px;border:1px solid #eee}
.clausula p{font-size:13px;color:#444;line-height:1.7}
.sig-area{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px}
.sig-box{text-align:center}
.sig-img{height:70px;display:block;margin:0 auto 8px;max-width:220px}
.sig-line{border-top:1px solid #333;padding-top:8px;font-size:12px;color:#555}
.footer{margin-top:36px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#999;text-align:center}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="page">

<div class="header">
  <div>
    <svg width="44" height="38" viewBox="0 0 80 70"><defs><linearGradient id="g"><stop offset="0%" stop-color="#8B6914"/><stop offset="100%" stop-color="#C9A84C"/></linearGradient></defs><path d="M5 65 L5 30 L25 10 L40 25 L55 10 L75 30 L75 65" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 65 L20 45 L40 25 L60 45 L60 65" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="logo-name">MAGNA</div>
    <div class="logo-sub">Group Real Estate · Portugal</div>
  </div>
  <div style="text-align:right">
    <div class="title">Ficha de Visita</div>
    <div style="font-size:12px;color:#888;margin-top:6px">Data: ${dataFmt}${v.hora?` · ${v.hora}`:""} · Ref: FV-${Date.now().toString().slice(-6)}</div>
  </div>
</div>

<h2>1. Identificação do Visitante</h2>
<div class="grid2">
  ${[["Nome",v.clienteNome],["NIF",v.clienteNif||"—"],["Contacto",v.clienteContacto||"—"],["Data da Visita",`${dataFmt}${v.hora?` às ${v.hora}`:""}`]].map(([l,val])=>`<div class="field"><div class="field-label">${l}</div><div class="field-value">${val}</div></div>`).join("")}
</div>

<h2>2. Imóvel Visitado</h2>
<div class="grid2">
  ${[["Imóvel",v.imovelTitulo||(imovel?imovel.titulo:"—")],["Localização",loc||"—"],["Tipo",imovel?imovel.tipo:"—"],["Valor",imovel?`${Number(imovel.valor).toLocaleString("pt-PT")} €`:"—"]].map(([l,val])=>`<div class="field"><div class="field-label">${l}</div><div class="field-value">${val}</div></div>`).join("")}
</div>
${v.notas?`<div class="field" style="margin-top:10px"><div class="field-label">Observações</div><div class="field-value" style="font-size:13px;color:#555">${v.notas}</div></div>`:""}

<h2>3. Declaração</h2>
<div class="clausula"><p>O VISITANTE declara que tomou conhecimento do imóvel acima identificado por intermédio da <strong>Magna Group Real Estate</strong>, na pessoa do agente <strong>${v.agenteNome}</strong>, na data indicada. Mais declara que não conhecia o imóvel nem tinha sido informado da sua disponibilidade por qualquer outro meio, reconhecendo a intervenção da mediadora na apresentação do mesmo.</p></div>
<div class="clausula"><p>Qualquer negócio celebrado sobre o imóvel apresentado, directamente ou por interposta pessoa, no prazo de 12 meses após esta visita, reconhece a intermediação da Magna Group Real Estate para todos os efeitos, incluindo o direito à respectiva remuneração.</p></div>

<div class="sig-area">
  <div class="sig-box">
    <p style="font-size:12px;color:#888;margin-bottom:8px">O Visitante</p>
    ${v.sigCliente?`<img src="${v.sigCliente}" class="sig-img" alt="Assinatura"/>`:`<div style="height:70px;border-bottom:1px solid #333;margin-bottom:8px"></div>`}
    <div class="sig-line">${v.clienteNome}${v.clienteNif?`<br/><span style="color:#888">NIF: ${v.clienteNif}</span>`:""}</div>
  </div>
  <div class="sig-box">
    <p style="font-size:12px;color:#888;margin-bottom:8px">Pela Mediadora</p>
    ${v.sigAgente?`<img src="${v.sigAgente}" class="sig-img" alt="Assinatura Agente"/>`:`<div style="height:70px;border-bottom:1px solid #333;margin-bottom:8px"></div>`}
    <div class="sig-line">${v.agenteNome}<br/><span style="color:#888">Magna Group Real Estate</span></div>
  </div>
</div>

<div class="footer">
  Magna Group Real Estate · Ficha de visita gerada em ${new Date().toLocaleDateString("pt-PT")} · Documento com valor probatório da apresentação do imóvel.
</div>
</div>${incluirPrint?`<script>window.print();window.onafterprint=()=>window.close();</scr`+`ipt>`:""}</body></html>`;
};

// ── Ficha BC/FT + Consentimento RGPD (Lei 83/2017) ──────
const htmlBCFT = (d, sig, agente, incluirPrint = true) => {
  const hoje = new Date().toLocaleDateString("pt-PT");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Ficha BC/FT e RGPD — ${d.nome}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;color:#1a1a1a;background:#fff;font-size:14px;line-height:1.6}
.page{max-width:780px;margin:0 auto;padding:50px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #C9A84C}
.logo-name{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#8B6914;letter-spacing:2px}
.logo-sub{font-size:10px;color:#888;letter-spacing:3px;text-transform:uppercase;margin-top:3px}
.title{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;text-align:right;color:#1a1a1a;max-width:320px}
h2{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#8B6914;border-bottom:1px solid #e8d5a0;padding-bottom:6px;margin:24px 0 14px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}
.field{padding:10px 14px;background:#f9f7f1;border-radius:6px;border-left:3px solid #C9A84C}
.field-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.field-value{font-size:14px;font-weight:500;color:#1a1a1a}
.clausula{margin-bottom:14px;padding:14px 16px;background:#fafafa;border-radius:6px;border:1px solid #eee}
.clausula p{font-size:12.5px;color:#444;line-height:1.7}
.sig-area{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px}
.sig-box{text-align:center}
.sig-img{height:70px;display:block;margin:0 auto 8px;max-width:220px}
.sig-line{border-top:1px solid #333;padding-top:8px;font-size:12px;color:#555}
.footer{margin-top:36px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#999;text-align:center}
.quebra{page-break-before:always;margin-top:40px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="page">

<div class="header">
  <div>
    <svg width="44" height="38" viewBox="0 0 80 70"><defs><linearGradient id="g"><stop offset="0%" stop-color="#8B6914"/><stop offset="100%" stop-color="#C9A84C"/></linearGradient></defs><path d="M5 65 L5 30 L25 10 L40 25 L55 10 L75 30 L75 65" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 65 L20 45 L40 25 L60 45 L60 65" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="logo-name">MAGNA</div>
    <div class="logo-sub">Group Real Estate · Portugal</div>
  </div>
  <div style="text-align:right">
    <div class="title">Ficha de Identificação BC/FT<br/><span style="font-size:13px;color:#888">Lei n.º 83/2017, de 18 de agosto</span></div>
    <div style="font-size:12px;color:#888;margin-top:6px">Data: ${hoje} · Ref: BCFT-${Date.now().toString().slice(-6)}</div>
  </div>
</div>

<h2>1. Identificação do Cliente</h2>
<div class="grid2">
  ${[["Nome completo",d.nome],["NIF",d.nif||"—"],["Documento de identificação",d.docIdentificacao||"—"],["Validade do documento",d.docValidade?new Date(d.docValidade).toLocaleDateString("pt-PT"):"—"],["Data de nascimento",d.dataNascimento?new Date(d.dataNascimento).toLocaleDateString("pt-PT"):"—"],["Nacionalidade",d.nacionalidade||"—"],["Profissão",d.profissao||"—"],["Contacto",d.contacto||"—"]].map(([l,v])=>`<div class="field"><div class="field-label">${l}</div><div class="field-value">${v}</div></div>`).join("")}
  <div class="field" style="grid-column:1/-1"><div class="field-label">Morada</div><div class="field-value">${d.morada||"—"}</div></div>
</div>

<h2>2. Natureza da Relação de Negócio</h2>
<div class="grid2">
  ${[["Qualidade",d.qualidade||"—"],["Origem dos fundos",d.origemFundos||"N/A"]].map(([l,v])=>`<div class="field"><div class="field-label">${l}</div><div class="field-value">${v}</div></div>`).join("")}
</div>

<h2>3. Declarações</h2>
<div class="clausula"><p>O CLIENTE declara que os dados acima prestados são verdadeiros e completos, e que actua em nome próprio${d.beneficiario?"":" e é o beneficiário efectivo da operação"}. Declara ainda ter conhecimento de que a Magna Group Real Estate, enquanto entidade obrigada nos termos da Lei n.º 83/2017, de 18 de agosto, está sujeita a deveres de identificação, diligência, comunicação e conservação de documentos no âmbito da prevenção do branqueamento de capitais e do financiamento do terrorismo.</p></div>
<div class="clausula"><p>O CLIENTE compromete-se a comunicar qualquer alteração aos dados constantes desta ficha e a fornecer os documentos comprovativos que venham a ser solicitados no âmbito dos deveres legais da mediadora.</p></div>

<div class="quebra"></div>
<div class="header">
  <div>
    <div class="logo-name">MAGNA</div>
    <div class="logo-sub">Group Real Estate · Portugal</div>
  </div>
  <div style="text-align:right">
    <div class="title">Consentimento de Tratamento de Dados<br/><span style="font-size:13px;color:#888">RGPD — Regulamento (UE) 2016/679</span></div>
  </div>
</div>

<h2>Consentimento RGPD</h2>
<div class="clausula"><p>O titular dos dados, acima identificado, autoriza a <strong>Magna Group Real Estate</strong> a recolher e tratar os seus dados pessoais para as seguintes finalidades: (i) prestação de serviços de mediação imobiliária; (ii) cumprimento de obrigações legais, incluindo as decorrentes da Lei n.º 83/2017; (iii) comunicações relacionadas com os serviços contratados.</p></div>
<div class="clausula"><p>Os dados serão conservados pelo período necessário às finalidades indicadas ou pelo prazo legal aplicável. O titular pode exercer, a qualquer momento, os direitos de acesso, rectificação, apagamento, limitação, portabilidade e oposição, mediante contacto com a Magna Group Real Estate. Tem ainda o direito de apresentar reclamação à CNPD.</p></div>
<div class="clausula"><p>Os dados não serão transmitidos a terceiros, salvo obrigação legal ou necessidade estrita da execução do serviço (ex.: entidades bancárias, notários, conservatórias), nem serão utilizados para outras finalidades sem novo consentimento.</p></div>

<div class="sig-area">
  <div class="sig-box">
    <p style="font-size:12px;color:#888;margin-bottom:8px">O Cliente / Titular dos Dados</p>
    ${sig?`<img src="${sig}" class="sig-img" alt="Assinatura"/>`:`<div style="height:70px;border-bottom:1px solid #333;margin-bottom:8px"></div>`}
    <div class="sig-line">${d.nome}${d.nif?`<br/><span style="color:#888">NIF: ${d.nif}</span>`:""}</div>
  </div>
  <div class="sig-box">
    <p style="font-size:12px;color:#888;margin-bottom:8px">Pela Mediadora</p>
    <div style="height:70px;border-bottom:1px solid #333;margin-bottom:8px"></div>
    <div class="sig-line">${agente?agente.nome:"—"}<br/><span style="color:#888">Magna Group Real Estate</span></div>
  </div>
</div>

<div class="footer">
  Magna Group Real Estate · Documento gerado em ${hoje} · Ficha BC/FT (Lei 83/2017) e Consentimento RGPD · Conservar por 7 anos.
</div>
</div>${incluirPrint?`<script>window.print();window.onafterprint=()=>window.close();</scr`+`ipt>`:""}</body></html>`;
};

const gerarPDFBCFT = (d, sig, agente) => {
  const win = window.open("","_blank");
  win.document.write(htmlBCFT(d, sig, agente, true));
  win.document.close();
};

const gerarPDFVisita = (v, imovel, agente) => {
  const win = window.open("","_blank");
  win.document.write(htmlFichaVisita(v, imovel, true));
  win.document.close();
};

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
      // Ligação ao proprietário (criado quando a angariação foi assinada)
      proprietario_id: form.proprietario_id || null,
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

  // Cria ou associa o proprietário quando a angariação é assinada
  const ligarProprietario = async (ang) => {
    if (!dbReady || !ang || ang.proprietario_id) return ang;
    try {
      let prop = null;
      if (ang.propNif) {
        const todos = await dbProprietarios.list();
        prop = todos.find(p => p.nif && p.nif === ang.propNif) || null;
      }
      if (!prop) {
        prop = await dbProprietarios.insert({
          nome: ang.propNome || "Proprietário", nif: ang.propNif || "",
          email: ang.propEmail || "", telefone: ang.propTelefone || "",
          morada: ang.propMorada || "", notas: "", estado: "Activo",
        });
      }
      const updated = await dbAngariacoes.update(ang.id, { ...ang, proprietario_id: prop.id });
      return { ...updated, proprietario_id: prop.id };
    } catch (e) { console.error("ligar proprietario:", e); return ang; }
  };

  const concluirAssinatura = async () => {
    const item = {...form, id: editId, sigProp, sigAgente, estado:"Assinado", dataModif: new Date().toISOString()};
    let saved = await saveToDB(item);
    saved = await ligarProprietario(saved);
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
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn-ghost" style={{padding:mob?"9px 12px":"10px 16px",fontSize:12,borderColor:`${G.gold1}50`,color:G.gold1}} onClick={() => gerarDossierConstrutor()}>
            <Ic n="pdf" s={14} c={G.gold1}/>
            {!mob && "Dossier Institucional"}
          </button>
          
          <button className="btn-gold" style={{padding:mob?"9px 14px":"10px 22px",fontSize:12}} onClick={nova}>
            <Ic n="plus" s={14} c="#0E0E0F"/>{mob?"Nova":"Nova Angariação"}
          </button>
        </div>
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
            <input type="number" value={form.comissao} onChange={e=>setForm(p=>({...p,comissao:e.target.value}))} step="0.5" min="0" max="10" placeholder="5"/>
          </Field>
          <Field label="Valor Fixo (€)">
            <input type="number" value={form.comissaoFixa || ""} onChange={e=>setForm(p=>({...p,comissaoFixa:e.target.value}))} placeholder="0"/>
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

// ── IMÓVEIS E CLIENTES (Estados Iniciais) ──────────────────────
const emptyIm={titulo:"",tipo:"Apartamento",tipoAtivo:"habitacao",finalidade:"Venda",status:"Disponível",valor:"",area:"",quartos:"",bairro:"",distrito:"",concelho:"",cidade:"",freguesia:"",foto:"🏠",descricao:"",fotos:[],destaque:false, publicado:false, proprietario_id:null, servicoGestaoArrendamento:false, servicoAlojamentoLocal:false, servicoPropertyCaretaker:false, servicoRequalificacao:false, temProjetoAprovado:false, viabilidadeConstrutivaPip:"", infraestruturasBasicas:[], topografia:""};

const emptyCl={nome:"",email:"",telefone:"",interesse:"Comprar",orcamento:"",temperatura:"Morno",bairros:"",tipologia:[],obs:"", perfilCliente:"comprador_tradicional", requisitosEspecificos:{}};

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

  // ── Importar por link (fetch directo ao portal + Haiku, sem pesquisa web) ──
  const importarPorLink = async () => {
    if (!portal) { setError("Cola um link válido do Idealista ou Imovirtual."); return; }
    setLoad(true); setError(""); setPreview(null);
    try {
      setStep(`🔍 A aceder ao anúncio no ${portal}...`);
      const res = await fetch("/api/extract-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error || !data.html) throw new Error(data.error || "Não foi possível aceder ao anúncio.");

      setStep("🤖 A extrair dados com IA...");
      const prompt = `Extrai os dados deste anúncio imobiliário português. O conteúdo foi obtido directamente da página do anúncio (${portal}).

CONTEÚDO DA PÁGINA:
"""
${data.html.slice(0, 20000)}
"""

Devolve APENAS JSON válido (sem markdown, sem explicações):
{"titulo":"<título curto e descritivo>","tipo":"<Apartamento|Moradia|Terreno|Comercial|Escritório>","finalidade":"<Venda|Arrendamento>","valor":<número sem símbolos>,"area":<número em m²>,"quartos":<número, ex: T3 = 3>,"casasBanho":<número>,"freguesia":"<freguesia se mencionada>","concelho":"<concelho>","distrito":"<distrito>","bairro":"<zona/bairro>","descricao":"<resumo até 300 chars>","referencia":"<referência do anúncio se houver>","encontrado":true}

Regras:
- Se um campo não existir na página, usa "" para texto ou 0 para números.
- "valor" é o preço (remove € e espaços). Se for arrendamento, é o valor mensal.
- "quartos": extrai de T0/T1/T2/T3... (tipologia).
- Identifica o distrito a partir do concelho se possível (ex: Cascais → Lisboa; Barcelos → Braga).
- Se a página não tiver dados imobiliários (ex: anúncio removido, página de erro): {"encontrado":false,"motivo":"Anúncio não encontrado ou removido"}`;

      const raw = await callClaude(prompt, "claude-haiku-4-5", false);
      setStep("📋 A preparar pré-visualização...");
      const json = parseJSON(raw);
      if (!json) throw new Error("Não foi possível processar a resposta da IA.");
      if (json.encontrado === false) throw new Error(json.motivo || "Anúncio não encontrado. Verifica se o link está correcto e activo.");
      json.foto = fotoMap[json.tipo] || "🏠";
      json.status = "Disponível";
      json.cidade = json.concelho || "";
      json.portal = portal;
      setPreview(json);
    } catch(e) {
      const msg = e.message||"";
      setError((msg || "Erro ao importar.") + " Tenta \"Colar Texto\" em alternativa.");
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
            <p style={{fontSize:12,color:G.blue,fontWeight:500,marginBottom:4}}>ℹ️ Acesso directo ao anúncio</p>
            <p style={{fontSize:12,color:G.textMuted,lineHeight:1.6}}>
              Vamos buscar os dados directamente à página do anúncio. Se o portal bloquear o pedido, usa <strong style={{color:G.gold1,cursor:"pointer"}} onClick={()=>{setModo("texto");setError("");}}>Colar Texto →</strong> em alternativa.
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

// ── Registo de visita com assinatura (Fase 3) ──
const RegistarVisita = ({ imovel, clientes, user, onClose, mob }) => {
  const agora = new Date();
  const [v, setV] = useState({
    clienteNome:"", clienteNif:"", clienteContacto:"",
    data: agora.toISOString().slice(0,10),
    hora: agora.toTimeString().slice(0,5),
    notas:"",
  });
  const [sigCliente, setSigCliente] = useState(null);
  const [sigAgenteV, setSigAgenteV] = useState(null);
  const [saving, setSaving] = useState(false);
  const [clienteSel, setClienteSel] = useState("");

  const escolherCliente = (id) => {
    setClienteSel(id);
    const c = clientes.find(x => String(x.id) === String(id));
    if (c) setV(p => ({ ...p, clienteNome:c.nome, clienteContacto:c.telefone||c.email||"" }));
  };

  const guardar = async (gerarPdf) => {
    if (!v.clienteNome || !v.data) { alert("Nome do visitante e data são obrigatórios."); return; }
    setSaving(true);
    try {
      const registo = {
        imovelId: imovel.id, imovelTitulo: imovel.titulo,
        clienteNome: v.clienteNome, clienteNif: v.clienteNif, clienteContacto: v.clienteContacto,
        data: v.data, hora: v.hora, agenteNome: user.nome,
        notas: v.notas, sigCliente, sigAgente: sigAgenteV,
      };
      if (dbReady) await dbVisitas.insert(registo);
      // Arquivar a ficha assinada no dossier do proprietário (se o imóvel tiver um)
      if (dbReady && imovel.proprietario_id) {
        try {
          const html = htmlFichaVisita(registo, imovel, false);
          const blob = new Blob([html], { type: "text/html" });
          const nomeFich = `Ficha de Visita — ${v.clienteNome} — ${new Date(v.data).toLocaleDateString("pt-PT")}.html`;
          const file = new File([blob], nomeFich, { type: "text/html" });
          const url = await uploadDocumento(file, imovel.proprietario_id);
          await dbDocsProprietario.insert({
            proprietarioId: imovel.proprietario_id,
            imovelId: imovel.id,
            tipo: "Ficha de Visita",
            nomeFicheiro: nomeFich,
            url,
            validade: null,
            notas: `Visita de ${v.clienteNome} em ${new Date(v.data).toLocaleDateString("pt-PT")}${v.hora?` às ${v.hora}`:""}`,
          });
        } catch (e) { console.error("arquivar ficha no dossier:", e); }
      }
      if (gerarPdf) gerarPDFVisita(registo, imovel, user);
      onClose();
    } catch (e) { alert("Erro ao guardar a visita: " + e.message); }
    setSaving(false);
  };

  return (
    <Modal title="Registar Visita" onClose={()=>!saving&&onClose()}>
      <p style={{fontSize:13,color:G.textMuted,marginBottom:16}}>{imovel.titulo} · {[imovel.freguesia,imovel.concelho].filter(Boolean).join(", ")}</p>

      <Field label="Cliente existente (opcional)">
        <select value={clienteSel} onChange={e=>escolherCliente(e.target.value)}>
          <option value="">— Preencher manualmente —</option>
          {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><Field label="Nome do visitante *"><input value={v.clienteNome} onChange={e=>setV(p=>({...p,clienteNome:e.target.value}))} placeholder="Nome completo"/></Field></div>
        <Field label="NIF (opcional)"><input value={v.clienteNif} onChange={e=>setV(p=>({...p,clienteNif:e.target.value}))} placeholder="123456789"/></Field>
        <Field label="Contacto"><input value={v.clienteContacto} onChange={e=>setV(p=>({...p,clienteContacto:e.target.value}))} placeholder="Telefone ou email"/></Field>
        <Field label="Data *"><input type="date" value={v.data} onChange={e=>setV(p=>({...p,data:e.target.value}))}/></Field>
        <Field label="Hora"><input type="time" value={v.hora} onChange={e=>setV(p=>({...p,hora:e.target.value}))}/></Field>
        <div style={{gridColumn:"1/-1"}}><Field label="Observações"><input value={v.notas} onChange={e=>setV(p=>({...p,notas:e.target.value}))} placeholder="Notas sobre a visita..."/></Field></div>
      </div>

      <SignaturePad label="Assinatura do visitante" onSave={setSigCliente} saved={sigCliente}/>
      <SignaturePad label={`Assinatura do agente (${user.nome})`} onSave={setSigAgenteV} saved={sigAgenteV}/>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16,flexWrap:"wrap"}}>
        <button className="btn-ghost" disabled={saving} onClick={onClose}>Cancelar</button>
        <button className="btn-ghost" disabled={saving} onClick={()=>guardar(false)}>Guardar sem PDF</button>
        <button className="btn-gold" disabled={saving} onClick={()=>guardar(true)}>{saving?"A guardar...":"Guardar e gerar PDF"}</button>
      </div>
    </Modal>
  );
};

const ImovelDetalhe=({imovel,onClose,onEdit,onMkt,onDelete,onVisita,onDossier,mob})=>{
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

      {/* Especificações do Terreno */}
      {imovel.tipoAtivo === "terreno" && (
        <div style={{background:`${G.gold1}0A`,border:`1px solid ${G.gold1}30`,borderRadius:8,padding:"12px 14px",marginBottom:18}}>
          <p style={{fontSize:11,color:G.gold1,marginBottom:8,textTransform:"uppercase",letterSpacing:".3px"}}>Especificações do Terreno</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:imovel.viabilidadeConstrutivaPip||((imovel.infraestruturasBasicas||[]).length>0)?10:0}}>
            <div><p style={{fontSize:10,color:G.textDim}}>Projecto Aprovado</p><p style={{fontSize:13,fontWeight:500}}>{imovel.temProjetoAprovado?"Sim":"Não"}</p></div>
            <div><p style={{fontSize:10,color:G.textDim}}>Topografia</p><p style={{fontSize:13,fontWeight:500}}>{imovel.topografia||"—"}</p></div>
          </div>
          {imovel.viabilidadeConstrutivaPip && <div style={{marginBottom:(imovel.infraestruturasBasicas||[]).length>0?10:0}}><p style={{fontSize:10,color:G.textDim}}>Viabilidade Construtiva / PIP</p><p style={{fontSize:13,fontWeight:500}}>{imovel.viabilidadeConstrutivaPip}</p></div>}
          {(imovel.infraestruturasBasicas||[]).length>0 && (
            <div>
              <p style={{fontSize:10,color:G.textDim,marginBottom:5}}>Infraestruturas Básicas</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {imovel.infraestruturasBasicas.map(inf=><span key={inf} className="tag" style={{background:G.surface3,color:G.textMuted}}>{inf}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Descrição */}
      {imovel.descricao&&<div style={{marginBottom:18}}>
        <p style={{fontSize:11,color:G.textDim,marginBottom:6,textTransform:"uppercase",letterSpacing:".3px"}}>Descrição</p>
        <p style={{fontSize:13,color:G.textMuted,lineHeight:1.7}}>{imovel.descricao}</p>
      </div>}

      {/* Ações */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",borderTop:`1px solid ${G.border}`,paddingTop:16}}>
        <button className="btn-gold" onClick={onMkt} style={{flex:mob?"1 1 100%":1}}><Ic n="spark" s={14} c="#0E0E0F"/>Avaliar com IA</button>
        <button className="btn-ghost" onClick={onVisita} style={{flex:mob?1:"none"}}><Ic n="calendar" s={14} c={G.green}/>Registar visita</button>
        <button className="btn-ghost" onClick={()=>gerarFichaPDF(imovel)} style={{flex:mob?1:"none"}}><Ic n="pdf" s={14} c={G.gold1}/>Gerar PDF</button>
        <button className="btn-ghost" onClick={()=>partilharImovel(imovel)} style={{flex:mob?1:"none"}}><Ic n="share" s={14} c={G.blue}/>Partilhar</button>
        <button className="btn-ghost" onClick={onEdit} style={{flex:mob?1:"none"}}><Ic n="edit" s={14} c={G.textMuted}/>Editar</button>
        <button className="btn-ghost" onClick={onDelete} style={{flex:mob?1:"none",borderColor:`${G.red}40`,color:G.red}}><Ic n="trash" s={14} c={G.red}/>Eliminar</button>
	<button className="btn-gold" onClick={onDossier} style={{flex:mob?"1 1 100%":1}}>
  	<Ic n="pdf" s={14} c="#0E0E0F"/> Dossier Investidor
	</button>
      </div>
    </Modal>
  );
};

const Imoveis=({imoveis,setImoveis,clientes=[],user,mob})=>{
  const [search,setSrch]=useState("");
  const [modal,setMod]=useState(false);
  const [importMod,setImportMod]=useState(false);
  const [form,setForm]=useState(emptyIm);
  const [editId,setEditId]=useState(null);
  const [mktIm,setMktIm]=useState(null);
  const [detailIm,setDetailIm]=useState(null);
  const [visitaIm,setVisitaIm]=useState(null);
  const [dossierIm,setDossierIm]=useState(null);
  const [uploading,setUploading]=useState(false);
  const filtered=imoveis.filter(i=>i.titulo.toLowerCase().includes(search.toLowerCase())||i.bairro.toLowerCase().includes(search.toLowerCase()));
  const save=()=>{if(!form.titulo)return;const d={...form,status:(form.status||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""),valor:Number(form.valor),area:Number(form.area),quartos:Number(form.quartos),fotos:form.fotos||[]};if(editId)setImoveis(p=>p.map(i=>i.id===editId?{...d,id:editId}:i));else setImoveis(p=>[...p,{...d,id:Date.now()}]);setMod(false);setForm(emptyIm);setEditId(null);};
  const onImport=(data)=>{setImoveis(p=>[...p,{...data,id:Date.now(),valor:Number(data.valor),area:Number(data.area),quartos:Number(data.quartos)||0}]);setImportMod(false);};
  const eliminar=async(im)=>{
    if(!confirm("Eliminar este imóvel? As fotos também serão apagadas."))return;
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

      {modal && (
        <Modal title={editId ? "Editar Imóvel" : "Novo Imóvel"} onClose={() => setMod(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}><Field label="Título"><input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Apartamento T3 Chiado" /></Field></div>
            
            <Field label="Tipo de Ativo (Macro)">
              <select value={form.tipoAtivo || "habitacao"} onChange={e => setForm(p => ({ ...p, tipoAtivo: e.target.value }))}>
                <option value="habitacao">Habitação</option>
                <option value="terreno">Terreno</option>
                <option value="predio_bloco">Prédio / Bloco</option>
                <option value="comercial">Espaço Comercial</option>
              </select>
            </Field>

            <Field label="Tipologia Específica"><select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>{["Apartamento", "Moradia", "Terreno", "Comercial", "Escritório", "Lote"].map(t => <option key={t}>{t}</option>)}</select></Field>
            
            {form.tipoAtivo === 'terreno' && (
              <div style={{ gridColumn: "1/-1", background: G.surface2, padding: "14px 16px", borderRadius: 8, marginBottom: 8, border: `1px solid ${G.border}` }}>
                <p style={{ fontSize: 12, color: G.gold1, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".3px", fontWeight: 500 }}>Especificações do Terreno</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Tem projeto aprovado?">
                    <select value={form.temProjetoAprovado ? "sim" : "nao"} onChange={e => setForm(p => ({ ...p, temProjetoAprovado: e.target.value === "sim" }))}>
                      <option value="nao">Não</option><option value="sim">Sim</option>
                    </select>
                  </Field>
                  <Field label="Topografia">
                    <select value={form.topografia || ""} onChange={e => setForm(p => ({ ...p, topografia: e.target.value }))}>
                      <option value="">Desconhecida</option><option value="Plano">Plano</option><option value="Inclinado">Inclinado</option><option value="Socalcos">Socalcos</option>
                    </select>
                  </Field>
                  <div style={{ gridColumn: "1/-1" }}>
                    <Field label="Viabilidade Construtiva / PIP">
                      <input value={form.viabilidadeConstrutivaPip || ""} onChange={e => setForm(p => ({ ...p, viabilidadeConstrutivaPip: e.target.value }))} placeholder="Ex: Construção aprovada até 2 pisos, 400m2 implantação" />
                    </Field>
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <p style={{ fontSize: 12, color: G.textMuted, marginBottom: 8 }}>Infraestruturas Básicas Disponíveis</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["Água", "Electricidade", "Saneamento", "Gás", "Telecomunicações", "Acesso Pavimentado"].map(inf => {
                        const activo = (form.infraestruturasBasicas || []).includes(inf);
                        return (
                          <button key={inf} type="button" onClick={() => setForm(p => {
                            const atuais = p.infraestruturasBasicas || [];
                            return { ...p, infraestruturasBasicas: atuais.includes(inf) ? atuais.filter(x => x !== inf) : [...atuais, inf] };
                          })} style={{ background: activo ? G.gold1 : "transparent", color: activo ? "#0E0E0F" : G.textMuted, border: `1px solid ${activo ? G.gold1 : G.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>{inf}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Field label="Finalidade"><select value={form.finalidade} onChange={e => setForm(p => ({ ...p, finalidade: e.target.value }))}><option>Venda</option><option>Arrendamento</option></select></Field>
            <Field label="Estado"><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}><option>Disponível</option><option>Reservado</option><option>Vendido</option><option>Arrendado</option></select></Field>
            <Field label="Valor (€)"><input type="number" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0" /></Field>
            <Field label="Área (m²)"><input type="number" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} placeholder="0" /></Field>
            <Field label="Quartos"><input type="number" value={form.quartos} onChange={e => setForm(p => ({ ...p, quartos: e.target.value }))} placeholder="0" /></Field>
            <Field label="Ícone"><select value={form.foto} onChange={e => setForm(p => ({ ...p, foto: e.target.value }))}>{fotos.map(f => <option key={f} value={f}>{f}</option>)}</select></Field>

            <div style={{ gridColumn: "1/-1", marginTop: 10, padding: 14, border: `1px solid ${G.border}`, borderRadius: 8, background: G.surface }}>
              <p style={{ fontSize: 12, color: G.gold1, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".3px", fontWeight: 500 }}>Serviços Magna Ativos</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { key: "servicoGestaoArrendamento", label: "Gestão de Arrendamento" },
                  { key: "servicoAlojamentoLocal", label: "Alojamento Local (AL)" },
                  { key: "servicoPropertyCaretaker", label: "Property Caretaker" },
                  { key: "servicoRequalificacao", label: "Requalificação / Obras" }
                ].map(srv => (
                  <label key={srv.key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", background: form[srv.key] ? `${G.purple}15` : G.surface2, borderRadius: 6, border: `1px solid ${form[srv.key] ? G.purple : G.border}` }}>
                    <input type="checkbox" checked={form[srv.key] || false} onChange={e => setForm(p => ({ ...p, [srv.key]: e.target.checked }))} style={{ width: "auto" }} />
                    <span style={{ fontSize: 13, color: form[srv.key] ? G.purple : G.text }}>{srv.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: "1/-1", display: "flex", gap: "10px", marginTop: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 14px", background: form.destaque ? `${G.gold1}15` : G.surface2, borderRadius: 8, border: `1px solid ${form.destaque ? G.gold1 : G.border}`, transition: "all .2s", flex: 1 }}>
                <div onClick={() => setForm(p => ({ ...p, destaque: !p.destaque }))} style={{ width: 44, height: 24, borderRadius: 12, background: form.destaque ? G.gold1 : G.border, position: "relative", transition: "background .2s", cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: form.destaque ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
                </div>
                <div><p style={{ fontSize: 13, fontWeight: 500, color: form.destaque ? G.gold1 : G.text }}>Destaque</p></div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 14px", background: form.publicado ? `${G.green}15` : G.surface2, borderRadius: 8, border: `1px solid ${form.publicado ? G.green : G.border}`, transition: "all .2s", flex: 1 }}>
                <div onClick={() => setForm(p => ({ ...p, publicado: !p.publicado }))} style={{ width: 44, height: 24, borderRadius: 12, background: form.publicado ? G.green : G.border, position: "relative", transition: "background .2s", cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: form.publicado ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
                </div>
                <div><p style={{ fontSize: 13, fontWeight: 500, color: form.publicado ? G.green : G.text }}>Publicado</p></div>
              </label>
            </div>

            <div style={{ gridColumn: "1/-1" }}>
              <p style={{ fontSize: 12, color: G.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".3px" }}>Fotografias</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {(form.fotos || []).map((src, idx) => (
                  <div key={idx} style={{ position: "relative", width: 80, height: 80 }}>
                    <img src={src} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover" }} />
                    <button onClick={async () => {
                      if (dbReady && typeof src === "string" && src.startsWith("http")) { try { await deleteFoto(src); } catch (e) { console.warn("delete foto:", e); } }
                      setForm(p => ({ ...p, fotos: p.fotos.filter((_, i) => i !== idx) }));
                    }} style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: G.red, border: "2px solid " + G.surface, color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
                  </div>
                ))}
                <label style={{ width: 80, height: 80, borderRadius: 8, border: `2px dashed ${G.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploading ? "wait" : "pointer", color: G.textMuted, gap: 4, opacity: uploading ? .5 : 1 }}>
                  {uploading ? <div className="spinner" style={{ width: 18, height: 18, border: `2px solid ${G.textDim}`, borderTopColor: G.gold1, borderRadius: "50%", animation: "spin .8s linear infinite" }} /> : <><Ic n="plus" s={18} c={G.textMuted} /><span style={{ fontSize: 10 }}>Adicionar</span></>}
                  <input type="file" accept="image/*" multiple disabled={uploading} style={{ display: "none" }} onChange={async e => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    e.target.value = "";
                    if (!dbReady) {
                      files.forEach(file => {
                        if (file.size > 3 * 1024 * 1024) { alert(`A foto "${file.name}" é demasiado grande (máx 3MB).`); return; }
                        const reader = new FileReader();
                        reader.onload = ev => setForm(p => ({ ...p, fotos: [...(p.fotos || []), ev.target.result] }));
                        reader.readAsDataURL(file);
                      });
                      return;
                    }
                    setUploading(true);
                    for (const file of files) {
                      if (file.size > 5 * 1024 * 1024) { alert(`A foto "${file.name}" é demasiado grande (máx 5MB).`); continue; }
                      try {
                        const url = await uploadFoto(file);
                        setForm(p => ({ ...p, fotos: [...(p.fotos || []), url] }));
                      } catch (err) { console.error("upload erro:", err); alert(`Erro ao carregar "${file.name}": ${err.message}`); }
                    }
                    setUploading(false);
                  }} />
                </label>
              </div>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <p style={{ fontSize: 12, color: G.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".3px" }}>Localização</p>
              <LocSelector distrito={form.distrito} concelho={form.concelho} freguesia={form.freguesia} onChange={({ distrito, concelho, freguesia }) => setForm(p => ({ ...p, distrito, concelho, cidade: concelho, bairro: freguesia || concelho, freguesia }))} />
              <Field label="Zona / Bairro (opcional)"><input value={form.bairro} onChange={e => setForm(p => ({ ...p, bairro: e.target.value }))} placeholder="Ex: Chiado, Beira Mar..." /></Field>
            </div>
            <div style={{ gridColumn: "1/-1" }}><Field label="Descrição"><textarea value={form.descricao || ""} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição do imóvel..." rows={3} style={{ resize: "vertical" }} /></Field></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}><button className="btn-ghost" onClick={() => setMod(false)}>Cancelar</button><button className="btn-gold" onClick={save}>{editId ? "Guardar" : "Cadastrar"}</button></div>
        </Modal>
      )}

      {mktIm&&<MarketModal imovel={mktIm} onClose={()=>setMktIm(null)} onPDF={generatePDF} onSaved={(json)=>{setImoveis(prev=>prev.map(i=>i.id===mktIm.id?{...i,avaliacaoIA:json}:i));}}/>}
      {importMod&&<ImportModal onClose={()=>setImportMod(false)} onImport={onImport}/>}
      {detailIm&&<ImovelDetalhe imovel={detailIm} onClose={()=>setDetailIm(null)} onEdit={()=>{setForm(detailIm);setEditId(detailIm.id);setDetailIm(null);setMod(true);}} onMkt={()=>{setMktIm(detailIm);setDetailIm(null);}} onVisita={()=>{setVisitaIm(detailIm);setDetailIm(null);}} onDossier={()=>{setDossierIm(detailIm);setDetailIm(null);}} onDelete={async()=>{await eliminar(detailIm);setDetailIm(null);}} mob={mob}/>}
      {visitaIm&&<RegistarVisita imovel={visitaIm} clientes={clientes} user={user} onClose={()=>setVisitaIm(null)} mob={mob}/>}
      {dossierIm&&<GerarDossierInvestidor imovel={dossierIm} user={user} onClose={()=>setDossierIm(null)}/>}
    </div>
  );
};

// ── CLIENTES ──────────────────────────────────────────────────
const TIPOLOGIAS = {
  'Apartamento': ['T0 / Estúdio', 'T1', 'T2', 'T3', 'T4', 'T5+'],
  'Moradia':     ['T2', 'T3', 'T4', 'T5+'],
  'Comercial':   ['Loja', 'Escritório', 'Armazém', 'Estabelecimento'],
  'Terreno':     ['Urbano', 'Rústico'],
  'Outros':      ['Garagem', 'Quinta']
};

// Combina categoria + tipologia em string única
const tipoStr = (categoria, tip) => {
  if (categoria === 'Outros') return tip;
  if (categoria === 'Terreno') return `Terreno ${tip}`;
  return `${categoria} ${tip}`;
};

const TipologiaSelector = ({ value = [], onChange }) => {
  const [open, setOpen] = useState({});
  const selected = Array.isArray(value) ? value : [];

  const toggle = (categoria, tip) => {
    const s = tipoStr(categoria, tip);
    if (selected.includes(s)) onChange(selected.filter(x => x !== s));
    else onChange([...selected, s]);
  };
  const isSelected = (categoria, tip) => selected.includes(tipoStr(categoria, tip));
  const countByCategoria = (cat) =>
    selected.filter(s => {
      if (cat === 'Outros') return TIPOLOGIAS.Outros.includes(s);
      if (cat === 'Terreno') return s.startsWith('Terreno ');
      return s.startsWith(cat + ' ');
    }).length;

  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
        {Object.keys(TIPOLOGIAS).map(cat => {
          const isOpen = open[cat];
          const count = countByCategoria(cat);
          return (
            <button key={cat} type="button" onClick={() => setOpen(p => ({...p, [cat]: !p[cat]}))}
              style={{
                background: isOpen ? `${G.gold1}20` : G.surface2,
                border: `1px solid ${isOpen ? G.gold1 : G.border}`,
                borderRadius: 6, padding: "6px 12px",
                color: isOpen ? G.gold1 : G.textMuted, cursor: "pointer",
                fontSize: 12, fontFamily: "'DM Sans',sans-serif",
                display: "flex", alignItems: "center", gap: 6
              }}>
              {cat} {count > 0 && <span style={{background:G.gold1,color:'#0E0E0F',borderRadius:8,padding:'0 6px',fontSize:10,fontWeight:600}}>{count}</span>}
              <span style={{fontSize:10}}>{isOpen ? "▾" : "▸"}</span>
            </button>
          );
        })}
      </div>
      {Object.entries(TIPOLOGIAS).map(([cat, tips]) => {
        if (!open[cat]) return null;
        return (
          <div key={cat} style={{background:G.surface2,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
            <p style={{fontSize:10,color:G.textDim,marginBottom:8,textTransform:"uppercase",letterSpacing:".3px"}}>{cat}</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {tips.map(tip => {
                const sel = isSelected(cat, tip);
                return (
                  <button key={tip} type="button" onClick={() => toggle(cat, tip)}
                    style={{
                      background: sel ? G.gold1 : "transparent",
                      border: `1px solid ${sel ? G.gold1 : G.border}`,
                      borderRadius: 14, padding: "4px 12px",
                      color: sel ? "#0E0E0F" : G.textMuted, cursor: "pointer",
                      fontSize: 12, fontWeight: sel ? 500 : 400,
                      fontFamily: "'DM Sans',sans-serif"
                    }}>{tip}</button>
                );
              })}
            </div>
          </div>
        );
      })}
      {selected.length > 0 && (
        <div style={{background:`${G.gold1}10`,border:`1px solid ${G.gold1}30`,borderRadius:8,padding:"10px 12px",marginTop:6}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <p style={{fontSize:10,color:G.gold1,textTransform:"uppercase",letterSpacing:".3px",fontWeight:500}}>
              {selected.length} {selected.length===1?"tipologia seleccionada":"tipologias seleccionadas"}
            </p>
            <button type="button" onClick={() => onChange([])}
              style={{background:"none",border:"none",color:G.red,fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
              × Limpar
            </button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {selected.map(s => (
              <span key={s} style={{background:G.surface3,color:G.text,fontSize:11,padding:"3px 9px",borderRadius:10,display:"inline-flex",alignItems:"center",gap:5}}>
                {s}
                <button type="button" onClick={() => onChange(selected.filter(x => x !== s))}
                  style={{background:"none",border:"none",color:G.textDim,cursor:"pointer",padding:0,fontSize:13,lineHeight:1}}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// ── FICHA DETALHADA DO CLIENTE ────────────────────────────────
const partilharCliente = async (c) => {
  const texto = `👤 ${c.nome}\n📞 ${c.telefone||"—"}\n✉️ ${c.email||"—"}\n💼 ${c.interesse} · Até ${fmtFull(c.orcamento)}${c.interesse==="Arrendar"?"/mês":""}\n📍 ${c.bairros||"—"}\n${c.obs?"\n"+c.obs:""}\n\nMagna Group Real Estate`;
  if (navigator.share) { try { await navigator.share({title:c.nome,text:texto}); } catch {} }
  else { try { await navigator.clipboard.writeText(texto); alert("✓ Contacto copiado!"); } catch { alert("Não foi possível partilhar."); } }
};

const ClienteDetalhe = ({cliente,onClose,onEdit,onDelete,mob,userAtual}) => {
  const c = cliente;
  const [bcftCli, setBcftCli] = useState(false);
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

      {c.tipologia && c.tipologia.length > 0 && <div style={{background:G.surface2,borderRadius:8,padding:"12px 14px",marginBottom:18}}>
        <p style={{fontSize:11,color:G.textDim,marginBottom:8,textTransform:"uppercase",letterSpacing:".3px"}}>Tipologia Pretendida</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {c.tipologia.map(t => (
            <span key={t} style={{background:`${G.gold1}15`,color:G.gold1,fontSize:12,padding:"4px 10px",borderRadius:12,border:`1px solid ${G.gold1}30`}}>{t}</span>
          ))}
        </div>
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
        <button className="btn-ghost" onClick={()=>setBcftCli(true)} style={{flex:mob?1:"none",borderColor:`${G.gold1}40`,color:G.gold1}}>BC/FT</button>
        <button className="btn-ghost" onClick={onEdit} style={{flex:mob?1:"none"}}><Ic n="edit" s={14} c={G.textMuted}/>Editar</button>
        <button className="btn-ghost" onClick={onDelete} style={{flex:mob?1:"none",borderColor:`${G.red}40`,color:G.red}}><Ic n="trash" s={14} c={G.red}/>Eliminar</button>
      </div>
          {bcftCli && <GerarBCFT pessoa={c} qualidade={c.interesse==="Comprar"?"Comprador":c.interesse==="Arrendar"?"Arrendatário":"Comprador"} user={userAtual} onClose={()=>setBcftCli(false)}/>}
    </Modal>
  );
};

/* ══════════════ PROPRIETÁRIOS ══════════════ */
const TIPOS_DOC = ["Caderneta Predial","Certidão Permanente","Certificado Energético","CMI","Ficha de Visita","Licença de Utilização","Ficha Técnica de Habitação","Documento de Identificação","Procuração","Outro"];
const emptyProp = { nome:"", nif:"", email:"", telefone:"", morada:"", notas:"", estado:"Activo" };

const diasValidade = (d) => d ? Math.floor((new Date(d) - new Date()) / 86400000) : null;
const corValidade = (dias) => dias === null ? G.textDim : dias < 30 ? G.red : dias < 90 ? G.gold1 : G.green;

const PropForm = ({ form, setForm, onSave, onClose, editId }) => (
  <Modal title={editId ? "Editar Proprietário" : "Novo Proprietário"} onClose={onClose}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div style={{gridColumn:"1/-1"}}><Field label="Nome completo *"><input value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} placeholder="Nome do proprietário"/></Field></div>
      <Field label="NIF"><input value={form.nif} onChange={e=>setForm(p=>({...p,nif:e.target.value}))} placeholder="123456789"/></Field>
      <Field label="Telefone"><input value={form.telefone} onChange={e=>setForm(p=>({...p,telefone:e.target.value}))} placeholder="912 345 678"/></Field>
      <div style={{gridColumn:"1/-1"}}><Field label="E-mail"><input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="email@exemplo.pt"/></Field></div>
      <div style={{gridColumn:"1/-1"}}><Field label="Morada"><input value={form.morada} onChange={e=>setForm(p=>({...p,morada:e.target.value}))} placeholder="Rua, número, código postal, localidade"/></Field></div>
      <Field label="Estado"><select value={form.estado} onChange={e=>setForm(p=>({...p,estado:e.target.value}))}><option>Activo</option><option>Inactivo</option></select></Field>
      <div/>
      <div style={{gridColumn:"1/-1"}}><Field label="Notas"><textarea value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))} placeholder="Notas sobre o proprietário..." rows={3}/></Field></div>
    </div>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
      <button className="btn-ghost" onClick={onClose}>Cancelar</button>
      <button className="btn-gold" onClick={onSave}>{editId ? "Guardar" : "Adicionar"}</button>
    </div>
  </Modal>
);

// ── Modal de geração BC/FT + RGPD ──
const GerarBCFT = ({ pessoa, qualidade, user, onClose, onArquivar, docsDossier = [] }) => {
  // Pré-preencher a partir dos dados extraídos dos documentos já no dossier (Fase 2)
  const dadosDe = (tipo) => {
    const doc = docsDossier.find(x => x.tipo === tipo && x.dadosExtraidos);
    return doc ? doc.dadosExtraidos : null;
  };
  const cc = dadosDe("Documento de Identificação");
  const cmi = dadosDe("CMI");
  const [preenchidoAuto] = useState(!!(cc || cmi));

  const [d, setD] = useState({
    nome: pessoa.nome || (cc && cc.nome_completo) || "",
    nif: pessoa.nif || (cc && cc.nif) || (cmi && cmi.nif_proprietario) || "",
    morada: pessoa.morada || "", contacto: pessoa.telefone || pessoa.email || "",
    docIdentificacao: (cc && cc.numero_documento) || "",
    docValidade: (cc && cc.validade) || "",
    dataNascimento: (cc && cc.data_nascimento) || "",
    nacionalidade: "Portuguesa", profissao: "",
    qualidade: qualidade, origemFundos: "",
  });
  const [sig, setSig] = useState(null);
  const [saving, setSaving] = useState(false);

  const gerar = async (arquivar) => {
    if (!d.nome) { alert("O nome é obrigatório."); return; }
    setSaving(true);
    try {
      if (arquivar && onArquivar) await onArquivar(d, sig);
      gerarPDFBCFT(d, sig, user);
      onClose();
    } catch (e) { alert("Erro: " + e.message); }
    setSaving(false);
  };

  return (
    <Modal title="Ficha BC/FT + Consentimento RGPD" onClose={()=>!saving&&onClose()}>
      <p style={{fontSize:12,color:G.textDim,marginBottom:preenchidoAuto?8:16}}>Lei n.º 83/2017 · Obrigatória para fiscalização IMPIC · O documento inclui o consentimento RGPD</p>
      {preenchidoAuto && <p style={{fontSize:12,color:G.gold1,marginBottom:16}}>✦ Campos pré-preenchidos a partir dos documentos do dossier — confirma antes de gerar</p>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><Field label="Nome completo *"><input value={d.nome} onChange={e=>setD(p=>({...p,nome:e.target.value}))}/></Field></div>
        <Field label="NIF"><input value={d.nif} onChange={e=>setD(p=>({...p,nif:e.target.value}))}/></Field>
        <Field label="Contacto"><input value={d.contacto} onChange={e=>setD(p=>({...p,contacto:e.target.value}))}/></Field>
        <div style={{gridColumn:"1/-1"}}><Field label="Morada"><input value={d.morada} onChange={e=>setD(p=>({...p,morada:e.target.value}))}/></Field></div>
        <Field label="Documento de identificação (n.º CC)"><input value={d.docIdentificacao} onChange={e=>setD(p=>({...p,docIdentificacao:e.target.value}))} placeholder="12345678 9 ZZ0"/></Field>
        <Field label="Validade do documento"><input type="date" value={d.docValidade} onChange={e=>setD(p=>({...p,docValidade:e.target.value}))}/></Field>
        <Field label="Data de nascimento"><input type="date" value={d.dataNascimento} onChange={e=>setD(p=>({...p,dataNascimento:e.target.value}))}/></Field>
        <Field label="Nacionalidade"><input value={d.nacionalidade} onChange={e=>setD(p=>({...p,nacionalidade:e.target.value}))}/></Field>
        <Field label="Profissão"><input value={d.profissao} onChange={e=>setD(p=>({...p,profissao:e.target.value}))}/></Field>
        <Field label="Qualidade">
          <select value={d.qualidade} onChange={e=>setD(p=>({...p,qualidade:e.target.value}))}>
            <option>Proprietário / Vendedor</option><option>Comprador</option><option>Arrendatário</option><option>Senhorio</option><option>Investidor</option>
          </select>
        </Field>
        {(d.qualidade==="Comprador"||d.qualidade==="Investidor") && (
          <div style={{gridColumn:"1/-1"}}><Field label="Origem dos fundos">
            <select value={d.origemFundos} onChange={e=>setD(p=>({...p,origemFundos:e.target.value}))}>
              <option value="">Seleccionar</option><option>Poupanças / Rendimentos do trabalho</option><option>Crédito bancário</option><option>Venda de outro imóvel</option><option>Herança / Doação</option><option>Rendimentos empresariais</option><option>Outra</option>
            </select>
          </Field></div>
        )}
      </div>
      <SignaturePad label="Assinatura do cliente" onSave={setSig} saved={sig}/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16,flexWrap:"wrap"}}>
        <button className="btn-ghost" disabled={saving} onClick={onClose}>Cancelar</button>
        {onArquivar && <button className="btn-gold" disabled={saving} onClick={()=>gerar(true)}>{saving?"A guardar...":"Arquivar no dossier + PDF"}</button>}
        {!onArquivar && <button className="btn-gold" disabled={saving} onClick={()=>gerar(false)}>Gerar PDF</button>}
      </div>
    </Modal>
  );
};

const Proprietarios = ({ mob, userAtual }) => {
  const [lista, setLista] = useState([]);
  const [docs, setDocs] = useState([]);
  const [imoveisProp, setImoveisProp] = useState([]);
  const [search, setSrch] = useState("");
  const [mod, setMod] = useState(false);
  const [form, setForm] = useState(emptyProp);
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [docMod, setDocMod] = useState(false);
  const [bcftMod, setBcftMod] = useState(false);
  const [docForm, setDocForm] = useState({ tipo:"Caderneta Predial", validade:"", notas:"", file:null });
  const [uploading, setUploading] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [extraidos, setExtraidos] = useState(null);
  const [avisoNif, setAvisoNif] = useState(null);

  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      try {
        const [props, allDocs, allImoveis] = await Promise.all([
          dbProprietarios.list(), dbDocsProprietario.list(), dbImoveis.list(),
        ]);
        setLista(props); setDocs(allDocs); setImoveisProp(allImoveis);
      } catch (e) { console.error("load proprietarios:", e); }
    })();
  }, []);

  const docsDe = (pid) => docs.filter(d => d.proprietarioId === pid);
  const imoveisDe = (pid) => imoveisProp.filter(i => i.proprietario_id === pid);
  const alertasDe = (pid) => docsDe(pid).filter(d => { const dd = diasValidade(d.validade); return dd !== null && dd < 30; });

  const guardar = async () => {
    if (!form.nome) return;
    try {
      if (editId) {
        const saved = await dbProprietarios.update(editId, form);
        setLista(p => p.map(x => x.id === editId ? saved : x));
        if (detail && detail.id === editId) setDetail(saved);
      } else {
        const saved = await dbProprietarios.insert(form);
        setLista(p => [saved, ...p]);
      }
      setMod(false); setForm(emptyProp); setEditId(null);
    } catch (e) { alert("Erro ao guardar: " + e.message); }
  };

  const eliminar = async (p) => {
    if (!confirm(`Eliminar o proprietário "${p.nome}" e todos os seus documentos? Esta acção é permanente.`)) return;
    try {
      for (const d of docsDe(p.id)) await deleteDocumento(d.url);
      await dbProprietarios.remove(p.id);
      setLista(l => l.filter(x => x.id !== p.id));
      setDocs(ds => ds.filter(d => d.proprietarioId !== p.id));
      if (detail && detail.id === p.id) setDetail(null);
    } catch (e) { alert("Erro: " + e.message); }
  };

  // Analisar o documento com IA e pré-preencher dados
  const analisarDoc = async (file, tipo) => {
    const prompt = PROMPTS_EXTRACAO[tipo];
    if (!prompt || !file) return;
    if (file.size > 4 * 1024 * 1024) {
      setAvisoNif("Ficheiro grande demais para análise automática (máx. 4MB). Preenche os dados manualmente.");
      return;
    }
    setAnalisando(true); setExtraidos(null); setAvisoNif(null);
    try {
      const b64 = await fileToBase64(file);
      const mediaType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      const raw = await callClaudeDoc(b64, mediaType, prompt);
      const clean = raw.replace(/```json|```/g, "").trim();
      const dados = JSON.parse(clean);
      setExtraidos(dados);
      // Pré-preencher a validade se extraída
      let validadeExtraida = dados.validade || null;
      if (!validadeExtraida && dados.data_emissao) {
        const em = new Date(dados.data_emissao);
        if (tipo === "Certidão Permanente") validadeExtraida = new Date(em.setMonth(em.getMonth() + 6)).toISOString().slice(0,10);
        if (tipo === "Caderneta Predial")   validadeExtraida = new Date(em.setMonth(em.getMonth() + 12)).toISOString().slice(0,10);
      }
      if (validadeExtraida) setDocForm(p => ({ ...p, validade: validadeExtraida }));
      // Verificação cruzada de NIF
      const nifsDoc = [];
      if (dados.nif) nifsDoc.push(dados.nif);
      if (dados.nif_proprietario) nifsDoc.push(dados.nif_proprietario);
      if (dados.nif_outorgante) nifsDoc.push(dados.nif_outorgante);
      if (Array.isArray(dados.titulares)) dados.titulares.forEach(t => t && t.nif && nifsDoc.push(t.nif));
      const nifsLimpos = nifsDoc.map(n => String(n).replace(/\s/g, "")).filter(Boolean);
      if (detail.nif && nifsLimpos.length > 0 && !nifsLimpos.includes(String(detail.nif).replace(/\s/g, ""))) {
        setAvisoNif(`⚠ O NIF no documento (${nifsLimpos.join(", ")}) difere do NIF do proprietário (${detail.nif}). Verifica antes de guardar.`);
      }
    } catch (e) {
      console.error("análise doc:", e);
      setAvisoNif("Não foi possível analisar automaticamente. Preenche os dados manualmente.");
    }
    setAnalisando(false);
  };

  const guardarDoc = async () => {
    if (!docForm.file || !detail) return;
    setUploading(true);
    try {
      const url = await uploadDocumento(docForm.file, detail.id);
      const novo = await dbDocsProprietario.insert({
        proprietarioId: detail.id, tipo: docForm.tipo,
        nomeFicheiro: docForm.file.name, url,
        validade: docForm.validade || null, notas: docForm.notas,
        dadosExtraidos: extraidos || null,
      });
      setDocs(d => [novo, ...d]);
      setDocMod(false);
      setDocForm({ tipo:"Caderneta Predial", validade:"", notas:"", file:null });
      setExtraidos(null); setAvisoNif(null);
    } catch (e) { alert("Erro no upload: " + e.message); }
    setUploading(false);
  };

  // Abrir documento — fichas HTML são renderizadas numa janela nova
  const abrirDoc = async (d) => {
    if (d.nomeFicheiro && d.nomeFicheiro.toLowerCase().endsWith(".html")) {
      try {
        const res = await fetch(d.url);
        const html = await res.text();
        const win = window.open("", "_blank");
        win.document.write(html);
        win.document.close();
      } catch (e) { window.open(d.url, "_blank"); }
    } else {
      window.open(d.url, "_blank");
    }
  };

  const eliminarDoc = async (d) => {
    if (!confirm(`Eliminar o documento "${d.nomeFicheiro}"?`)) return;
    try {
      await deleteDocumento(d.url);
      await dbDocsProprietario.remove(d.id);
      setDocs(ds => ds.filter(x => x.id !== d.id));
    } catch (e) { alert("Erro: " + e.message); }
  };

  const filtered = lista.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) || (p.nif || "").includes(search)
  );

  // ── DETALHE ──
  if (detail) {
    const pDocs = docsDe(detail.id);
    const pImoveis = imoveisDe(detail.id);
    return (
      <div>
        <button onClick={() => setDetail(null)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,color:G.textMuted,fontSize:13,marginBottom:20,fontFamily:"'DM Sans',sans-serif"}}>← Voltar aos proprietários</button>

        <div className="card" style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${G.goldDark},${G.gold1})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:22,color:"#0E0E0F"}}>{detail.nome.charAt(0)}</div>
              <div>
                <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:600}}>{detail.nome}</h2>
                <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                  <span className="tag" style={{background:detail.estado==="Activo"?`${G.green}18`:G.surface3,color:detail.estado==="Activo"?G.green:G.textDim}}>{detail.estado}</span>
                  {detail.nif && <span className="tag" style={{background:G.surface3,color:G.textMuted}}>NIF {detail.nif}</span>}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn-gold" onClick={()=>setBcftMod(true)} style={{padding:"9px 14px",fontSize:12}}>BC/FT + RGPD</button>
              <button className="btn-ghost" onClick={()=>{setForm({...detail});setEditId(detail.id);setMod(true);}}><Ic n="edit" s={14} c={G.textMuted}/>Editar</button>
              <button className="btn-ghost" onClick={()=>eliminar(detail)} style={{borderColor:`${G.red}40`,color:G.red}}><Ic n="trash" s={14} c={G.red}/>Eliminar</button>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(2,1fr)",gap:10,marginTop:18}}>
            {detail.email && <div style={{display:"flex",gap:8,alignItems:"center"}}><Ic n="mail" s={14} c={G.textDim}/><span style={{fontSize:13,color:G.textMuted}}>{detail.email}</span></div>}
            {detail.telefone && <div style={{display:"flex",gap:8,alignItems:"center"}}><Ic n="phone" s={14} c={G.textDim}/><span style={{fontSize:13,color:G.textMuted}}>{detail.telefone}</span></div>}
            {detail.morada && <div style={{display:"flex",gap:8,alignItems:"center",gridColumn:mob?"auto":"1 / -1"}}><Ic n="location" s={14} c={G.textDim}/><span style={{fontSize:13,color:G.textMuted}}>{detail.morada}</span></div>}
          </div>
          {detail.notas && <p style={{fontSize:13,color:G.textDim,fontStyle:"italic",marginTop:14,borderTop:`1px solid ${G.border}`,paddingTop:12}}>{detail.notas}</p>}
        </div>

        <div className="card" style={{marginBottom:16}}>
          <h3 style={{fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",color:G.gold1,marginBottom:14}}>Imóveis ({pImoveis.length})</h3>
          {pImoveis.length === 0 && <p style={{fontSize:13,color:G.textDim}}>Sem imóveis associados. Os imóveis ligam-se automaticamente ao importar uma angariação assinada.</p>}
          {pImoveis.map(im => (
            <div key={im.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${G.border}`}}>
              <div>
                <p style={{fontSize:14,fontWeight:500}}>{im.titulo}</p>
                <span style={{fontSize:12,color:G.textDim}}>{im.concelho || im.distrito} · {im.status}</span>
              </div>
              <span style={{fontSize:13,color:G.gold1,fontWeight:500}}>{fmtFull(im.valor)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h3 style={{fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",color:G.gold1}}>Documentos ({pDocs.length})</h3>
            <button className="btn-gold" onClick={()=>setDocMod(true)} style={{padding:"8px 14px",fontSize:11}}>+ Documento</button>
          </div>
          {pDocs.length === 0 && <p style={{fontSize:13,color:G.textDim}}>Nenhum documento. Adicione a caderneta, certidão, CMI e restantes documentos.</p>}
          {pDocs.map(d => {
            const dias = diasValidade(d.validade);
            return (
              <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${G.border}`,gap:10}}>
                <div style={{minWidth:0,flex:1}}>
                  <p style={{fontSize:14,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.nomeFicheiro}</p>
                  <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>
                    <span className="tag" style={{background:G.surface3,color:G.textMuted}}>{d.tipo}</span>
                    {d.validade && (
                      <span style={{fontSize:11,color:corValidade(dias),fontWeight:500}}>
                        {dias < 0 ? "⚠ Expirado" : dias < 30 ? `⚠ Expira em ${dias} dias` : `Válido até ${new Date(d.validade).toLocaleDateString("pt-PT")}`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>abrirDoc(d)} style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:7,padding:"7px 10px",cursor:"pointer",display:"flex"}}><Ic n="eye" s={14} c={G.textMuted}/></button>
                  <button onClick={()=>eliminarDoc(d)} style={{background:"none",border:`1px solid ${G.border}`,borderRadius:7,padding:"7px 10px",cursor:"pointer",display:"flex"}}><Ic n="trash" s={14} c={G.red}/></button>
                </div>
              </div>
            );
          })}
        </div>

        {docMod && (
          <Modal title="Novo Documento" onClose={()=>!uploading&&!analisando&&setDocMod(false)}>
            <Field label="Tipo de documento">
              <select value={docForm.tipo} onChange={e=>{const t=e.target.value;setDocForm(p=>({...p,tipo:t}));setExtraidos(null);setAvisoNif(null);if(docForm.file)analisarDoc(docForm.file,t);}}>
                {TIPOS_DOC.map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Ficheiro (PDF ou imagem)">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>{const f=e.target.files[0]||null;setDocForm(p=>({...p,file:f}));setExtraidos(null);setAvisoNif(null);if(f)analisarDoc(f,docForm.tipo);}}/>
            </Field>

            {analisando && (
              <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:13,color:G.gold1}}>✦ A analisar o documento...</span>
              </div>
            )}

            {extraidos && !analisando && (
              <div style={{background:`${G.gold1}0A`,border:`1px solid ${G.gold1}30`,borderRadius:8,padding:"12px 14px",marginBottom:14}}>
                <p style={{fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",color:G.gold1,marginBottom:8}}>✦ Dados extraídos — confirma antes de guardar</p>
                {Object.entries(extraidos).filter(([k,v])=>v!==null&&v!==""&&k!=="titulares").map(([k,v])=>(
                  <div key={k} style={{display:"flex",gap:8,fontSize:12,marginBottom:3}}>
                    <span style={{color:G.textDim,minWidth:130,textTransform:"capitalize"}}>{k.replace(/_/g," ")}:</span>
                    <span style={{color:G.text}}>{typeof v==="object"?JSON.stringify(v):String(v)}</span>
                  </div>
                ))}
                {Array.isArray(extraidos.titulares) && extraidos.titulares.length>0 && (
                  <div style={{display:"flex",gap:8,fontSize:12,marginBottom:3}}>
                    <span style={{color:G.textDim,minWidth:130}}>Titulares:</span>
                    <span style={{color:G.text}}>{extraidos.titulares.map(t=>t&&`${t.nome||"?"}${t.nif?` (${t.nif})`:""}`).filter(Boolean).join("; ")}</span>
                  </div>
                )}
              </div>
            )}

            {avisoNif && (
              <div style={{background:`${G.red}10`,border:`1px solid ${G.red}40`,borderRadius:8,padding:"10px 14px",marginBottom:14}}>
                <p style={{fontSize:12,color:G.red}}>{avisoNif}</p>
              </div>
            )}

            <Field label="Validade (preenchida automaticamente se detectada)">
              <input type="date" value={docForm.validade} onChange={e=>setDocForm(p=>({...p,validade:e.target.value}))}/>
            </Field>
            <Field label="Notas (opcional)">
              <input value={docForm.notas} onChange={e=>setDocForm(p=>({...p,notas:e.target.value}))} placeholder="Ex: fracção B, 2.º direito"/>
            </Field>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
              <button className="btn-ghost" disabled={uploading||analisando} onClick={()=>setDocMod(false)}>Cancelar</button>
              <button className="btn-gold" disabled={uploading||analisando||!docForm.file} onClick={guardarDoc}>{uploading?"A carregar...":"Guardar documento"}</button>
            </div>
          </Modal>
        )}

        {mod && <PropForm form={form} setForm={setForm} onSave={guardar} onClose={()=>{setMod(false);setForm(emptyProp);setEditId(null);}} editId={editId}/>}
        {bcftMod && <GerarBCFT pessoa={detail} qualidade="Proprietário / Vendedor" user={userAtual} docsDossier={docsDe(detail.id)} onClose={()=>setBcftMod(false)} onArquivar={async (d, sig) => {
          const html = htmlBCFT(d, sig, userAtual, false);
          const blob = new Blob([html], { type: "text/html" });
          const nomeFich = `BCFT-RGPD — ${d.nome} — ${new Date().toLocaleDateString("pt-PT")}.html`;
          const file = new File([blob], nomeFich, { type: "text/html" });
          const url = await uploadDocumento(file, detail.id);
          const novo = await dbDocsProprietario.insert({
            proprietarioId: detail.id, tipo: "Outro",
            nomeFicheiro: nomeFich, url, validade: null,
            notas: "Ficha BC/FT + Consentimento RGPD assinados",
          });
          setDocs(ds => [novo, ...ds]);
        }}/>}
      </div>
    );
  }

  // ── LISTA ──
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:mob?24:30,fontWeight:600}}>Proprietários</h1>
          <p style={{color:G.textDim,fontSize:13,marginTop:2}}>{lista.length} {lista.length===1?"proprietário":"proprietários"}</p>
        </div>
        <button className="btn-gold" onClick={()=>{setForm(emptyProp);setEditId(null);setMod(true);}}>+ Novo Proprietário</button>
      </div>

      <div style={{position:"relative",marginBottom:20}}>
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}><Ic n="search2" s={15} c={G.textDim}/></span>
        <input placeholder="Pesquisar por nome ou NIF..." value={search} onChange={e=>setSrch(e.target.value)} style={{paddingLeft:36}}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
        {filtered.map(p => {
          const nAl = alertasDe(p.id).length;
          return (
            <div key={p.id} className="card" style={{cursor:"pointer"}} onClick={()=>setDetail(p)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${G.goldDark},${G.gold1})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:17,color:"#0E0E0F"}}>{p.nome.charAt(0)}</div>
                  <div>
                    <p style={{fontWeight:500,fontSize:15}}>{p.nome}</p>
                    {p.nif && <span style={{fontSize:12,color:G.textDim}}>NIF {p.nif}</span>}
                  </div>
                </div>
                {nAl > 0 && <span className="tag" style={{background:`${G.red}18`,color:G.red,fontWeight:500}}>⚠ {nAl}</span>}
              </div>
              <div style={{display:"flex",gap:10,fontSize:12,color:G.textMuted}}>
                <span>🏠 {imoveisDe(p.id).length} imóveis</span>
                <span>📄 {docsDe(p.id).length} documentos</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p style={{color:G.textDim,fontSize:14,gridColumn:"1/-1"}}>Nenhum proprietário. Cria manualmente ou assina uma angariação — o proprietário é criado automaticamente.</p>}
      </div>

      {mod && <PropForm form={form} setForm={setForm} onSave={guardar} onClose={()=>{setMod(false);setForm(emptyProp);setEditId(null);}} editId={editId}/>}
    </div>
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
                <button onClick={()=>{setForm({...c,tipologia:c.tipologia||[]});setEditId(c.id);setMod(true);}} style={{background:"none",border:"none",cursor:"pointer",padding:"5px"}}><Ic n="edit" s={14} c={G.textDim}/></button>
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
      {detailCli && <ClienteDetalhe cliente={detailCli} onClose={()=>setDetailCli(null)} onEdit={()=>{setForm({...detailCli,tipologia:detailCli.tipologia||[]});setEditId(detailCli.id);setDetailCli(null);setMod(true);}} onDelete={()=>{eliminar(detailCli);setDetailCli(null);}} mob={mob} userAtual={window.__magnaUser}/>}
      
      {modal&&<Modal title={editId?"Editar Cliente":"Novo Lead"} onClose={()=>setMod(false)}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Nome completo"><input value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} placeholder="Nome do cliente"/></Field></div>
          
          <div style={{gridColumn:"1/-1", marginTop: 4}}>
            <Field label="Perfil do Cliente">
              <select value={form.perfilCliente || "comprador_tradicional"} onChange={e=>{
                const perfil = e.target.value;
                let reqs = {};
                if (perfil === 'investidor') reqs = { yieldEsperado: "", orcamentoObras: "" };
                if (perfil === 'expat_relocation') reqs = { dataChegada: "", visto: "", utilitySetup: false };
                setForm(p=>({...p, perfilCliente: perfil, requisitosEspecificos: reqs}));
              }}>
                <option value="comprador_tradicional">Comprador Tradicional</option>
                <option value="investidor">Investidor (Yield/Reabilitação)</option>
                <option value="expat_relocation">Expat / Relocation</option>
                <option value="proprietario_ativo">Proprietário Ativo</option>
              </select>
            </Field>
          </div>

          {form.perfilCliente === 'expat_relocation' && (
            <div style={{gridColumn:"1/-1", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, background: `${G.blue}10`, padding: 14, borderRadius: 8, border: `1px solid ${G.blue}30` }}>
              <Field label="Data de Chegada a Portugal">
                <input type="date" value={form.requisitosEspecificos?.dataChegada || ""} onChange={e=>setForm(p=>({...p, requisitosEspecificos: {...p.requisitosEspecificos, dataChegada: e.target.value}}))} />
              </Field>
              <Field label="Tipo de Visto">
                <select value={form.requisitosEspecificos?.visto || ""} onChange={e=>setForm(p=>({...p, requisitosEspecificos: {...p.requisitosEspecificos, visto: e.target.value}}))}>
                  <option value="">Não definido</option><option value="D7">D7 (Rendimentos passivos)</option><option value="D8">D8 (Nómada Digital)</option><option value="Golden Visa">Golden Visa</option>
                </select>
              </Field>
              <label style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: G.text }}>
                <input type="checkbox" checked={form.requisitosEspecificos?.utilitySetup || false} onChange={e=>setForm(p=>({...p, requisitosEspecificos: {...p.requisitosEspecificos, utilitySetup: e.target.checked}}))} style={{width:"auto"}}/>
                Serviço de Utility Setup (Água, Luz, Internet) desejado
              </label>
            </div>
          )}

          {form.perfilCliente === 'investidor' && (
            <div style={{gridColumn:"1/-1", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, background: `${G.gold1}10`, padding: 14, borderRadius: 8, border: `1px solid ${G.gold1}30` }}>
              <Field label="Yield Líquido Esperado (%)">
                <input type="number" step="0.5" value={form.requisitosEspecificos?.yieldEsperado || ""} onChange={e=>setForm(p=>({...p, requisitosEspecificos: {...p.requisitosEspecificos, yieldEsperado: e.target.value}}))} placeholder="Ex: 5.5" />
              </Field>
              <Field label="Orçamento para Obras (€)">
                <input type="number" value={form.requisitosEspecificos?.orcamentoObras || ""} onChange={e=>setForm(p=>({...p, requisitosEspecificos: {...p.requisitosEspecificos, orcamentoObras: e.target.value}}))} placeholder="Ex: 50000" />
              </Field>
            </div>
          )}

          <Field label="E-mail"><input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="email@exemplo.pt"/></Field>
          <Field label="Telefone"><input value={form.telefone} onChange={e=>setForm(p=>({...p,telefone:e.target.value}))} placeholder="912 345 678"/></Field>
          <Field label="Interesse"><select value={form.interesse} onChange={e=>setForm(p=>({...p,interesse:e.target.value}))}><option>Comprar</option><option>Arrendar</option><option>Vender</option></select></Field>
          <Field label="Temperatura"><select value={form.temperatura} onChange={e=>setForm(p=>({...p,temperatura:e.target.value}))}><option>Quente</option><option>Morno</option><option>Frio</option></select></Field>
          <div style={{gridColumn:"1/-1"}}>
            <Field label="Tipologia pretendida (opcional)">
              <TipologiaSelector value={form.tipologia||[]} onChange={v=>setForm(p=>({...p,tipologia:v}))}/>
            </Field>
          </div>
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
// ==========================================
// 1. DOSSIER INSTITUCIONAL (Construtores / Promotores - Versão Inovação & Captação)
// ==========================================
const gerarDossierConstrutor = () => {
  const hoje = new Date().toLocaleDateString("pt-PT");
  const dadosEmpresa = {
    nomeEmpresa: "Magna Group Real Estate",
    fundadoras: [
      { nome: "Cátia Barbosa", cargo: "Managing Partner & Founder", bio: "Especialista em transações de ativos de alto rendimento, estruturação de produto e parcerias comerciais com promotores.", iniciais: "CB" },
      { nome: "Ana Costa", cargo: "Managing Partner & Co-Founder", bio: "Foco total na qualificação de compradores institucionais, due diligence comercial e escoamento acelerado de empreendimentos.", iniciais: "AC" }
    ],
    contactoGeral: "geral@magnagroup.pt",
    telefoneGeral: "+351 900 000 000"
  };

  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Inovação e Parceria Estratégica para Construtores — Magna Group</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;color:#1c1c1c;background:#fff;line-height:1.7}
.page{max-width:820px;margin:0 auto;padding:50px}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;padding-bottom:15px;border-bottom:2px solid #C9A84C}
.logo-name{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#8B6914;letter-spacing:2px}
.logo-sub{font-size:9px;color:#888;letter-spacing:3px;text-transform:uppercase}
.badge{background:#fdf8ed;border:1px solid #e8d5a0;padding:6px 14px;border-radius:20px;font-size:11px;color:#8B6914;font-weight:600;text-transform:uppercase;letter-spacing:1px}
.hero{background:linear-gradient(135deg,#111,#1f1a10);color:#fff;padding:34px;border-radius:10px;margin-bottom:26px;border-left:4px solid #C9A84C}
.hero h1{font-family:'Cormorant Garamond',serif;font-size:27px;font-weight:600;margin-bottom:10px;color:#F0EDE6}
.hero p{font-size:13.5px;color:#dcd6cd;line-height:1.6}
h2{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#8B6914;border-bottom:1px solid #e8d5a0;padding-bottom:4px;margin:22px 0 10px}
.founders-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:14px}
.founder-card{background:#fcfbfa;padding:18px;border-radius:8px;border:1px solid #eee;text-align:center}
.avatar-box{width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#8B6914,#C9A84C);color:#0E0E0F;font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 10px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:10px}
.box{background:#fcfbfa;border-radius:8px;padding:15px;border:1px solid #eee}
.box-title{font-family:'Cormorant Garamond',serif;font-size:14.5px;font-weight:600;color:#8B6914;margin-bottom:6px}
.box-desc{font-size:11.5px;color:#555;line-height:1.5}
.quote-box{background:#faf9f5;border-left:4px solid #C9A84C;padding:16px 18px;border-radius:0 8px 8px 0;font-size:13px;color:#444;line-height:1.6;font-style:italic;margin:18px 0}
.footer{margin-top:35px;padding-top:15px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#888}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.btn-print{position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#8B6914,#C9A84C);color:#fff;border:none;padding:14px 28px;border-radius:30px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.2)}
</style></head><body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo-name">MAGNA</div>
      <div class="logo-sub">Group Real Estate · Portugal</div>
    </div>
    <div class="badge">Inovação & Parceria Estratégica</div>
  </div>

  <div class="hero">
    <h1>Inovação Comercial que Atrai Novos Compradores para o seu Empreendimento</h1>
    <p>Não nos limitamos a colocar anúncios tradicionais. Na Magna Group, implementamos canais disruptivos de captação, campanhas digitais segmentadas por Inteligência Artificial e acesso direto a redes de investimento privado que aceleram as vendas e valorizam o seu projeto.</p>
  </div>

  <h2>Serviços Inovadores de Captação e Fecho</h2>
  <div class="grid3">
    <div class="box">
      <div class="box-title">1. Marketing Preditivo por IA</div>
      <div class="box-desc">Campanhas hiper-segmentadas direcionadas a perfis com alta intenção de compra e liquidez imediata, mapeados por dados comportamentais.</div>
    </div>
    <div class="box">
      <div class="box-title">2. Roadshows Privados de Investimento</div>
      <div class="box-desc">Apresentações exclusivas do seu empreendimento em formato "Closed-Door" a redes de investidores institucionais e *family offices*.</div>
    </div>
    <div class="box">
      <div class="box-title">3. Dossiers de Oportunidade Dinâmicos</div>
      <div class="box-desc">Relatórios financeiros automáticos e transparentes entregues a cada potencial comprador, destacando yields e margens de valorização instantânea.</div>
    </div>
  </div>

  <h2>Liderança Executiva & Foco no Negócio</h2>
  <div class="founders-grid">
    <div class="founder-card">
      <div class="avatar-box">${dadosEmpresa.fundadoras[0].iniciais}</div>
      <p style="font-weight:600;font-size:14px;color:#1a1a1a">${dadosEmpresa.fundadoras[0].nome}</p>
      <p style="font-size:11px;color:#8B6914;margin-bottom:6px;text-transform:uppercase">${dadosEmpresa.fundadoras[0].cargo}</p>
      <p style="font-size:11.5px;color:#666">${dadosEmpresa.fundadoras[0].bio}</p>
    </div>
    <div class="founder-card">
      <div class="avatar-box">${dadosEmpresa.fundadoras[1].iniciais}</div>
      <p style="font-weight:600;font-size:14px;color:#1a1a1a">${dadosEmpresa.fundadoras[1].nome}</p>
      <p style="font-size:11px;color:#8B6914;margin-bottom:6px;text-transform:uppercase">${dadosEmpresa.fundadoras[1].cargo}</p>
      <p style="font-size:11.5px;color:#666">${dadosEmpresa.fundadoras[1].bio}</p>
    </div>
  </div>

  <div class="quote-box">
    "A nossa inovação traz clientes que o mercado tradicional não alcança. O construtor que trabalha connosco ganha novos canais de distribuição de produto e uma vantagem competitiva decisiva."
  </div>

  <div class="footer">
    <div><strong>${dadosEmpresa.nomeEmpresa}</strong><br>Contacto institucional: ${dadosEmpresa.contactoGeral} · ${dadosEmpresa.telefoneGeral}</div>
    <div style="text-align:right">Emitido em ${hoje}<br><em>Proposta de Parceria Comercial Confidencial</em></div>
  </div>
</div>
<button class="btn-print no-print" onclick="window.print()">🖨️ Imprimir / Guardar Dossier PDF</button>
</body></html>`);
  win.document.close();
};

// ==========================================
// 2. DOSSIER DE INVESTIDOR (Imóveis - Versão Avançada & IA)
// ==========================================

// Tabela IMT 2026 (Continente) — Habitação Própria e Permanente
// Fonte: Ofício Circulado 40129/2026 AT / OE2026. Confirmar em portaldasfinancas.gov.pt.
const ESCALOES_IMT_HPP = [
  { ate: 106346,  taxa: 0,    parcela: 0 },
  { ate: 145470,  taxa: 0.02, parcela: 2127 },
  { ate: 198347,  taxa: 0.05, parcela: 6491 },
  { ate: 330539,  taxa: 0.07, parcela: 10458 },
  { ate: 660982,  taxa: 0.08, parcela: 13763 },
  { ate: 1150853, taxa: 0.06, parcela: 0, unica: true },
  { ate: Infinity,taxa: 0.075,parcela: 0, unica: true },
];
// Não-HPP (segunda habitação / investimento) — estrutura aproximada (1º escalão sem isenção,
// limiar da taxa única mais baixo). VALORES A CONFIRMAR antes de apresentar ao investidor.
const ESCALOES_IMT_NHPP = [
  { ate: 106346,  taxa: 0.01, parcela: 0 },
  { ate: 145470,  taxa: 0.02, parcela: 1063 },
  { ate: 198347,  taxa: 0.05, parcela: 5427 },
  { ate: 330539,  taxa: 0.07, parcela: 9394 },
  { ate: 574323,  taxa: 0.08, parcela: 12699 },
  { ate: 1150853, taxa: 0.06, parcela: 0, unica: true },
  { ate: Infinity,taxa: 0.075,parcela: 0, unica: true },
];
const calcIMT = (valor, tipo = "nhpp") => {
  const tab = tipo === "hpp" ? ESCALOES_IMT_HPP : ESCALOES_IMT_NHPP;
  for (const e of tab) {
    if (valor <= e.ate) return e.unica ? valor * e.taxa : Math.max(0, valor * e.taxa - e.parcela);
  }
  return 0;
};
const calcSelo = (valor) => valor * 0.008; // Imposto do Selo — 0,8% da base tributável

const CAPEX_M2 = {
  "Novo / Sem obras": 0,
  "Bom estado / Cosmético": 150,
  "A necessitar de obras moderadas": 400,
  "A necessitar de reabilitação profunda": 800,
};

// Cálculo completo das métricas de investimento
const calcMetricasInvestimento = (input) => {
  const {
    precoAquisicao, area, precoM2Mercado, rendaMensal,
    estadoImovel, tipoIMT, emolumentos, imiPercent,
    condominioMensal, seguroAnual, vacanciaPercent,
    capitalPropriPercent, taxaJuro, valorizacaoAnual, prazoFlipMeses,
  } = input;

  const precoM2Imovel = area > 0 ? precoAquisicao / area : 0;
  const descontoMercado = precoM2Mercado > 0 ? ((precoM2Mercado - precoM2Imovel) / precoM2Mercado) * 100 : 0;

  const imt = calcIMT(precoAquisicao, tipoIMT);
  const selo = calcSelo(precoAquisicao);
  const custosTransacao = imt + selo + Number(emolumentos || 0);

  const capexM2 = CAPEX_M2[estadoImovel] ?? 0;
  const capex = capexM2 * area;

  const investimentoTotal = precoAquisicao + custosTransacao + capex;

  const rendaAnual = rendaMensal * 12;
  const yieldBruta = investimentoTotal > 0 ? (rendaAnual / investimentoTotal) * 100 : 0;

  const imiAnual = precoAquisicao * (Number(imiPercent || 0.4) / 100);
  const vacancia = rendaAnual * (Number(vacanciaPercent || 5) / 100);
  const custosFixosAnuais = imiAnual + Number(condominioMensal || 0) * 12 + Number(seguroAnual || 0) + vacancia;

  const cppFrac = Number(capitalPropriPercent || 100) / 100;
  const financiamento = investimentoTotal * (1 - cppFrac);
  const jurosAnuais = financiamento * (Number(taxaJuro || 0) / 100);

  const cashFlowLiquido = rendaAnual - custosFixosAnuais - jurosAnuais;
  const yieldLiquida = investimentoTotal > 0 ? ((rendaAnual - custosFixosAnuais) / investimentoTotal) * 100 : 0;

  const cashInvestido = investimentoTotal * cppFrac;
  const cashOnCash = cashInvestido > 0 ? (cashFlowLiquido / cashInvestido) * 100 : 0;

  // Valor de mercado actual do imóvel (base correcta para projectar revenda —
  // nunca o preço de aquisição, que já está descontado)
  const valorMercadoAtual = precoM2Mercado > 0 ? precoM2Mercado * area : precoAquisicao;

  // Cenário C — Flip com obras: valor pós-obras = valor de mercado + prémio modesto por reabilitação
  const valorPosObras = valorMercadoAtual + capex * 0.2;
  const valAnual = Number(valorizacaoAnual || 0) / 100;
  const meses = Number(prazoFlipMeses || 12);
  const valorProjectado = valorPosObras * Math.pow(1 + valAnual, meses / 12);
  const maisValia = valorProjectado - investimentoTotal;

  // Cenário D — Compra e revenda sem obras: revende-se ao valor de mercado, não ao preço pago
  const mesesRevendaRapida = Math.min(meses, 6);
  const investimentoSemObras = precoAquisicao + custosTransacao;
  const valorRevendaRapida = valorMercadoAtual * Math.pow(1 + valAnual, mesesRevendaRapida / 12);
  const ganhoRevendaRapida = valorRevendaRapida - investimentoSemObras;

  return {
    precoM2Imovel, descontoMercado, imt, selo, custosTransacao, capex, capexM2,
    investimentoTotal, rendaAnual, yieldBruta, imiAnual, vacancia, custosFixosAnuais,
    financiamento, jurosAnuais, cashFlowLiquido, yieldLiquida, cashInvestido, cashOnCash,
    valorPosObras, valorProjectado, maisValia, meses,
    mesesRevendaRapida, investimentoSemObras, valorRevendaRapida, ganhoRevendaRapida,
  };
};

// Pesquisa de mercado assistida por IA (usa web search via callClaude)
const pesquisarMercadoInvestidor = async (imovel) => {
  const loc = [imovel.freguesia, imovel.concelho, imovel.distrito].filter(Boolean).join(", ");
  const prompt = `Especialista em investimento imobiliário em Portugal. Faz no máximo 1 pesquisa web ("${imovel.tipo||"imóvel"} ${loc} preço m² renda mensal") e devolve APENAS este JSON, sem markdown nem texto adicional:
{"preco_m2_medio": 0, "renda_mensal_sugerida": 0, "valorizacao_anual_pct": 0, "argumentos": ["...", "...", "..."], "fonte_precos": "..."}
Os "argumentos" são 3 razões concretas para investir nesta localização (transportes, procura, desenvolvimento urbano). Tipo: ${imovel.tipo||""}, área: ${imovel.area||""}m².`;

  const raw = await callClaude(prompt, "claude-sonnet-4-6", true);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Não foi possível interpretar os dados de mercado.");
  return JSON.parse(match[0]);
};

// Logótipo Magna Group — dourado, fundo transparente
const MAGNA_LOGO_B64 = "iVBORw0KGgoAAAANSUhEUgAAAUAAAAHWCAYAAAAGr1D0AAEAAElEQVR42ux9d5weVdn2dd9n5mnbN8mmd1LYJEAIhISWBJDeYSOKCipNwYrttW0W9NVXsb8qRF97zQIWEEEQiHQkdJIQ0vv2/rSZc+7vjzPz7GJnEwh+nuv3g002u/vMzjNzzV2vC3BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHB4bUD/Dge5alWD+nc5VgcHh38DNDY2MhGhsbGRX8/HKSKW+Ij+bQjbwcHh9R9RAYBnSeZ1SYIUk98Xrzr+NAApZgYAdu+gg4PDsHDffY0eAHzi/aed8Pw9n3j8v9654A1DP/86Ij8GgO99/m3/27XjF/KNT5zzYwAckaIjQQcHh1eGJ564wgeAT7//1Eue/v1Hitvv/pC8sPoz2fe+49SLXkckSCKiAOAT7zv7O31bVkrhhc/mB3b8UP738+++FUBCeQqNjgQdHBxeceT34TMufvaej8mjP7rM/OpzZxee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";

// HTML do Dossier de Investimento
const htmlDossierInvestidor = (imovel, mercado, m, agente) => {
  const loc = [imovel.freguesia, imovel.concelho, imovel.distrito].filter(Boolean).join(", ");
  const hoje = new Date().toLocaleDateString("pt-PT");
  const eur = (v) => Number(v||0).toLocaleString("pt-PT",{maximumFractionDigits:0}) + " €";
  const pct = (v) => Number(v||0).toLocaleString("pt-PT",{maximumFractionDigits:1}) + "%";
  const ganhoEquity = m.descontoMercado>0 ? (m.descontoMercado/100*mercado.preco_m2_medio*imovel.area) : 0;
  const isTerreno = imovel.tipoAtivo === "terreno";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Dossier de Investimento — ${imovel.titulo}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;color:#1a1a1a;background:#fff;font-size:13.5px;line-height:1.65;-webkit-font-smoothing:antialiased}
.page{max-width:820px;margin:0 auto;padding:0 0 50px}

/* CAPA */
.cover{background:linear-gradient(160deg,#0E0E0F 0%,#181614 55%,#1f1a10 100%);color:#F5EFE3;padding:44px 60px 36px;text-align:center;position:relative;overflow:hidden}
.cover::before{content:'';position:absolute;top:-40%;right:-15%;width:70%;height:140%;background:radial-gradient(circle,rgba(201,168,76,0.08) 0%,transparent 70%)}
.cover-logo-img{width:84px;height:auto;margin:0 auto 14px;display:block;position:relative;z-index:1}
.cover-sub{font-size:9px;letter-spacing:3.5px;text-transform:uppercase;color:#C9A84C;margin-bottom:26px;position:relative;z-index:1}
.cover-eyebrow{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:15px;color:#C9A84C99;margin-bottom:10px;position:relative;z-index:1}
.cover-h1{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:600;margin-bottom:14px;line-height:1.15;position:relative;z-index:1}
.cover-loc{font-size:12.5px;color:#F5EFE3B0;margin-bottom:22px;letter-spacing:.3px;position:relative;z-index:1}
.cover-divider{width:48px;height:1px;background:#C9A84C;margin:0 auto 22px;position:relative;z-index:1}
.cover-meta{font-size:9.5px;color:#F5EFE370;letter-spacing:1.2px;text-transform:uppercase;position:relative;z-index:1}

/* RESUMO EXECUTIVO */
.exec-summary{background:#0E0E0F;padding:22px 60px;display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background-color:#2a2a28}
.exec-item{background:#0E0E0F;padding:16px 14px;text-align:center}
.exec-label{font-size:8px;letter-spacing:1.2px;text-transform:uppercase;color:#C9A84C;margin-bottom:7px}
.exec-value{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:#F5EFE3;line-height:1.1}
.exec-value.pos{color:#7FBF8F}

/* CORPO */
.body-pad{padding:0 60px}
.section{margin-top:44px}
.section-num{font-family:'Cormorant Garamond',serif;font-size:11px;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;margin-bottom:4px}
h2{font-family:'Cormorant Garamond',serif;font-size:25px;font-weight:600;color:#1a1a1a;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #ECE6D6}
h3{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:#8B6914;margin:26px 0 12px;letter-spacing:.2px}
.lead{font-size:14.5px;color:#333;line-height:1.85;margin-bottom:20px}
.lead strong{color:#8B6914;font-weight:600}

.argumentos{display:grid;gap:1px;margin:22px 0;background:#ECE6D6;border:1px solid #ECE6D6}
.arg{display:flex;gap:16px;padding:16px 20px;background:#fff;align-items:flex-start}
.arg-num{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:#C9A84C;flex-shrink:0;opacity:.7}
.arg-txt{font-size:13px;color:#3a3a3a;padding-top:3px;line-height:1.6}

.kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin:24px 0;background:#0E0E0F;border-radius:2px;overflow:hidden}
.kpi{background:#0E0E0F;color:#F5EFE3;padding:24px 18px;text-align:center}
.kpi-label{font-size:8.5px;letter-spacing:1.3px;text-transform:uppercase;color:#C9A84C;margin-bottom:9px}
.kpi-value{font-family:'Cormorant Garamond',serif;font-size:27px;font-weight:700}
.kpi-sub{font-size:9.5px;color:#F5EFE399;margin-top:5px;line-height:1.4}

.context-note{font-size:12.5px;color:#666;line-height:1.75;padding:16px 20px;background:#FAF8F2;border-left:2px solid #C9A84C;margin:18px 0}
.context-note strong{color:#1a1a1a}

.statement{margin:20px 0}
.statement-row{display:flex;justify-content:space-between;align-items:baseline;padding:11px 2px;border-bottom:1px solid #F0EDE3}
.statement-row .label{font-size:13px;color:#444}
.statement-row .label small{display:block;font-size:10.5px;color:#999;margin-top:1px}
.statement-row .value{font-size:14px;font-weight:600;color:#1a1a1a;white-space:nowrap;padding-left:20px}
.statement-row.deduction .value{color:#A85454}
.statement-row.total{border-top:2px solid #C9A84C;border-bottom:none;padding-top:16px;margin-top:4px}
.statement-row.total .label{font-size:14.5px;font-weight:600;color:#1a1a1a}
.statement-row.total .value{font-size:19px;font-family:'Cormorant Garamond',serif;font-weight:700;color:#8B6914}

.scenario{background:#FAF8F2;border:1px solid #ECE6D6;border-radius:4px;padding:24px 26px;margin-bottom:16px;page-break-inside:avoid}
.scenario-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.scenario-name{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;color:#1a1a1a}
.scenario-tag{font-size:9.5px;letter-spacing:1px;text-transform:uppercase;background:#C9A84C;color:#0E0E0F;padding:5px 12px;border-radius:2px;font-weight:600;white-space:nowrap}
.scenario-desc{font-size:12.5px;color:#555;line-height:1.65;margin-bottom:16px}
.scenario-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding-top:14px;border-top:1px solid #ECE6D6}
.sg-item{text-align:center}
.sg-label{font-size:8.5px;color:#999;text-transform:uppercase;letter-spacing:.8px}
.sg-value{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#1a1a1a;margin-top:4px}
.scenario-foot{font-size:10px;color:#999;margin-top:12px;line-height:1.6;font-style:italic}

.disclaimer{margin-top:44px;padding:20px 24px;background:#FAF8F2;border-radius:4px;font-size:10px;color:#999;line-height:1.7}
.disclaimer strong{color:#666}
.footer{margin-top:36px;padding:28px 60px;background:#0E0E0F;text-align:center}
.footer-logo{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:700;color:#C9A84C;letter-spacing:2px;margin-bottom:6px}
.footer-text{font-size:9.5px;color:#F5EFE380;letter-spacing:.3px}

#btn-gerar-pdf{position:fixed;bottom:24px;right:24px;background:#C9A84C;color:#0E0E0F;border:none;border-radius:30px;padding:14px 28px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;letter-spacing:.3px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.3);z-index:999}
#btn-gerar-pdf:hover{background:#DBB85E}

@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .scenario{page-break-inside:avoid}
  .section{page-break-inside:avoid}
  #btn-gerar-pdf{display:none}
}
</style></head><body><div class="page">

<div class="cover">
  <img src="data:image/png;base64,${MAGNA_LOGO_B64}" class="cover-logo-img" alt="Magna Group Real Estate"/>
  <div class="cover-sub">Investment Advisory · Portugal</div>
  <div class="cover-eyebrow">Dossier de Investimento</div>
  <div class="cover-h1">${imovel.titulo}</div>
  <div class="cover-loc">📍 ${loc}</div>
  <div class="cover-divider"></div>
  <div class="cover-meta">Preparado em ${hoje} · Confidencial</div>
</div>

<div class="exec-summary">
  <div class="exec-item"><div class="exec-label">Desconto de Mercado</div><div class="exec-value ${m.descontoMercado>0?'pos':''}">${pct(Math.abs(m.descontoMercado))}</div></div>
  ${isTerreno ? `
  <div class="exec-item"><div class="exec-label">Ganho Estimado Revenda</div><div class="exec-value pos">${eur(m.ganhoRevendaRapida)}</div></div>
  <div class="exec-item"><div class="exec-label">Projecto Aprovado</div><div class="exec-value" style="font-size:20px">${imovel.temProjetoAprovado?"Sim":"Não"}</div></div>
  ` : `
  <div class="exec-item"><div class="exec-label">Yield Líquida</div><div class="exec-value">${pct(m.yieldLiquida)}</div></div>
  <div class="exec-item"><div class="exec-label">Cash-on-Cash</div><div class="exec-value">${pct(m.cashOnCash)}</div></div>
  `}
  <div class="exec-item"><div class="exec-label">Investimento Total</div><div class="exec-value" style="font-size:20px">${eur(m.investimentoTotal)}</div></div>
</div>

<div class="body-pad">

<div class="section">
  <div class="section-num">01</div>
  <h2>Localização e Fundamentos</h2>
  <p class="lead">${mercado.narrativa || `${imovel.titulo} está localizado em ${loc}, uma zona com fundamentos sólidos para valorização${isTerreno?"":" e procura de arrendamento sustentada"}.`}</p>
  <div class="argumentos">
    ${(mercado.argumentos||[]).map((a,i)=>`<div class="arg"><div class="arg-num">${String(i+1).padStart(2,"0")}</div><div class="arg-txt">${a}</div></div>`).join("")}
  </div>
  ${isTerreno ? `<div class="context-note"><strong>Especificações do terreno:</strong> Projecto aprovado: ${imovel.temProjetoAprovado?"Sim":"Não"} · Topografia: ${imovel.topografia||"—"}${imovel.viabilidadeConstrutivaPip?` · ${imovel.viabilidadeConstrutivaPip}`:""}${(imovel.infraestruturasBasicas||[]).length?` · Infraestruturas: ${imovel.infraestruturasBasicas.join(", ")}`:""}</div>`:""}
</div>

<div class="section">
  <div class="section-num">02</div>
  <h2>Margem de Negócio</h2>
  <p class="lead">Este ${isTerreno?"terreno":"imóvel"} está a ser transaccionado a <strong>${eur(m.precoM2Imovel)}/m²</strong>, face a uma média de <strong>${eur(mercado.preco_m2_medio)}/m²</strong> para ${isTerreno?"terrenos comparáveis":"imóveis comparáveis"} na mesma zona${mercado.fonte_precos?` (fonte: ${mercado.fonte_precos})`:""}.</p>
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Preço /m² Aquisição</div><div class="kpi-value">${eur(m.precoM2Imovel)}</div></div>
    <div class="kpi"><div class="kpi-label">Preço /m² Médio Zona</div><div class="kpi-value">${eur(mercado.preco_m2_medio)}</div></div>
    <div class="kpi"><div class="kpi-label">${m.descontoMercado>0?"Desconto":"Prémio"} face ao Mercado</div><div class="kpi-value">${pct(Math.abs(m.descontoMercado))}</div></div>
  </div>
  ${ganhoEquity>0?`<div class="context-note">Ao preço actual, este ${isTerreno?"terreno":"imóvel"} representa um <strong>ganho potencial imediato de ${eur(ganhoEquity)}</strong> (instant equity) face ao valor médio de mercado da zona — capital que o investidor captura no momento da aquisição, antes de qualquer valorização futura.</div>`:""}
</div>

${isTerreno ? `
<div class="section">
  <div class="section-num">03</div>
  <h2>Estrutura de Investimento</h2>
  <p class="lead">Custos de aquisição de um terreno. Não são aplicáveis métricas de rentabilidade por arrendamento, uma vez que um terreno não gera renda enquanto não for edificado.</p>
  <div class="statement">
    <div class="statement-row"><div class="label">Preço de aquisição</div><div class="value">${eur(imovel.valor)}</div></div>
    <div class="statement-row deduction"><div class="label">IMT<small>Imposto Municipal sobre Transmissões</small></div><div class="value">+ ${eur(m.imt)}</div></div>
    <div class="statement-row deduction"><div class="label">Imposto do Selo<small>0,8% da base tributável</small></div><div class="value">+ ${eur(m.selo)}</div></div>
    <div class="statement-row deduction"><div class="label">Emolumentos e registo<small>Notário, conservatória</small></div><div class="value">+ ${eur(m.custosTransacao-m.imt-m.selo)}</div></div>
    <div class="statement-row total"><div class="label">Investimento Total</div><div class="value">${eur(m.investimentoSemObras)}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-num">04</div>
  <h2>Cenários de Saída</h2>
  <p class="lead">Dois caminhos possíveis para este terreno, consoante o apetite de risco e horizonte temporal do investidor.</p>

  <div class="scenario">
    <div class="scenario-head"><span class="scenario-name">A · Revenda Directa do Terreno</span><span class="scenario-tag">Instant Equity</span></div>
    <p class="scenario-desc">Aquisição e revenda do terreno sem intervenção, capturando o desconto de aquisição num horizonte curto de ${m.mesesRevendaRapida} meses.</p>
    <div class="scenario-grid">
      <div class="sg-item"><div class="sg-label">Investimento Total</div><div class="sg-value">${eur(m.investimentoSemObras)}</div></div>
      <div class="sg-item"><div class="sg-label">Valor Projectado Revenda</div><div class="sg-value">${eur(m.valorRevendaRapida)}</div></div>
      <div class="sg-item"><div class="sg-label">Ganho Estimado</div><div class="sg-value">${eur(m.ganhoRevendaRapida)}</div></div>
    </div>
    <p class="scenario-foot">Não inclui tributação de mais-valias nem custos de revenda.</p>
  </div>

  <div class="scenario">
    <div class="scenario-head"><span class="scenario-name">B · Construir e Vender</span><span class="scenario-tag">Ganho de Capital</span></div>
    <p class="scenario-desc">Desenvolvimento do terreno${imovel.temProjetoAprovado?" (projecto já aprovado)":""} e venda das unidades construídas, num horizonte de ${m.meses} meses.</p>
    <div class="scenario-grid">
      <div class="sg-item"><div class="sg-label">Valor do Terreno + Prémio</div><div class="sg-value">${eur(m.valorPosObras)}</div></div>
      <div class="sg-item"><div class="sg-label">Valor Projectado</div><div class="sg-value">${eur(m.valorProjectado)}</div></div>
      <div class="sg-item"><div class="sg-label">Mais-Valia Estimada</div><div class="sg-value">${eur(m.maisValia)}</div></div>
    </div>
    <p class="scenario-foot">Assume valorização anual de ${pct(mercado.valorizacao_anual_pct)} na zona. Não inclui custo de construção, tributação de mais-valias nem custos de revenda — apenas o efeito da valorização do terreno com projecto associado.</p>
  </div>
</div>
` : `
<div class="section">
  <div class="section-num">03</div>
  <h2>Análise Financeira</h2>
  <p class="lead">Estrutura completa de custos de aquisição e rentabilidade anual projectada, com todas as provisões de risco incluídas.</p>

  <h3>Custos de Aquisição</h3>
  <div class="statement">
    <div class="statement-row"><div class="label">Preço de aquisição</div><div class="value">${eur(imovel.valor)}</div></div>
    <div class="statement-row deduction"><div class="label">IMT<small>Imposto Municipal sobre Transmissões</small></div><div class="value">+ ${eur(m.imt)}</div></div>
    <div class="statement-row deduction"><div class="label">Imposto do Selo<small>0,8% da base tributável</small></div><div class="value">+ ${eur(m.selo)}</div></div>
    <div class="statement-row deduction"><div class="label">Emolumentos e registo<small>Notário, conservatória</small></div><div class="value">+ ${eur(m.custosTransacao-m.imt-m.selo)}</div></div>
    <div class="statement-row deduction"><div class="label">CapEx — obras e reabilitação<small>${m.capexM2} €/m² · estado do imóvel</small></div><div class="value">+ ${eur(m.capex)}</div></div>
    <div class="statement-row total"><div class="label">Investimento Total</div><div class="value">${eur(m.investimentoTotal)}</div></div>
  </div>

  <h3>Rentabilidade Anual</h3>
  <div class="statement">
    <div class="statement-row"><div class="label">Renda mensal estimada</div><div class="value">${eur(mercado.renda_mensal_sugerida)}</div></div>
    <div class="statement-row"><div class="label">Renda anual bruta</div><div class="value">${eur(m.rendaAnual)}</div></div>
    <div class="statement-row deduction"><div class="label">IMI estimado</div><div class="value">− ${eur(m.imiAnual)}</div></div>
    <div class="statement-row deduction"><div class="label">Condomínio e seguro</div><div class="value">− ${eur(m.custosFixosAnuais-m.imiAnual-m.vacancia)}</div></div>
    <div class="statement-row deduction"><div class="label">Provisão de vacância<small>5% da renda anual</small></div><div class="value">− ${eur(m.vacancia)}</div></div>
    ${m.jurosAnuais>0?`<div class="statement-row deduction"><div class="label">Juros de financiamento</div><div class="value">− ${eur(m.jurosAnuais)}</div></div>`:""}
    <div class="statement-row total"><div class="label">Cash-flow Líquido Anual</div><div class="value">${eur(m.cashFlowLiquido)}</div></div>
  </div>

  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Yield Bruta</div><div class="kpi-value">${pct(m.yieldBruta)}</div></div>
    <div class="kpi"><div class="kpi-label">Yield Líquida</div><div class="kpi-value">${pct(m.yieldLiquida)}</div></div>
    <div class="kpi"><div class="kpi-label">Cash-on-Cash Return</div><div class="kpi-value">${pct(m.cashOnCash)}</div><div class="kpi-sub">sobre ${eur(m.cashInvestido)} de capital próprio</div></div>
  </div>
</div>

<div class="section">
  <div class="section-num">04</div>
  <h2>Cenários de Saída</h2>
  <p class="lead">Quatro caminhos possíveis para este activo, consoante o horizonte temporal e o apetite de gestão do investidor.</p>

  <div class="scenario">
    <div class="scenario-head"><span class="scenario-name">A · Arrendamento Longa Duração</span><span class="scenario-tag">Rendimento Estável</span></div>
    <p class="scenario-desc">Rendimento mensal recorrente e preservação de capital, com inquilino em contrato de longa duração.</p>
    <div class="scenario-grid">
      <div class="sg-item"><div class="sg-label">Renda Mensal</div><div class="sg-value">${eur(mercado.renda_mensal_sugerida)}</div></div>
      <div class="sg-item"><div class="sg-label">Yield Líquida</div><div class="sg-value">${pct(m.yieldLiquida)}</div></div>
      <div class="sg-item"><div class="sg-label">Cash-on-Cash</div><div class="sg-value">${pct(m.cashOnCash)}</div></div>
    </div>
  </div>

  <div class="scenario">
    <div class="scenario-head"><span class="scenario-name">B · Alojamento Local</span><span class="scenario-tag">Receita Maximizada</span></div>
    <p class="scenario-desc">Arrendamento sazonal ou corporativo de curta/média duração, sujeito a licenciamento AL e maior gestão operacional.</p>
    <div class="scenario-grid">
      <div class="sg-item"><div class="sg-label">Renda Mensal Est.</div><div class="sg-value">${eur(mercado.renda_mensal_sugerida*1.6)}</div></div>
      <div class="sg-item"><div class="sg-label">Yield Bruta Est.</div><div class="sg-value">${pct(m.yieldBruta*1.4)}</div></div>
      <div class="sg-item"><div class="sg-label">Ocupação Assumida</div><div class="sg-value">~70%</div></div>
    </div>
    <p class="scenario-foot">Estimativa indicativa — sujeita a licenciamento, sazonalidade e custos de gestão específicos do AL, não incluídos nesta análise.</p>
  </div>

  <div class="scenario">
    <div class="scenario-head"><span class="scenario-name">C · Reabilitação e Revenda</span><span class="scenario-tag">Ganho de Capital</span></div>
    <p class="scenario-desc">Aquisição, reabilitação e revenda após valorização e requalificação, num horizonte de ${m.meses} meses.</p>
    <div class="scenario-grid">
      <div class="sg-item"><div class="sg-label">Valor Pós-Obras</div><div class="sg-value">${eur(m.valorPosObras)}</div></div>
      <div class="sg-item"><div class="sg-label">Valor Projectado Revenda</div><div class="sg-value">${eur(m.valorProjectado)}</div></div>
      <div class="sg-item"><div class="sg-label">Mais-Valia Estimada</div><div class="sg-value">${eur(m.maisValia)}</div></div>
    </div>
    <p class="scenario-foot">Assume valorização anual de ${pct(mercado.valorizacao_anual_pct)} na zona. Não inclui tributação de mais-valias nem custos de revenda.</p>
  </div>

  <div class="scenario">
    <div class="scenario-head"><span class="scenario-name">D · Compra e Revenda sem Obras</span><span class="scenario-tag">Instant Equity</span></div>
    <p class="scenario-desc">Revenda rápida sem intervenção de reabilitação, capturando o desconto de aquisição num horizonte curto de ${m.mesesRevendaRapida} meses.</p>
    <div class="scenario-grid">
      <div class="sg-item"><div class="sg-label">Investimento Total</div><div class="sg-value">${eur(m.investimentoSemObras)}</div></div>
      <div class="sg-item"><div class="sg-label">Valor Projectado Revenda</div><div class="sg-value">${eur(m.valorRevendaRapida)}</div></div>
      <div class="sg-item"><div class="sg-label">Ganho Estimado</div><div class="sg-value">${eur(m.ganhoRevendaRapida)}</div></div>
    </div>
    <p class="scenario-foot">Não inclui tributação de mais-valias nem custos de revenda. Cenário mais conservador em prazo, sem exposição a obras.</p>
  </div>
</div>
`}

<div class="disclaimer">
  <strong>Nota importante:</strong> Este dossier apresenta estimativas construídas a partir de dados de mercado e pressupostos indicados, com o apoio de pesquisa assistida por inteligência artificial. Os valores de IMT, ${isTerreno?"":"rendas, "}valorização e custos são aproximações para fins de análise preliminar e não constituem aconselhamento financeiro, fiscal ou de investimento. Antes de qualquer decisão, recomenda-se a confirmação dos valores fiscais junto do Portal das Finanças e a consulta a um contabilista, advogado ou consultor financeiro certificado.
</div>


</div>

<div class="footer">
  <div class="footer-logo">MAGNA GROUP</div>
  <div class="footer-text">Real Estate · Dossier preparado por ${agente?agente.nome:"—"} · ${hoje} · Documento confidencial, uso exclusivo do destinatário.</div>
</div>

<button id="btn-gerar-pdf" onclick="window.print()">Gerar PDF</button>
</div></body></html>`;
};
// Constrói a narrativa de abertura do dossier a partir de dados estruturados —
// nunca reaproveita o "recomendacao" da Avaliação de Mercado, que é conselho de
// estratégia de preço para o vendedor, não uma narrativa de venda para o investidor.
const construirNarrativaInvestidor = (imovel, precoM2Mercado) => {
  const loc = [imovel.freguesia, imovel.concelho].filter(Boolean).join(", ") || "uma localização estratégica";
  const precoM2Imovel = imovel.area > 0 ? imovel.valor / imovel.area : 0;
  const desconto = precoM2Mercado > 0 && precoM2Imovel > 0 ? ((precoM2Mercado - precoM2Imovel) / precoM2Mercado) * 100 : 0;
  const descontoTxt = desconto > 5 ? ` a um valor cerca de ${desconto.toFixed(0)}% abaixo do preço médio de mercado da zona` : "";
  if (imovel.tipoAtivo === "terreno") {
    return `${imovel.titulo} é um terreno situado em ${loc}${descontoTxt}. ${imovel.temProjetoAprovado ? "Com projecto de construção já aprovado, elimina-se a incerteza urbanística e reduz-se significativamente o tempo até ao início de obra." : "O potencial construtivo desta localização representa uma oportunidade de valorização através de desenvolvimento futuro."}`;
  }
  return `${imovel.titulo} está localizado em ${loc}${descontoTxt}, uma zona com fundamentos sólidos para valorização e procura de arrendamento sustentada.`;
};

const gerarPDFDossierInvestidor = (imovel, mercado, m, agente) => {
  const win = window.open("","_blank");
  win.document.write(htmlDossierInvestidor(imovel, mercado, m, agente));
  win.document.close();
};

// ── Modal: Dossier de Investimento ──
const GerarDossierInvestidor = ({ imovel, user, onClose }) => {
  const isTerreno = imovel.tipoAtivo === "terreno";
  const avaliacaoExistente = imovel.avaliacaoIA;
  const [fase, setFase] = useState(avaliacaoExistente ? "pronto" : "form"); // form | pesquisando | pronto
  const [erro, setErro] = useState(null);
  const [mercado, setMercado] = useState(avaliacaoExistente ? {
    preco_m2_medio: avaliacaoExistente.precoPorM2 || 0,
    renda_mensal_sugerida: isTerreno ? 0 : (avaliacaoExistente.rendaMensalEstimada || 0),
    valorizacao_anual_pct: avaliacaoExistente.percentualVariacao || 3,
    argumentos: avaliacaoExistente.pontosFavoraveis || [],
    fonte_precos: (avaliacaoExistente.fontesConsultadas || []).join(", "),
  } : null);
  const [narrativa, setNarrativa] = useState(avaliacaoExistente ? construirNarrativaInvestidor(imovel, avaliacaoExistente.precoPorM2) : "");
  const [usandoExistente, setUsandoExistente] = useState(!!avaliacaoExistente);
  const [input, setInput] = useState({
    precoAquisicao: imovel.valor || 0,
    area: imovel.area || 0,
    estadoImovel: isTerreno ? "Novo / Sem obras" : "Bom estado / Cosmético",
    tipoIMT: "nhpp",
    emolumentos: 900,
    imiPercent: 0.4,
    condominioMensal: 0,
    seguroAnual: 150,
    vacanciaPercent: 5,
    capitalPropriPercent: 100,
    taxaJuro: 4,
    prazoFlipMeses: 12,
  });

  const pesquisar = async () => {
    setFase("pesquisando"); setErro(null);
    try {
      const dados = await pesquisarMercadoInvestidor(imovel);
      if (isTerreno) dados.renda_mensal_sugerida = 0;
      setMercado(dados);
      setNarrativa(construirNarrativaInvestidor(imovel, dados.preco_m2_medio));
      setFase("pronto");
    } catch (e) {
      setErro("Não foi possível pesquisar dados de mercado automaticamente. Podes preencher os valores manualmente abaixo.");
      setMercado({ preco_m2_medio: 0, renda_mensal_sugerida: 0, valorizacao_anual_pct: 3, argumentos: [], fonte_precos: "" });
      setFase("pronto");
    }
  };

  const gerar = () => {
    const m = calcMetricasInvestimento({
      ...input,
      precoM2Mercado: mercado.preco_m2_medio,
      rendaMensal: mercado.renda_mensal_sugerida,
      valorizacaoAnual: mercado.valorizacao_anual_pct,
    });
    gerarPDFDossierInvestidor(imovel, { ...mercado, narrativa }, m, user);
  };

  return (
    <Modal title="Dossier de Investimento" onClose={onClose}>
      <p style={{fontSize:12,color:G.textDim,marginBottom:16}}>{imovel.titulo} · {[imovel.freguesia,imovel.concelho].filter(Boolean).join(", ")}</p>

      {fase === "form" && (
        <>
          <p style={{fontSize:13,color:G.textMuted,marginBottom:16}}>Pesquisamos dados de mercado da zona (preço/m², renda de referência, valorização) e geramos um dossier completo com margem de negócio, rentabilidade e cenários de saída.</p>
          <button className="btn-gold" onClick={pesquisar} style={{width:"100%"}}>✦ Pesquisar dados de mercado (IA)</button>
          <button className="btn-ghost" onClick={()=>{setMercado({preco_m2_medio:0,renda_mensal_sugerida:0,valorizacao_anual_pct:3,argumentos:[],fonte_precos:""});setNarrativa("");setFase("pronto");}} style={{width:"100%",marginTop:10}}>Preencher manualmente, sem pesquisa</button>
        </>
      )}

      {fase === "pesquisando" && (
        <div style={{textAlign:"center",padding:"30px 0"}}>
          <p style={{fontSize:13,color:G.gold1}}>✦ A pesquisar dados de mercado da zona...</p>
        </div>
      )}

      {fase === "pronto" && (
        <>
          {erro && <div style={{background:`${G.red}10`,border:`1px solid ${G.red}40`,borderRadius:8,padding:"10px 14px",marginBottom:14}}><p style={{fontSize:12,color:G.red}}>{erro}</p></div>}

          {usandoExistente && (
            <div style={{background:`${G.gold1}0A`,border:`1px solid ${G.gold1}30`,borderRadius:8,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <p style={{fontSize:12,color:G.gold1}}>✦ A usar a avaliação de mercado de {avaliacaoExistente.dataAnalise || "análise anterior"}</p>
              <button className="btn-ghost" style={{padding:"6px 12px",fontSize:11}} onClick={()=>{setUsandoExistente(false);setFase("pesquisando");pesquisar();}}>Actualizar pesquisa</button>
            </div>
          )}

          <h3 style={{fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",color:G.gold1,marginBottom:10}}>Dados de Mercado</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <Field label="Preço médio /m² na zona (€)"><input type="number" value={mercado.preco_m2_medio} onChange={e=>setMercado(p=>({...p,preco_m2_medio:Number(e.target.value)}))}/></Field>
            <Field label="Renda mensal sugerida (€)"><input type="number" value={mercado.renda_mensal_sugerida} onChange={e=>setMercado(p=>({...p,renda_mensal_sugerida:Number(e.target.value)}))}/></Field>
            <Field label="Valorização anual estimada (%)"><input type="number" step="0.1" value={mercado.valorizacao_anual_pct} onChange={e=>setMercado(p=>({...p,valorizacao_anual_pct:Number(e.target.value)}))}/></Field>
            <Field label="Fonte dos preços"><input value={mercado.fonte_precos} onChange={e=>setMercado(p=>({...p,fonte_precos:e.target.value}))} placeholder="Ex: Idealista, INE..."/></Field>
          </div>
          {mercado.argumentos && mercado.argumentos.length > 0 && (
            <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,padding:"10px 14px",marginBottom:16}}>
              <p style={{fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",color:G.gold1,marginBottom:6}}>Argumentos da localização (editáveis no PDF final)</p>
              {mercado.argumentos.map((a,i)=><p key={i} style={{fontSize:12,color:G.textMuted,marginBottom:3}}>• {a}</p>)}
            </div>
          )}

          <h3 style={{fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",color:G.gold1,marginBottom:10}}>Aquisição</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <Field label="Preço de aquisição (€)"><input type="number" value={input.precoAquisicao} onChange={e=>setInput(p=>({...p,precoAquisicao:Number(e.target.value)}))}/></Field>
            <Field label="Área (m²)"><input type="number" value={input.area} onChange={e=>setInput(p=>({...p,area:Number(e.target.value)}))}/></Field>
            <Field label="Estado do imóvel">
              <select value={input.estadoImovel} onChange={e=>setInput(p=>({...p,estadoImovel:e.target.value}))}>
                {Object.keys(CAPEX_M2).map(k=><option key={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Tipo de IMT">
              <select value={input.tipoIMT} onChange={e=>setInput(p=>({...p,tipoIMT:e.target.value}))}>
                <option value="nhpp">Não-HPP (investimento) — aproximado</option>
                <option value="hpp">Habitação Própria Permanente</option>
              </select>
            </Field>
            <Field label="Emolumentos/registo (€)"><input type="number" value={input.emolumentos} onChange={e=>setInput(p=>({...p,emolumentos:Number(e.target.value)}))}/></Field>
          </div>

          <h3 style={{fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",color:G.gold1,marginBottom:10}}>Custos Fixos e Financiamento</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <Field label="IMI estimado (% do valor)"><input type="number" step="0.05" value={input.imiPercent} onChange={e=>setInput(p=>({...p,imiPercent:Number(e.target.value)}))}/></Field>
            <Field label="Condomínio mensal (€)"><input type="number" value={input.condominioMensal} onChange={e=>setInput(p=>({...p,condominioMensal:Number(e.target.value)}))}/></Field>
            <Field label="Seguro anual (€)"><input type="number" value={input.seguroAnual} onChange={e=>setInput(p=>({...p,seguroAnual:Number(e.target.value)}))}/></Field>
            <Field label="Vacância (%)"><input type="number" value={input.vacanciaPercent} onChange={e=>setInput(p=>({...p,vacanciaPercent:Number(e.target.value)}))}/></Field>
            <Field label="Capital próprio (%)"><input type="number" value={input.capitalPropriPercent} onChange={e=>setInput(p=>({...p,capitalPropriPercent:Number(e.target.value)}))}/></Field>
            {input.capitalPropriPercent < 100 && <Field label="Taxa de juro do financiamento (%)"><input type="number" step="0.1" value={input.taxaJuro} onChange={e=>setInput(p=>({...p,taxaJuro:Number(e.target.value)}))}/></Field>}
            <Field label="Prazo do cenário flip (meses)"><input type="number" value={input.prazoFlipMeses} onChange={e=>setInput(p=>({...p,prazoFlipMeses:Number(e.target.value)}))}/></Field>
          </div>

          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-gold" onClick={gerar}>Gerar Dossier PDF</button>
          </div>
        </>
      )}
    </Modal>
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

  if (user) window.__magnaUser = user;
  if (!user) return <LoginScreen onLogin={u=>{setUser(u);setPage("dashboard");}}/>;

 const nav=[
  {id:"dashboard",   label:"Início",       icon:"home"},
  {id:"angariações", label:"Angariações",  icon:"file"},
  {id:"imoveis",     label:"Imóveis",      icon:"building"},
  {id:"clientes",    label:"Clientes",     icon:"users"},
  {id:"proprietarios", label:"Proprietários", icon:"key"},
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
            {page==="imoveis"&&<Imoveis imoveis={imoveis} setImoveis={wImoveis} clientes={clientes} user={user} mob={false}/>}
            {page==="clientes"&&<Clientes clientes={clientes} setClientes={wClientes} mob={false}/>}
            {page==="proprietarios"&&<Proprietarios mob={false} userAtual={user}/>}
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
            {page==="imoveis"&&<Imoveis imoveis={imoveis} setImoveis={wImoveis} clientes={clientes} user={user} mob={true}/>}
            {page==="clientes"&&<Clientes clientes={clientes} setClientes={wClientes} mob={true}/>}
            {page==="proprietarios"&&<Proprietarios mob={true} userAtual={user}/>}
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
