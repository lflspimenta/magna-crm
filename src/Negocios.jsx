import React, { useState, useEffect, useMemo } from "react";
import { dbInteresses, uploadDocumento } from "./db.js";
import { ESTADOS, gerarChecklist, lerDocumentos } from "./Interesses.jsx";
import Comentarios from "./Comentarios";

/* ═══════════════════════════════════════════════════════════
   NEGÓCIOS — processos em proposta, reservado ou fechado
   Um sítio único para acompanhar cada venda em curso.
   ═══════════════════════════════════════════════════════════ */

const C = {
  gold: "#C9A84C", goldDim: "rgba(201,168,76,.4)",
  bg: "#0E0E10", surface: "#161618", surface2: "#1B1B1E", line: "#2E2E33",
  text: "#F0EDE6", dim: "#8A8880", faint: "#5A5855",
  ok: "#5B9E6E", warn: "#D98A6A", bad: "#B4553C", azul: "#7A9BC4",
};

const FASES = [
  { id: "proposta",  nome: "Em proposta", cor: C.gold },
  { id: "reservado", nome: "Reservado",   cor: "#C48A4C" },
  { id: "fechado",   nome: "Fechado",     cor: C.ok },
];

const eur = (v) => v ? Number(v).toLocaleString("pt-PT") + " €" : "—";
const dt = (d) => d ? String(d).split("-").reverse().join("/") : null;
const dias = (d) => d ? Math.floor((new Date(d) - new Date()) / 86400000) : null;

