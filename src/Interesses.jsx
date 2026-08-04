import React, { useState, useEffect, useMemo } from "react";
import { dbInteresses } from "./db.js";

/* ═══════════════════════════════════════════════════════════
   INTERESSES — ligação entre cliente e imóvel
   Usar em dois sítios:
     <Interesses modo="imovel"  imovel={imovel}   clientes={clientes} user={user}/>
     <Interesses modo="cliente" cliente={cliente} imoveis={imoveis}   user={user}/>
   ═══════════════════════════════════════════════════════════ */

const C = {
  gold: "#C9A84C", goldDim: "rgba(201,168,76,.4)",
  surface: "#161618", line: "#2E2E33",
  text: "#F0EDE6", dim: "#8A8880", faint: "#5A5855",
  ok: "#5B9E6E", warn: "#D98A6A", bad: "#B4553C",
};

export const ESTADOS = [
  { id: "sugerido",    nome: "Sugerido",    cor: C.faint },
  { id: "apresentado", nome: "Apresentado", cor: C.dim },
  { id: "visitou",     nome: "Visitou",     cor: "#7A9BC4" },
  { id: "proposta",    nome: "Proposta",    cor: C.gold },
  { id: "reservado",   nome: "Reservado",   cor: "#C48A4C" },
  { id: "fechado",     nome: "Fechado",     cor: C.ok },
  { id: "recusado",    nome: "Recusado",    cor: C.bad },
];

const MOTIVOS = ["Preço", "Estado do imóvel", "Zona", "Tipologia/áreas", "Financiamento", "Comprou outro", "Outro"];

/* ── Checklist documental ────────────────────────────────────
   Gerada conforme o imóvel. Validar com a Ana Costa antes de
   assumir como definitiva.
   ─────────────────────────────────────────────────────────── */
export function gerarChecklist(imovel = {}, condicoes = {}) {
  const ano = Number(condicoes.anoConstrucao) || null;
  const itens = [];

  const add = (fase, id, nome, nota) => itens.push({ fase, id, nome, nota: nota || "", estado: "falta" });

  // ── CPCV ──
  add("cpcv", "caderneta", "Caderneta predial urbana", "Actualizada");
  add("cpcv", "certidao", "Certidão permanente do registo predial", "Válida à data");
  if (ano && ano < 1951) {
    add("cpcv", "isencao_licenca", "Certidão de isenção de licença de utilização", "Construção anterior a 1951");
  } else {
    add("cpcv", "licenca_util", "Licença de utilização", "Emitida pela câmara");
  }
  add("cpcv", "cert_energetico", "Certificado energético", "Obrigatório para promover e vender");
  if (ano && ano >= 2004) add("cpcv", "ficha_tecnica", "Ficha técnica da habitação", "Construção posterior a 2004");
  add("cpcv", "id_vendedor", "Identificação e NIF do vendedor");
  add("cpcv", "id_comprador", "Identificação e NIF do comprador");
  if (condicoes.heranca) add("cpcv", "habilitacao", "Habilitação de herdeiros", "Imóvel em herança");
  if (condicoes.arrendado) add("cpcv", "preferencia_inq", "Comunicação de direito de preferência ao inquilino", "Imóvel arrendado");

  // ── Escritura ──
  if (condicoes.hipoteca) add("escritura", "distrate", "Distrate de hipoteca ou declaração de dívida do banco");
  if (condicoes.condominio) add("escritura", "condominio", "Declaração de não dívida do condomínio");
  add("escritura", "imt", "Comprovativo de pagamento de IMT");
  add("escritura", "selo", "Comprovativo de Imposto do Selo");
  if (condicoes.arni) add("escritura", "preferencia_mun", "Direito de preferência do município", "Área de reabilitação urbana");
  if (condicoes.financiamento) add("escritura", "aprov_credito", "Aprovação de crédito do comprador");
  add("escritura", "agendamento", "Agendamento da escritura", "Notário ou Casa Pronta");

  return { itens, geradaEm: new Date().toISOString() };
}

