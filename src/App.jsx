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
- Valor actual: ${fmtFull(imovel.valor)}

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

  // Cenário C — Flip com obras
  const valorPosObras = precoAquisicao + capex * 1.2;
  const valAnual = Number(valorizacaoAnual || 0) / 100;
  const meses = Number(prazoFlipMeses || 12);
  const valorProjectado = valorPosObras * Math.pow(1 + valAnual, meses / 12);
  const maisValia = valorProjectado - investimentoTotal;

  // Cenário D — Compra e revenda sem obras (captura o desconto de aquisição, prazo curto)
  const mesesRevendaRapida = Math.min(meses, 6);
  const investimentoSemObras = precoAquisicao + custosTransacao;
  const valorRevendaRapida = precoAquisicao * Math.pow(1 + valAnual, mesesRevendaRapida / 12);
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
const MAGNA_LOGO_B64 = "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";

// HTML do Dossier de Investimento
const htmlDossierInvestidor = (imovel, mercado, m, agente) => {
  const loc = [imovel.freguesia, imovel.concelho, imovel.distrito].filter(Boolean).join(", ");
  const hoje = new Date().toLocaleDateString("pt-PT");
  const eur = (v) => Number(v||0).toLocaleString("pt-PT",{maximumFractionDigits:0}) + " €";
  const pct = (v) => Number(v||0).toLocaleString("pt-PT",{maximumFractionDigits:1}) + "%";
  const ganhoEquity = m.descontoMercado>0 ? (m.descontoMercado/100*mercado.preco_m2_medio*imovel.area) : 0;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Dossier de Investimento — ${imovel.titulo}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;color:#1a1a1a;background:#fff;font-size:13.5px;line-height:1.65;-webkit-font-smoothing:antialiased}
.page{max-width:820px;margin:0 auto;padding:0 0 50px}

/* CAPA */
.cover{background:linear-gradient(160deg,#0E0E0F 0%,#181614 55%,#1f1a10 100%);color:#F5EFE3;padding:80px 60px 70px;text-align:center;position:relative;overflow:hidden}
.cover::before{content:'';position:absolute;top:-40%;right:-15%;width:70%;height:140%;background:radial-gradient(circle,rgba(201,168,76,0.08) 0%,transparent 70%)}
.cover-logo-img{width:120px;height:auto;margin:0 auto 22px;display:block;position:relative;z-index:1}
.cover-sub{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C9A84C;margin-bottom:56px;position:relative;z-index:1}
.cover-eyebrow{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:16px;color:#C9A84C99;margin-bottom:14px;position:relative;z-index:1}
.cover-h1{font-family:'Cormorant Garamond',serif;font-size:44px;font-weight:600;margin-bottom:20px;line-height:1.15;position:relative;z-index:1}
.cover-loc{font-size:13px;color:#F5EFE3B0;margin-bottom:50px;letter-spacing:.3px;position:relative;z-index:1}
.cover-divider{width:56px;height:1px;background:#C9A84C;margin:0 auto 50px;position:relative;z-index:1}
.cover-meta{font-size:10px;color:#F5EFE370;letter-spacing:1.5px;text-transform:uppercase;position:relative;z-index:1}

/* RESUMO EXECUTIVO */
.exec-summary{background:#0E0E0F;padding:38px 60px;display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background-color:#2a2a28}
.exec-item{background:#0E0E0F;padding:24px 18px;text-align:center}
.exec-label{font-size:8.5px;letter-spacing:1.3px;text-transform:uppercase;color:#C9A84C;margin-bottom:10px}
.exec-value{font-family:'Cormorant Garamond',serif;font-size:25px;font-weight:700;color:#F5EFE3;line-height:1.1}
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

@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .scenario{page-break-inside:avoid}
  .section{page-break-inside:avoid}
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
  <div class="exec-item"><div class="exec-label">Yield Líquida</div><div class="exec-value">${pct(m.yieldLiquida)}</div></div>
  <div class="exec-item"><div class="exec-label">Cash-on-Cash</div><div class="exec-value">${pct(m.cashOnCash)}</div></div>
  <div class="exec-item"><div class="exec-label">Investimento Total</div><div class="exec-value" style="font-size:20px">${eur(m.investimentoTotal)}</div></div>
</div>

<div class="body-pad">

<div class="section">
  <div class="section-num">01</div>
  <h2>Localização e Fundamentos</h2>
  <p class="lead">${mercado.narrativa || `${imovel.titulo} está localizado em ${loc}, uma zona com fundamentos sólidos para valorização e procura de arrendamento sustentada.`}</p>
  <div class="argumentos">
    ${(mercado.argumentos||[]).map((a,i)=>`<div class="arg"><div class="arg-num">${String(i+1).padStart(2,"0")}</div><div class="arg-txt">${a}</div></div>`).join("")}
  </div>
</div>

<div class="section">
  <div class="section-num">02</div>
  <h2>Margem de Negócio</h2>
  <p class="lead">Este imóvel está a ser transaccionado a <strong>${eur(m.precoM2Imovel)}/m²</strong>, face a uma média de <strong>${eur(mercado.preco_m2_medio)}/m²</strong> para imóveis comparáveis na mesma zona${mercado.fonte_precos?` (fonte: ${mercado.fonte_precos})`:""}.</p>
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Preço /m² Aquisição</div><div class="kpi-value">${eur(m.precoM2Imovel)}</div></div>
    <div class="kpi"><div class="kpi-label">Preço /m² Médio Zona</div><div class="kpi-value">${eur(mercado.preco_m2_medio)}</div></div>
    <div class="kpi"><div class="kpi-label">${m.descontoMercado>0?"Desconto":"Prémio"} face ao Mercado</div><div class="kpi-value">${pct(Math.abs(m.descontoMercado))}</div></div>
  </div>
  ${ganhoEquity>0?`<div class="context-note">Ao preço actual, este imóvel representa um <strong>ganho potencial imediato de ${eur(ganhoEquity)}</strong> (instant equity) face ao valor médio de mercado da zona — capital que o investidor captura no momento da aquisição, antes de qualquer valorização futura.</div>`:""}
</div>

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

<div class="disclaimer">
  <strong>Nota importante:</strong> Este dossier apresenta estimativas construídas a partir de dados de mercado e pressupostos indicados, com o apoio de pesquisa assistida por inteligência artificial. Os valores de IMT, rendas, valorização e custos são aproximações para fins de análise preliminar e não constituem aconselhamento financeiro, fiscal ou de investimento. Antes de qualquer decisão, recomenda-se a confirmação dos valores fiscais junto do Portal das Finanças e a consulta a um contabilista, advogado ou consultor financeiro certificado.
</div>

</div>

<div class="footer">
  <div class="footer-logo">MAGNA GROUP</div>
  <div class="footer-text">Real Estate · Dossier preparado por ${agente?agente.nome:"—"} · ${hoje} · Documento confidencial, uso exclusivo do destinatário.</div>
</div>

</div><script>window.print();window.onafterprint=()=>window.close();</script></body></html>`;
};
const gerarPDFDossierInvestidor = (imovel, mercado, m, agente) => {
  const win = window.open("","_blank");
  win.document.write(htmlDossierInvestidor(imovel, mercado, m, agente));
  win.document.close();
};

// ── Modal: Dossier de Investimento ──
const GerarDossierInvestidor = ({ imovel, user, onClose }) => {
  const avaliacaoExistente = imovel.avaliacaoIA;
  const [fase, setFase] = useState(avaliacaoExistente ? "pronto" : "form"); // form | pesquisando | pronto
  const [erro, setErro] = useState(null);
  const [mercado, setMercado] = useState(avaliacaoExistente ? {
    preco_m2_medio: avaliacaoExistente.precoPorM2 || 0,
    renda_mensal_sugerida: avaliacaoExistente.rendaMensalEstimada || 0,
    valorizacao_anual_pct: avaliacaoExistente.percentualVariacao || 3,
    argumentos: avaliacaoExistente.pontosFavoraveis || [],
    fonte_precos: (avaliacaoExistente.fontesConsultadas || []).join(", "),
  } : null);
  const [narrativa, setNarrativa] = useState(avaliacaoExistente ? (avaliacaoExistente.recomendacao || "") : "");
  const [usandoExistente, setUsandoExistente] = useState(!!avaliacaoExistente);
  const [input, setInput] = useState({
    precoAquisicao: imovel.valor || 0,
    area: imovel.area || 0,
    estadoImovel: "Bom estado / Cosmético",
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
      setMercado(dados);
      setNarrativa(`Localizado em ${[imovel.freguesia,imovel.concelho].filter(Boolean).join(", ")}, este imóvel insere-se numa zona com procura consolidada e fundamentos claros de valorização.`);
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