const css = `
.ng-wrap{padding:26px 20px 70px;max-width:1100px;margin:0 auto}
.ng-h1{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:400;color:${C.text}}
.ng-sub{font-size:13px;color:${C.dim};margin-top:3px}
.ng-rule{width:40px;height:1px;background:${C.gold};margin:13px 0 22px}

.ng-filtros{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:20px}
.ng-f{background:none;border:1px solid ${C.line};color:${C.dim};font-family:'DM Sans',sans-serif;
  font-size:11.5px;padding:8px 14px;border-radius:18px;cursor:pointer}
.ng-f.on{background:${C.gold};border-color:${C.gold};color:#12100E;font-weight:500}

.ng-card{background:${C.surface};border:1px solid ${C.line};border-radius:10px;padding:16px;margin-bottom:10px;cursor:pointer}
.ng-card:hover{border-color:${C.goldDim}}
.ng-card.on{border-color:${C.gold};cursor:default}
.ng-top{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
.ng-tit{flex:1;min-width:180px}
.ng-tit h3{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:400;color:${C.text};line-height:1.25}
.ng-tit p{font-size:12px;color:${C.dim};margin-top:3px}
.ng-pt{font-size:9px;letter-spacing:.14em;text-transform:uppercase;padding:4px 9px;border-radius:11px;border:1px solid;white-space:nowrap}
.ng-val{font-family:'Cormorant Garamond',serif;font-size:21px;color:${C.gold};white-space:nowrap}

.ng-meta{display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid ${C.line}}
.ng-meta div{font-size:11.5px;color:${C.dim}}
.ng-meta b{display:block;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:${C.faint};margin-bottom:3px;font-weight:400}
.ng-atraso{color:${C.bad}!important}
.ng-perto{color:${C.warn}!important}

.ng-body{margin-top:16px;padding-top:16px;border-top:1px solid ${C.line}}
.ng-sec{margin-bottom:20px}
.ng-sec h4{font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:${C.gold};margin-bottom:10px}

.ng-datas{display:flex;gap:14px;flex-wrap:wrap}
.ng-datas div{flex:1;min-width:140px}
.ng-datas label{display:block;font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:${C.faint};margin-bottom:5px}
.ng-datas input,.ng-inp{width:100%;background:${C.surface2};border:1px solid ${C.line};color:${C.text};
  font-family:'DM Sans',sans-serif;font-size:12.5px;padding:9px 11px;border-radius:6px;outline:none}
.ng-datas input:focus,.ng-inp:focus{border-color:${C.gold}}

.ng-prop{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-top:1px solid ${C.line}}
.ng-prop:first-of-type{border-top:none}
.ng-prop-v{font-family:'Cormorant Garamond',serif;font-size:18px;color:${C.text};min-width:96px}
.ng-prop-d{flex:1;font-size:11.5px;color:${C.dim};line-height:1.6}
.ng-prop-d a{color:${C.gold};text-decoration:none}
.ng-de{font-size:9px;letter-spacing:.14em;text-transform:uppercase;padding:2px 7px;border-radius:9px;border:1px solid ${C.line};color:${C.faint}}

.ng-form{background:${C.surface2};border:1px solid ${C.line};border-radius:8px;padding:13px;margin-top:12px}
.ng-form-r{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.ng-form-r > div{flex:1;min-width:120px}
.ng-btn{background:none;border:1px solid ${C.goldDim};color:${C.gold};font-family:'DM Sans',sans-serif;
  font-size:11px;padding:8px 14px;border-radius:5px;cursor:pointer;white-space:nowrap}
.ng-btn:hover{background:rgba(201,168,76,.1)}
.ng-btn.cheio{background:${C.gold};color:#12100E;font-weight:500}
.ng-btn:disabled{opacity:.4;cursor:default}

.ng-chk-fase{display:flex;align-items:baseline;gap:9px;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${C.gold};margin:14px 0 7px}
.ng-chk-n{font-size:9.5px;letter-spacing:.08em;color:${C.dim};text-transform:none}
.ng-prog{height:2px;background:${C.line};border-radius:2px;overflow:hidden;margin-bottom:9px}
.ng-prog i{display:block;height:100%;background:${C.gold}}
.ng-item{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid rgba(46,46,51,.6)}
.ng-item:first-of-type{border-top:none}
.ng-box{width:16px;height:16px;border:1px solid ${C.line};border-radius:4px;cursor:pointer;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:10px;margin-top:2px}
.ng-box.ok{background:${C.ok};border-color:${C.ok};color:#fff}
.ng-box.na{background:${C.faint};border-color:${C.faint};color:#fff}
.ng-item-t{flex:1;font-size:12.5px;color:${C.text};line-height:1.5}
.ng-item-t.feito{color:${C.faint};text-decoration:line-through}
.ng-item-t small{display:block;font-size:10.5px;color:${C.dim};margin-top:2px;text-decoration:none}
.ng-doc-ok{color:${C.ok}!important}
.ng-doc-mau{color:${C.warn}!important}
.ng-item-t a{color:${C.gold};text-decoration:none}
.ng-na{background:none;border:1px solid transparent;color:${C.faint};font-size:9.5px;cursor:pointer;
  padding:3px 8px;border-radius:10px;white-space:nowrap;opacity:.55}
.ng-na:hover{opacity:1;border-color:${C.line}}
.ng-espera{opacity:.55}
.ng-espera:hover{opacity:1}

.ng-vazio{border:1px dashed ${C.line};border-radius:10px;padding:34px 20px;text-align:center}
.ng-vazio p{font-size:13px;color:${C.faint};line-height:1.7}
.ng-erro{font-size:12px;color:${C.bad};margin-bottom:12px}
.ng-nota{font-size:11px;color:${C.faint};line-height:1.6;margin-top:10px}
.ng-aviso{background:rgba(190,80,60,.09);border-left:2px solid ${C.bad};padding:10px 13px;border-radius:0 5px 5px 0;margin-bottom:12px}
.ng-aviso p{font-size:11.5px;line-height:1.65;color:#E8C4B8;margin:0}

@media(max-width:640px){
  .ng-wrap{padding:18px 12px 60px}
  .ng-h1{font-size:25px}
  .ng-val{font-size:18px}
}
`;

const CONDICOES = [
  { id: "hipoteca", nome: "Tem hipoteca" },
  { id: "condominio", nome: "Tem condomínio" },
  { id: "arrendado", nome: "Está arrendado" },
  { id: "heranca", nome: "Imóvel em herança" },
  { id: "arni", nome: "Área de reabilitação urbana" },
  { id: "financiamento", nome: "Comprador com crédito" },
];