const CONDICOES = [
  { id: "hipoteca",      nome: "Tem hipoteca" },
  { id: "condominio",    nome: "Tem condomínio" },
  { id: "arrendado",     nome: "Está arrendado" },
  { id: "heranca",       nome: "Imóvel em herança" },
  { id: "arni",          nome: "Área de reabilitação urbana" },
  { id: "financiamento", nome: "Comprador com crédito" },
];

/* ── Cruzamento automático ───────────────────────────────────
   Sugere clientes compatíveis com um imóvel.
   Margem de 10% acima do orçamento — quem tem 300 mil compra
   por 315 se gostar. Marcamos, não escondemos.
   ─────────────────────────────────────────────────────────── */
export function cruzar(imovel, clientes = []) {
  if (!imovel) return [];
  const valor = Number(imovel.valor) || 0;
  const arrendamento = (imovel.finalidade || "").toLowerCase().includes("arrend");
  const zonas = [imovel.freguesia, imovel.concelho, imovel.distrito, imovel.bairro, imovel.cidade]
    .filter(Boolean).map(z => z.toLowerCase());
  const tip = (imovel.tipologia || imovel.tipo || "").toLowerCase();

  return clientes.map(c => {
    const quer = (c.interesse || "").toLowerCase();
    const querArrendar = quer.includes("arrend");
    if (arrendamento !== querArrendar) return null;

    const orc = Number(c.orcamento) || 0;
    let acima = false;
    if (orc > 0 && valor > 0) {
      if (valor > orc * 1.1) return null;
      if (valor > orc) acima = true;
    }

    const bairros = (c.bairros || "").toLowerCase();
    const zonaBate = !bairros || zonas.some(z => bairros.includes(z) || z.includes(bairros.split(",")[0].trim()));

    const tipCli = Array.isArray(c.tipologia) ? c.tipologia.map(t => String(t).toLowerCase()) : [];
    const tipBate = !tipCli.length || !tip || tipCli.some(t => tip.includes(t) || t.includes(tip));

    let pontos = 0;
    if (zonaBate) pontos += 2;
    if (tipBate) pontos += 1;
    if (!acima) pontos += 1;
    if ((c.temperatura || "").toLowerCase() === "quente") pontos += 1;

    if (pontos < 2) return null;
    return { cliente: c, pontos, acima, zonaBate, tipBate };
  }).filter(Boolean).sort((a, b) => b.pontos - a.pontos);
}

/* ── Estilos ─────────────────────────────────────────────── */
const css = `
.it-box{background:${C.surface};border:1px solid ${C.line};border-radius:10px;padding:16px;margin-top:16px}
.it-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.it-tit{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:400;color:${C.text};flex:1}
.it-btn{background:none;border:1px solid ${C.goldDim};color:${C.gold};font-family:'DM Sans',sans-serif;
  font-size:11px;padding:7px 13px;border-radius:5px;cursor:pointer;white-space:nowrap}
.it-btn:hover{background:rgba(201,168,76,.1)}
.it-btn.cheio{background:${C.gold};color:#12100E;font-weight:500}

.it-row{display:flex;align-items:center;gap:11px;padding:11px 0;border-top:1px solid ${C.line};flex-wrap:wrap}
.it-row:first-of-type{border-top:none}
.it-nome{flex:1;min-width:130px;font-size:13.5px;color:${C.text}}
.it-nome small{display:block;font-size:11px;color:${C.dim};margin-top:2px}
.it-sel{background:#1E1E21;border:1px solid ${C.line};color:${C.text};font-family:'DM Sans',sans-serif;
  font-size:11.5px;padding:6px 9px;border-radius:5px;outline:none}
.it-sel:focus{border-color:${C.gold}}
.it-pt{font-size:9px;letter-spacing:.14em;text-transform:uppercase;padding:3px 8px;border-radius:10px;border:1px solid}
.it-x{background:none;border:none;color:${C.faint};font-size:16px;cursor:pointer;padding:0 4px}
.it-x:hover{color:${C.bad}}

.it-vazio{font-size:12.5px;color:${C.faint};line-height:1.7;padding:10px 0}
.it-nota{font-size:11px;color:${C.faint};line-height:1.6;margin-top:10px}

.it-sug{background:#1A1A1D;border:1px solid ${C.line};border-radius:8px;padding:12px;margin-bottom:12px}
.it-sug h4{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:${C.gold};margin-bottom:9px}
.it-sug .it-row{padding:9px 0}
.it-flag{font-size:9.5px;color:${C.warn}}

.it-chk{margin-top:12px}
.it-chk-fase{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:${C.gold};margin:14px 0 8px}
.it-chk-item{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-top:1px solid ${C.line}}
.it-chk-item:first-of-type{border-top:none}
.it-chk-box{width:17px;height:17px;border:1px solid ${C.line};border-radius:4px;cursor:pointer;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:11px;margin-top:1px}
.it-chk-box.ok{background:${C.ok};border-color:${C.ok};color:#fff}
.it-chk-box.na{background:${C.faint};border-color:${C.faint};color:#fff}
.it-chk-t{flex:1;font-size:13px;color:${C.text};line-height:1.5}
.it-chk-t.feito{color:${C.faint};text-decoration:line-through}
.it-chk-t small{display:block;font-size:11px;color:${C.dim};margin-top:2px;text-decoration:none}
.it-chk-na{background:none;border:none;color:${C.faint};font-size:10px;cursor:pointer;padding:2px 6px}
.it-chk-na:hover{color:${C.dim}}
.it-prog{height:2px;background:${C.line};border-radius:2px;overflow:hidden;margin:12px 0}
.it-prog i{display:block;height:100%;background:${C.gold}}

.it-cond{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.it-cond button{background:none;border:1px solid ${C.line};color:${C.dim};font-family:'DM Sans',sans-serif;
  font-size:10.5px;padding:5px 10px;border-radius:14px;cursor:pointer}
.it-cond button.on{border-color:${C.gold};color:${C.gold}}

.it-aviso{background:rgba(190,80,60,.09);border-left:2px solid ${C.bad};padding:10px 13px;
  border-radius:0 5px 5px 0;margin-bottom:12px}
.it-aviso p{font-size:11.5px;line-height:1.65;color:#E8C4B8;margin:0}
`;