export default function Negocios({ mob = false, user }) {
  const [lista, setLista] = useState([]);
  const [carregar, setCarregar] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [aberto, setAberto] = useState(null);
  const [erro, setErro] = useState("");
  const [novaProp, setNovaProp] = useState({ valor: "", de: "comprador", notas: "", file: null });
  const [aGuardar, setAGuardar] = useState(false);
  const [condicoes, setCondicoes] = useState({});
  const [arquivos, setArquivos] = useState({});

  const carregarLista = async () => {
    try { setLista(await dbInteresses.negocios()); }
    catch (e) { setErro("Não foi possível carregar: " + String(e?.message || e)); }
    setCarregar(false);
  };
  useEffect(() => { carregarLista(); }, []);

  const visiveis = useMemo(
    () => filtro === "todos" ? lista : lista.filter(n => n.estado === filtro),
    [lista, filtro]
  );

  const ultimaProposta = (n) => {
    const ps = n.propostas || [];
    return ps.length ? ps[ps.length - 1] : null;
  };

  const emFalta = (n) => {
    const itens = n.checklist?.itens || [];
    return itens.filter(i => i.estado === "falta").length;
  };

  const abrir = async (n) => {
    if (aberto === n.id) { setAberto(null); return; }
    setAberto(n.id);
    setNovaProp({ valor: "", de: "comprador", notas: "", file: null });
    if (n.imovel && !arquivos[n.id]) {
      const r = await lerDocumentos(n.imovel);
      setArquivos(a => ({ ...a, [n.id]: r }));
      setCondicoes(c => ({ ...c, ...r.condicoes }));
    }
  };

  const guardarCampo = async (n, campo, valor) => {
    setLista(l => l.map(x => x.id === n.id ? { ...x, [campo]: valor } : x));
    try { await dbInteresses.update(n.id, { [campo]: valor || null }); }
    catch (e) { setErro("Não foi possível guardar: " + String(e?.message || e)); }
  };

  const mudarEstado = async (n, estado) => {
    try {
      const extra = {};
      if (estado === "reservado" && (!n.checklist || !n.checklist.itens)) {
        const arq = arquivos[n.id] || await lerDocumentos(n.imovel);
        extra.checklist = gerarChecklist(n.imovel, { ...arq.condicoes, ...condicoes }, arq.porItem);
      }
      await dbInteresses.mudarEstado(n.id, estado, extra);
      await carregarLista();
    } catch (e) { setErro("Não foi possível actualizar: " + String(e?.message || e)); }
  };

  const guardarProposta = async (n) => {
    const valor = Number(String(novaProp.valor).replace(/[^\d]/g, ""));
    if (!valor) { setErro("Indique o valor da proposta."); return; }
    setAGuardar(true); setErro("");
    try {
      let url = null, ficheiro = null;
      if (novaProp.file) {
        url = await uploadDocumento(novaProp.file, "negocios/" + n.id);
        ficheiro = novaProp.file.name;
      }
      const entrada = {
        id: String(Date.now()),
        valor,
        data: new Date().toISOString().slice(0, 10),
        de: novaProp.de,
        notas: novaProp.notas || "",
        ficheiro, url,
        agente: user?.nome || user?.email || "",
      };
      const propostas = [...(n.propostas || []), entrada];
      await dbInteresses.update(n.id, { propostas });
      setLista(l => l.map(x => x.id === n.id ? { ...x, propostas } : x));
      setNovaProp({ valor: "", de: "comprador", notas: "", file: null });
    } catch (e) { setErro("Não foi possível guardar a proposta: " + String(e?.message || e)); }
    setAGuardar(false);
  };

  const apagarProposta = async (n, pid) => {
    if (!window.confirm("Remover esta proposta do histórico?")) return;
    const propostas = (n.propostas || []).filter(p => p.id !== pid);
    setLista(l => l.map(x => x.id === n.id ? { ...x, propostas } : x));
    try { await dbInteresses.update(n.id, { propostas }); } catch (e) {}
  };

  const alternaItem = async (n, itemId, novoEstado) => {
    const ck = n.checklist || {};
    const itens = (ck.itens || []).map(i => i.id === itemId ? { ...i, estado: novoEstado } : i);
    const nova = { ...ck, itens };
    setLista(l => l.map(x => x.id === n.id ? { ...x, checklist: nova } : x));
    try { await dbInteresses.guardarChecklist(n.id, nova); }
    catch (e) { setErro("Não foi possível guardar: " + String(e?.message || e)); }
  };

  const regerar = async (n) => {
    const arq = arquivos[n.id] || await lerDocumentos(n.imovel);
    const nova = gerarChecklist(n.imovel, { ...arq.condicoes, ...condicoes }, arq.porItem);
    const antigos = {};
    (n.checklist?.itens || []).forEach(i => { antigos[i.id] = i.estado; });
    nova.itens = nova.itens.map(i => antigos[i.id] && antigos[i.id] !== "falta" ? { ...i, estado: antigos[i.id] } : i);
    setLista(l => l.map(x => x.id === n.id ? { ...x, checklist: nova } : x));
    try { await dbInteresses.guardarChecklist(n.id, nova); } catch (e) {}
  };

  const Pastilha = ({ estado }) => {
    const e = FASES.find(x => x.id === estado) || ESTADOS.find(x => x.id === estado) || { nome: estado, cor: C.dim };
    return <span className="ng-pt" style={{ color: e.cor, borderColor: e.cor }}>{e.nome}</span>;
  };

  const Checklist = ({ n }) => {
    const itens = n.checklist?.itens || [];
    if (!itens.length) {
      return <p className="ng-nota">A checklist é criada quando o negócio passa a Reservado.</p>;
    }
    const conta = (f) => {
      const d = itens.filter(i => i.fase === f);
      const feitos = d.filter(i => i.estado === "ok" || i.estado === "na").length;
      return { total: d.length, feitos, pct: d.length ? Math.round(feitos / d.length * 100) : 0 };
    };
    const cpcv = conta("cpcv"), esc = conta("escritura");
    const cpcvFechado = cpcv.total > 0 && cpcv.feitos === cpcv.total;

    return (
      <>
        <div className="ng-aviso">
          <p>Lista de apoio operacional. <b>Não substitui a validação jurídica</b> — confirmar com a Ana Costa.</p>
        </div>

        <div className="ng-form-r" style={{ marginBottom: 6 }}>
          {CONDICOES.map(c => (
            <button key={c.id} className={"ng-btn" + (condicoes[c.id] ? " cheio" : "")}
              style={{ flex: "none", fontSize: 10.5, padding: "6px 11px" }}
              onClick={() => setCondicoes(p => ({ ...p, [c.id]: !p[c.id] }))}>{c.nome}</button>
          ))}
          <button className="ng-btn" style={{ flex: "none", fontSize: 10.5, padding: "6px 11px" }} onClick={() => regerar(n)}>Actualizar lista</button>
        </div>

        {[["cpcv", "Para o CPCV", cpcv], ["escritura", "Para a escritura", esc]].map(([f, titulo, c]) => {
          const desta = itens.filter(i => i.fase === f);
          if (!desta.length) return null;
          const espera = f === "escritura" && !cpcvFechado;
          return (
            <div key={f} className={espera ? "ng-espera" : ""}>
              <div className="ng-chk-fase">{titulo}<span className="ng-chk-n">{c.feitos} de {c.total}</span></div>
              <div className="ng-prog"><i style={{ width: c.pct + "%", background: c.pct === 100 ? C.ok : C.gold }} /></div>
              {espera && <p className="ng-nota" style={{ marginTop: -2, marginBottom: 8 }}>Só depois do CPCV reunido.</p>}
              {desta.map(i => (
                <div className="ng-item" key={i.id}>
                  <div className={"ng-box" + (i.estado === "ok" ? " ok" : i.estado === "na" ? " na" : "")}
                    onClick={() => alternaItem(n, i.id, i.estado === "ok" ? "falta" : "ok")}>
                    {i.estado === "ok" ? "✓" : i.estado === "na" ? "—" : ""}
                  </div>
                  <div className={"ng-item-t" + (i.estado !== "falta" ? " feito" : "")}>
                    {i.nome}
                    {i.nota && <small>{i.nota}</small>}
                    {i.arquivo && (
                      <small className={i.arquivo.caducado ? "ng-doc-mau" : "ng-doc-ok"}>
                        {i.arquivo.caducado ? "⚠ em arquivo mas caducado" : "✓ já no arquivo"}
                        {i.arquivo.validade ? " · validade " + dt(i.arquivo.validade) : ""}
                        {i.arquivo.url && <> · <a href={i.arquivo.url} target="_blank" rel="noreferrer">abrir</a></>}
                      </small>
                    )}
                  </div>
                  <button className="ng-na" onClick={() => alternaItem(n, i.id, i.estado === "na" ? "falta" : "na")}>
                    {i.estado === "na" ? "não se aplica ↺" : "não se aplica"}
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <>
      <style>{css}</style>
      <div className="ng-wrap">
        <h1 className="ng-h1">Negócios</h1>
        <p className="ng-sub">Processos em curso — da proposta à escritura</p>
        <div className="ng-rule" />

        {erro && <p className="ng-erro">{erro}</p>}

        <div className="ng-filtros">
          <button className={"ng-f" + (filtro === "todos" ? " on" : "")} onClick={() => setFiltro("todos")}>
            Todos ({lista.length})
          </button>
          {FASES.map(f => {
            const n = lista.filter(x => x.estado === f.id).length;
            return (
              <button key={f.id} className={"ng-f" + (filtro === f.id ? " on" : "")} onClick={() => setFiltro(f.id)}>
                {f.nome} ({n})
              </button>
            );
          })}
        </div>

        {carregar ? (
          <p className="ng-nota">A carregar…</p>
        ) : visiveis.length ? visiveis.map(n => {
          const p = ultimaProposta(n);
          const falta = emFalta(n);
          const dEsc = dias(n.dataEscritura);
          const dCpcv = dias(n.dataCpcv);
          const on = aberto === n.id;
          return (
            <div className={"ng-card" + (on ? " on" : "")} key={n.id} onClick={() => !on && abrir(n)}>
              <div className="ng-top">
                <div className="ng-tit">
                  <h3>{n.imovel?.titulo || "Imóvel removido"}</h3>
                  <p>{n.cliente?.nome || "Cliente removido"}{n.agente ? " · " + n.agente : ""}</p>
                </div>
                <Pastilha estado={n.estado} />
                <span className="ng-val">{p ? eur(p.valor) : eur(n.imovel?.valor)}</span>
              </div>

              <div className="ng-meta">
                <div>
                  <b>Proposta</b>
                  {p ? `${eur(p.valor)} · ${dt(p.data)}` : "sem proposta registada"}
                </div>
                <div>
                  <b>CPCV</b>
                  <span className={dCpcv !== null && dCpcv < 0 ? "ng-atraso" : dCpcv !== null && dCpcv < 7 ? "ng-perto" : ""}>
                    {n.dataCpcv ? dt(n.dataCpcv) : "por marcar"}
                  </span>
                </div>
                <div>
                  <b>Escritura</b>
                  <span className={dEsc !== null && dEsc < 0 ? "ng-atraso" : dEsc !== null && dEsc < 7 ? "ng-perto" : ""}>
                    {n.dataEscritura ? dt(n.dataEscritura) : "por marcar"}
                  </span>
                </div>
                <div>
                  <b>Documentos</b>
                  <span className={falta > 4 ? "ng-atraso" : falta ? "ng-perto" : "ng-doc-ok"}>
                    {n.checklist?.itens?.length ? (falta ? falta + " em falta" : "tudo reunido") : "por gerar"}
                  </span>
                </div>
              </div>

              {on && (
                <div className="ng-body" onClick={e => e.stopPropagation()}>
                  <div className="ng-sec">
                    <h4>Fase</h4>
                    <div className="ng-form-r">
                      {FASES.map(f => (
                        <button key={f.id} className={"ng-btn" + (n.estado === f.id ? " cheio" : "")}
                          style={{ flex: "none" }} onClick={() => mudarEstado(n, f.id)}>{f.nome}</button>
                      ))}
                      <button className="ng-btn" style={{ flex: "none", borderColor: "rgba(180,85,60,.4)", color: C.bad }}
                        onClick={() => mudarEstado(n, "recusado")}>Caiu</button>
                    </div>
                  </div>

                  <div className="ng-sec">
                    <h4>Datas</h4>
                    <div className="ng-datas">
                      <div>
                        <label>Prevista CPCV</label>
                        <input type="date" value={n.dataCpcv || ""} onChange={e => guardarCampo(n, "dataCpcv", e.target.value)} />
                      </div>
                      <div>
                        <label>Prevista escritura</label>
                        <input type="date" value={n.dataEscritura || ""} onChange={e => guardarCampo(n, "dataEscritura", e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="ng-sec">
                    <h4>Propostas</h4>
                    {(n.propostas || []).length ? [...n.propostas].reverse().map(pr => (
                      <div className="ng-prop" key={pr.id}>
                        <span className="ng-prop-v">{eur(pr.valor)}</span>
                        <span className="ng-prop-d">
                          <span className="ng-de">{pr.de === "vendedor" ? "contraproposta" : "comprador"}</span>
                          {" "}{dt(pr.data)}{pr.agente ? " · " + pr.agente : ""}
                          {pr.notas ? <><br />{pr.notas}</> : null}
                          {pr.url && <><br /><a href={pr.url} target="_blank" rel="noreferrer">{pr.ficheiro || "abrir ficheiro"}</a></>}
                        </span>
                        <button className="ng-na" onClick={() => apagarProposta(n, pr.id)}>remover</button>
                      </div>
                    )) : <p className="ng-nota">Nenhuma proposta registada.</p>}

                    <div className="ng-form">
                      <div className="ng-form-r">
                        <div>
                          <input className="ng-inp" placeholder="Valor (€)" inputMode="numeric"
                            value={novaProp.valor} onChange={e => setNovaProp(p => ({ ...p, valor: e.target.value }))} />
                        </div>
                        <div>
                          <select className="ng-inp" value={novaProp.de} onChange={e => setNovaProp(p => ({ ...p, de: e.target.value }))}>
                            <option value="comprador">Do comprador</option>
                            <option value="vendedor">Contraproposta do vendedor</option>
                          </select>
                        </div>
                      </div>
                      <div className="ng-form-r">
                        <div>
                          <input className="ng-inp" placeholder="Notas (opcional)"
                            value={novaProp.notas} onChange={e => setNovaProp(p => ({ ...p, notas: e.target.value }))} />
                        </div>
                        <div>
                          <input className="ng-inp" type="file" accept=".pdf,.jpg,.jpeg,.png"
                            onChange={e => setNovaProp(p => ({ ...p, file: e.target.files[0] || null }))} />
                        </div>
                      </div>
                      <button className="ng-btn cheio" disabled={aGuardar} onClick={() => guardarProposta(n)}>
                        {aGuardar ? "A guardar…" : "Registar proposta"}
                      </button>
                    </div>
                  </div>

                  <div className="ng-sec">
                    <h4>Documentação</h4>
                    <Checklist n={n} />
                  </div>

                  <div className="ng-sec">
                    <h4>Notas do processo</h4>
                    <textarea className="ng-inp" rows={3} placeholder="O que ficou combinado, o que está pendente…"
                      value={n.notas || ""} onChange={e => setLista(l => l.map(x => x.id === n.id ? { ...x, notas: e.target.value } : x))}
                      onBlur={e => guardarCampo(n, "notas", e.target.value)} />
                  </div>

                  <Comentarios tipo="negocio" registoId={n.id} user={user} mob={mob}/>

                  <button className="ng-btn" onClick={() => setAberto(null)}>Fechar</button>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="ng-vazio">
            <p>
              Nenhum negócio {filtro !== "todos" ? "nesta fase" : "em curso"}.<br />
              Os negócios aparecem aqui quando um interesse passa a Proposta, na ficha do imóvel ou do cliente.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