/* ═══════════════════════════════════════════════════════════ */
export default function Interesses({ modo = "imovel", imovel, cliente, clientes = [], imoveis = [], user, mob = false }) {
  const [lista, setLista] = useState([]);
  const [carregar, setCarregar] = useState(true);
  const [mostrarSug, setMostrarSug] = useState(false);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(null);
  const [condicoes, setCondicoes] = useState({});

  const idAlvo = modo === "imovel" ? imovel?.id : cliente?.id;

  const carregarLista = async () => {
    if (!idAlvo) { setCarregar(false); return; }
    try {
      const r = modo === "imovel"
        ? await dbInteresses.porImovel(idAlvo)
        : await dbInteresses.porCliente(idAlvo);
      setLista(r);
    } catch (e) { setErro("Não foi possível carregar: " + String(e?.message || e)); }
    setCarregar(false);
  };

  useEffect(() => { setCarregar(true); carregarLista(); }, [idAlvo, modo]);

  const jaLigados = useMemo(() => new Set(lista.map(i => modo === "imovel" ? i.clienteId : i.imovelId)), [lista, modo]);

  const sugestoes = useMemo(() => {
    if (modo !== "imovel") return [];
    return cruzar(imovel, clientes).filter(s => !jaLigados.has(s.cliente.id));
  }, [imovel, clientes, jaLigados, modo]);

  const criar = async (outroId) => {
    setErro("");
    try {
      const payload = modo === "imovel"
        ? { clienteId: outroId, imovelId: imovel.id }
        : { clienteId: cliente.id, imovelId: outroId };
      await dbInteresses.insert({ ...payload, estado: "sugerido", agente: user?.nome || user?.email || "" });
      await carregarLista();
    } catch (e) {
      const m = String(e?.message || e);
      if (m.includes("interesses_par_unico") || m.includes("duplicate")) setErro("Este cliente já está associado a este imóvel.");
      else setErro("Não foi possível associar: " + m);
    }
  };

  const mudar = async (it, estado) => {
    try {
      const extra = {};
      if (estado === "reservado" && (!it.checklist || !it.checklist.itens)) {
        extra.checklist = gerarChecklist(modo === "imovel" ? imovel : it.imovel, condicoes);
      }
      await dbInteresses.mudarEstado(it.id, estado, extra);
      await carregarLista();
      if (estado === "reservado") setAberto(it.id);
    } catch (e) { setErro("Não foi possível actualizar: " + String(e?.message || e)); }
  };

  const guardarMotivo = async (it, motivo) => {
    try { await dbInteresses.mudarEstado(it.id, "recusado", { motivo }); await carregarLista(); }
    catch (e) { setErro("Não foi possível guardar: " + String(e?.message || e)); }
  };

  const apagar = async (it) => {
    if (!window.confirm("Remover esta associação?")) return;
    try { await dbInteresses.remove(it.id); await carregarLista(); }
    catch (e) { setErro("Não foi possível remover: " + String(e?.message || e)); }
  };

  const alternaItem = async (it, itemId, novoEstado) => {
    const ck = it.checklist || {};
    const itens = (ck.itens || []).map(i => i.id === itemId ? { ...i, estado: novoEstado } : i);
    const nova = { ...ck, itens };
    setLista(l => l.map(x => x.id === it.id ? { ...x, checklist: nova } : x));
    try { await dbInteresses.guardarChecklist(it.id, nova); } catch (e) { setErro("Não foi possível guardar: " + String(e?.message || e)); }
  };

  const regerar = async (it) => {
    const nova = gerarChecklist(modo === "imovel" ? imovel : it.imovel, condicoes);
    const antigos = {};
    (it.checklist?.itens || []).forEach(i => { antigos[i.id] = i.estado; });
    nova.itens = nova.itens.map(i => antigos[i.id] ? { ...i, estado: antigos[i.id] } : i);
    setLista(l => l.map(x => x.id === it.id ? { ...x, checklist: nova } : x));
    try { await dbInteresses.guardarChecklist(it.id, nova); } catch (e) { setErro("Não foi possível guardar: " + String(e?.message || e)); }
  };

  const Pastilha = ({ estado }) => {
    const e = ESTADOS.find(x => x.id === estado) || ESTADOS[0];
    return <span className="it-pt" style={{ color: e.cor, borderColor: e.cor }}>{e.nome}</span>;
  };

  const Checklist = ({ it }) => {
    const itens = it.checklist?.itens || [];
    if (!itens.length) return null;
    const feitos = itens.filter(i => i.estado === "ok" || i.estado === "na").length;
    const pct = Math.round((feitos / itens.length) * 100);
    const fases = [["cpcv", "Para o CPCV"], ["escritura", "Para a escritura"]];

    return (
      <div className="it-chk">
        <div className="it-aviso">
          <p>Lista de apoio operacional. <b>Não substitui a validação jurídica de cada processo</b> — confirmar sempre com a Ana Costa.</p>
        </div>

        <div className="it-cond">
          {CONDICOES.map(c => (
            <button key={c.id}
              className={condicoes[c.id] ? "on" : ""}
              onClick={() => setCondicoes(p => ({ ...p, [c.id]: !p[c.id] }))}
            >{c.nome}</button>
          ))}
          <button onClick={() => regerar(it)} style={{ borderColor: C.goldDim, color: C.gold }}>Actualizar lista</button>
        </div>

        <div className="it-prog"><i style={{ width: pct + "%" }} /></div>
        <p style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>{feitos} de {itens.length} — {pct}%</p>

        {fases.map(([fase, titulo]) => {
          const desta = itens.filter(i => i.fase === fase);
          if (!desta.length) return null;
          return (
            <div key={fase}>
              <div className="it-chk-fase">{titulo}</div>
              {desta.map(i => (
                <div className="it-chk-item" key={i.id}>
                  <div
                    className={"it-chk-box" + (i.estado === "ok" ? " ok" : i.estado === "na" ? " na" : "")}
                    onClick={() => alternaItem(it, i.id, i.estado === "ok" ? "falta" : "ok")}
                  >{i.estado === "ok" ? "✓" : i.estado === "na" ? "—" : ""}</div>
                  <div className={"it-chk-t" + (i.estado !== "falta" ? " feito" : "")}>
                    {i.nome}
                    {i.nota && <small>{i.nota}</small>}
                  </div>
                  <button className="it-chk-na" onClick={() => alternaItem(it, i.id, i.estado === "na" ? "falta" : "na")}>
                    {i.estado === "na" ? "repor" : "n/a"}
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  if (!idAlvo) return null;

  return (
    <>
      <style>{css}</style>
      <div className="it-box">
        <div className="it-top">
          <span className="it-tit">{modo === "imovel" ? "Clientes interessados" : "Imóveis apresentados"}</span>
          {modo === "imovel" && (
            <button className={"it-btn" + (mostrarSug ? " cheio" : "")} onClick={() => setMostrarSug(v => !v)}>
              {mostrarSug ? "Fechar sugestões" : `Sugerir da carteira${sugestoes.length ? " (" + sugestoes.length + ")" : ""}`}
            </button>
          )}
        </div>

        {erro && <p style={{ fontSize: 12, color: C.bad, marginBottom: 10 }}>{erro}</p>}

        {mostrarSug && modo === "imovel" && (
          <div className="it-sug">
            <h4>Compatíveis na carteira</h4>
            {sugestoes.length ? sugestoes.map(s => (
              <div className="it-row" key={s.cliente.id}>
                <span className="it-nome">
                  {s.cliente.nome}
                  <small>
                    {s.cliente.interesse} · {s.cliente.orcamento ? Number(s.cliente.orcamento).toLocaleString("pt-PT") + " €" : "sem orçamento"}
                    {s.cliente.bairros ? " · " + s.cliente.bairros : ""}
                    {s.acima && <span className="it-flag"> · acima do orçamento</span>}
                  </small>
                </span>
                <button className="it-btn" onClick={() => criar(s.cliente.id)}>Associar</button>
              </div>
            )) : <p className="it-vazio">Nenhum cliente da carteira encaixa nos critérios deste imóvel.</p>}
          </div>
        )}

        {carregar ? (
          <p className="it-vazio">A carregar…</p>
        ) : lista.length ? lista.map(it => {
          const outro = modo === "imovel" ? it.cliente : it.imovel;
          const nome = modo === "imovel" ? outro?.nome : outro?.titulo;
          return (
            <div key={it.id}>
              <div className="it-row">
                <span className="it-nome">
                  {nome || "—"}
                  <small>
                    {modo === "imovel"
                      ? `${outro?.interesse || ""}${outro?.orcamento ? " · " + Number(outro.orcamento).toLocaleString("pt-PT") + " €" : ""}`
                      : `${outro?.valor ? Number(outro.valor).toLocaleString("pt-PT") + " €" : ""}${outro?.bairro ? " · " + outro.bairro : ""}`}
                    {it.agente ? " · " + it.agente : ""}
                    {it.motivo ? " · recusou: " + it.motivo : ""}
                  </small>
                </span>
                <Pastilha estado={it.estado} />
                <select className="it-sel" value={it.estado} onChange={e => mudar(it, e.target.value)}>
                  {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
                {it.estado === "recusado" && (
                  <select className="it-sel" value={it.motivo || ""} onChange={e => guardarMotivo(it, e.target.value)}>
                    <option value="">Motivo…</option>
                    {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
                {(it.estado === "reservado" || it.estado === "fechado") && (
                  <button className="it-btn" onClick={() => setAberto(a => a === it.id ? null : it.id)}>
                    {aberto === it.id ? "Fechar" : "Documentos"}
                  </button>
                )}
                <button className="it-x" onClick={() => apagar(it)} title="Remover">×</button>
              </div>
              {aberto === it.id && <Checklist it={it} />}
            </div>
          );
        }) : (
          <p className="it-vazio">
            {modo === "imovel"
              ? "Ainda não há clientes associados a este imóvel."
              : "Ainda não foi apresentado nenhum imóvel a este cliente."}
          </p>
        )}

        <p className="it-nota">
          O motivo da recusa é a informação mais útil que temos — é o que prepara a conversa com o proprietário sobre o preço.
        </p>
      </div>
    </>
  );
}
