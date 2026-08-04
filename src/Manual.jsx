import React, { useState, useMemo } from "react";
import { SEPARADORES, ACESSOS, FICHA_CLIENTE } from "./manualConteudo";

/* ═══════════════════════════════════════════════════════════
   MANUAL DO CONSULTOR — interface
   O conteúdo está em manualConteudo.js. Este ficheiro só
   trata da apresentação, pesquisa e impressão.
   ═══════════════════════════════════════════════════════════ */

const M = {
  bg: "#0E0E10", surface: "#161618", line: "#2E2E33",
  text: "#F0EDE6", dim: "#8A8880", faint: "#5A5855",
  gold: "#C9A84C", cream: "#F3EDE4", ink: "#12100E",
};

const manualCSS = `
.mn-wrap{padding:22px 16px 70px;max-width:900px;margin:0 auto}
.mn-head{margin-bottom:16px}
.mn-mark{font-family:'Cormorant Garamond',serif;font-size:20px;letter-spacing:.3em;color:${M.gold}}
.mn-mark small{display:block;font-family:'DM Sans',sans-serif;font-size:7px;letter-spacing:.3em;color:${M.faint};margin-top:6px}
.mn-h1{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:400;color:${M.text};margin-top:16px;line-height:1.15}
.mn-rule{width:40px;height:1px;background:${M.gold};margin-top:12px}

.mn-search{position:sticky;top:0;z-index:20;background:${M.bg};padding:14px 0 10px;margin-bottom:2px}
.mn-search input{width:100%;background:${M.surface};border:1px solid ${M.line};color:${M.text};
  font-family:'DM Sans',sans-serif;font-size:14px;padding:13px 16px;border-radius:8px;outline:none}
.mn-search input:focus{border-color:${M.gold}}
.mn-search input::placeholder{color:${M.faint}}
.mn-hits{font-size:11px;color:${M.dim};margin-top:7px;min-height:14px}

.mn-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:10px;margin-bottom:16px;scrollbar-width:none}
.mn-tabs::-webkit-scrollbar{display:none}
.mn-tab{background:none;border:1px solid ${M.line};color:${M.dim};font-family:'DM Sans',sans-serif;
  font-size:11.5px;padding:9px 15px;border-radius:20px;cursor:pointer;white-space:nowrap;transition:.15s}
.mn-tab:hover{border-color:${M.faint};color:${M.text}}
.mn-tab.on{background:${M.gold};border-color:${M.gold};color:${M.ink};font-weight:500}

.mn-acts{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.mn-act{background:none;border:1px solid rgba(201,168,76,.4);color:${M.gold};font-family:'DM Sans',sans-serif;
  font-size:11px;padding:8px 14px;border-radius:5px;cursor:pointer}
.mn-act:hover{background:rgba(201,168,76,.1)}

.mn-sec{margin-bottom:28px}
.mn-lbl{font-size:8.5px;letter-spacing:.3em;text-transform:uppercase;color:${M.gold};margin-bottom:8px}
.mn-sec h2{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:400;color:${M.text};margin-bottom:7px}
.mn-intro{font-size:13px;line-height:1.75;color:${M.dim};margin-bottom:16px;max-width:64ch}

.mn-blk{border:1px solid ${M.line};border-radius:8px;margin-bottom:8px;background:${M.surface};overflow:hidden}
.mn-blk.on{border-color:rgba(201,168,76,.4)}
.mn-bh{display:flex;align-items:center;gap:11px;padding:14px 16px;cursor:pointer;user-select:none}
.mn-bh:hover{background:rgba(255,255,255,.02)}
.mn-bt{flex:1;font-size:14px;line-height:1.4;color:${M.text}}
.mn-blk.on .mn-bt{color:${M.gold}}
.mn-chev{color:${M.faint};font-size:10px;transition:transform .2s;flex-shrink:0}
.mn-blk.on .mn-chev{transform:rotate(90deg);color:${M.gold}}
.mn-tag{font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:${M.faint};
  border:1px solid ${M.line};padding:3px 8px;border-radius:10px;flex-shrink:0}
.mn-bc{display:none;padding:0 16px 18px}
.mn-blk.on .mn-bc{display:block;padding-top:4px;border-top:1px solid ${M.line};margin-top:0;padding-top:15px}
.mn-bc p{font-size:13.5px;line-height:1.8;color:#CFC8BE;margin-bottom:10px}
.mn-bc p:last-child{margin-bottom:0}
.mn-bc b{color:${M.text};font-weight:500}
.mn-bc ul{margin:0 0 10px 18px}
.mn-bc li{font-size:13.5px;line-height:1.75;color:#CFC8BE;margin-bottom:5px}
.mn-bc small{font-size:11px;color:${M.faint}}
.mn-bc table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px}
.mn-bc th{text-align:left;font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:${M.gold};
  font-weight:400;padding:7px 9px 7px 0;border-bottom:1px solid ${M.line}}
.mn-bc td{padding:8px 9px 8px 0;border-bottom:1px solid rgba(46,46,51,.6);color:#CFC8BE;line-height:1.6;vertical-align:top}
.mn-bc .pend{color:#D98A6A;font-weight:500}

.say{background:rgba(201,168,76,.06);border-left:2px solid ${M.gold};padding:13px 16px;
  border-radius:0 6px 6px 0;margin:12px 0}
.say p{font-family:'Cormorant Garamond',serif;font-size:16px;line-height:1.6;color:${M.cream};margin-bottom:9px}
.say p:last-child{margin-bottom:0}
.say .who{font-size:8.5px;letter-spacing:.26em;text-transform:uppercase;color:${M.gold};
  font-family:'DM Sans',sans-serif;margin-bottom:8px}
.warn{background:rgba(190,80,60,.09);border-left:2px solid #B4553C;padding:12px 15px;border-radius:0 6px 6px 0;margin:12px 0}
.warn p{font-size:13px;line-height:1.75;color:#E8C4B8;margin:0}
.warn b{color:#F2D9CF}

.mn-empty{border:1px dashed ${M.line};border-radius:8px;padding:30px 20px;text-align:center}
.mn-empty p{font-size:13px;color:${M.faint};line-height:1.7}
mark{background:rgba(201,168,76,.3);color:${M.text};border-radius:2px}

/* Ficha do cliente — só para impressão */
.mn-cli{display:none}

@media print{
  @page{size:A4;margin:14mm}
  html,body{height:auto!important;overflow:visible!important;background:#fff!important}
  #root{height:auto!important;overflow:visible!important;display:block!important}
  #root > div{display:block!important;height:auto!important;max-height:none!important;overflow:visible!important}
  #root > div > *{height:auto!important;max-height:none!important;overflow:visible!important}
  aside,.bottom-nav,.mn-search,.mn-tabs,.mn-acts,.mn-chev,.mn-tag{display:none!important}
  .mn-wrap{max-width:none;padding:0;background:#fff}
  .mn-mark{color:#8B6914}
  .mn-h1{color:#12100E}
  .mn-sec h2{color:#12100E}
  .mn-intro{color:#5A544B}
  .mn-blk{border:none;background:none;border-bottom:1px solid #DDD8CE;border-radius:0;margin-bottom:0;page-break-inside:avoid}
  .mn-bh{padding:11px 0}
  .mn-bt{color:#12100E!important;font-weight:500}
  .mn-bc{display:block!important;padding:0 0 14px!important;border:none!important}
  .mn-bc p,.mn-bc li,.mn-bc td{color:#3A362F}
  .mn-bc b{color:#12100E}
  .say{background:#F3EDE4;border-left-color:#C9A84C}
  .say p{color:#2E2A26}
  .warn{background:#FBEEE9}.warn p{color:#7A3A28}
  .mn-cli.imprimir{display:block!important}
  .mn-cli.imprimir ~ *{display:none!important}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
}

/* Ficha do cliente impressa */
.mn-cli-sheet{padding:6mm 4mm;color:#2E2A26;font-family:'DM Sans',sans-serif}
.mn-cli-sheet h1{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:400;color:#12100E;margin:14px 0 4px}
.mn-cli-sheet .sub{font-size:11px;color:#6E6A62;margin-bottom:14px}
.mn-cli-verb{margin-bottom:16px;padding-bottom:13px;border-bottom:1px solid rgba(46,42,38,.14)}
.mn-cli-verb:last-of-type{border-bottom:none}
.mn-cli-verb h3{font-family:'Cormorant Garamond',serif;font-size:21px;font-weight:400;color:#12100E;margin-bottom:4px}
.mn-cli-verb .lead{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:#7A6420;margin-bottom:6px}
.mn-cli-verb p{font-size:11px;line-height:1.7;color:#4A453E}
.mn-cli-ct{margin-top:20px;padding-top:14px;border-top:1px solid #C9A84C;font-size:10.5px;line-height:1.9;color:#4A453E}

@media(max-width:600px){
  .mn-wrap{padding:16px 12px 60px}
  .mn-h1{font-size:25px}
  .mn-sec h2{font-size:20px}
}
`;

const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function Manual({ mob = false, user = null }) {
  const [activo, setActivo] = useState("ficha");
  const [termo, setTermo] = useState("");
  const [abertos, setAbertos] = useState({});
  const [imprimirCliente, setImprimirCliente] = useState(false);

  /* ── Que separadores este utilizador vê ── */
  const visiveis = useMemo(() => {
    const role = (user?.role || user?.cargo || "").toLowerCase();
    const tudo = role.includes("admin") || role.includes("diretor") || role.includes("director");
    if (tudo) return SEPARADORES;
    const permitidos = ACESSOS[user?.email] || null;
    if (!permitidos) return SEPARADORES.filter(s => s.sempre);
    return SEPARADORES.filter(s => s.sempre || permitidos.includes(s.id));
  }, [user]);

  const realce = (html) => {
    if (!termo) return html;
    const t = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return html.replace(new RegExp("(" + t + ")", "gi"), "<mark>$1</mark>");
  };

  const chave = (sepId, secLabel, i) => `${sepId}|${secLabel}|${i}`;

  const alterna = (k) => setAbertos(a => ({ ...a, [k]: !a[k] }));

  const todos = (abrir) => {
    const novo = {};
    visiveis.forEach(sep => sep.secoes.forEach(sec => sec.blocos.forEach((b, i) => {
      novo[chave(sep.id, sec.label, i)] = abrir;
    })));
    setAbertos(novo);
  };

  const Bloco = ({ b, k, forcarAberto }) => {
    const on = forcarAberto || abertos[k] !== undefined ? (forcarAberto || abertos[k]) : !!b.aberto;
    return (
      <div className={"mn-blk" + (on ? " on" : "")}>
        <div className="mn-bh" onClick={() => alterna(k)}>
          <span className="mn-chev">▶</span>
          <span className="mn-bt" dangerouslySetInnerHTML={{ __html: realce(b.t) }} />
          {b.tag && <span className="mn-tag">{b.tag}</span>}
        </div>
        <div className="mn-bc" dangerouslySetInnerHTML={{ __html: realce(b.c) }} />
      </div>
    );
  };

  /* ── Resultados de pesquisa ── */
  const resultados = useMemo(() => {
    if (!termo) return null;
    const t = norm(termo);
    const out = [];
    visiveis.forEach(sep => sep.secoes.forEach(sec => {
      const achados = sec.blocos
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => norm(b.t + " " + b.c).includes(t));
      if (achados.length) out.push({ sep, sec, achados });
    }));
    return out;
  }, [termo, visiveis]);

  const nResultados = resultados ? resultados.reduce((n, r) => n + r.achados.length, 0) : 0;
  const sepActivo = visiveis.find(s => s.id === activo) || visiveis[0];

  return (
    <>
      <style>{manualCSS}</style>

      {/* Ficha do cliente — invisível no ecrã, sai na impressão */}
      <div className={"mn-cli" + (imprimirCliente ? " imprimir" : "")}>
        <div className="mn-cli-sheet">
          <div className="mn-mark" style={{ color: "#8B6914" }}>
            MAGNA<small style={{ color: "#8A8378" }}>GROUP REAL ESTATE</small>
          </div>
          <h1>Como podemos ajudar</h1>
          <p className="sub">Cinco formas de trabalhar consigo</p>
          {FICHA_CLIENTE.map(v => (
            <div className="mn-cli-verb" key={v.verbo}>
              <h3>{v.verbo}</h3>
              <p className="lead">{v.lead}</p>
              <p dangerouslySetInnerHTML={{ __html: v.texto }} />
            </div>
          ))}
          <div className="mn-cli-ct">
            <b>Magna Group Real Estate</b><br />
            magnagroup-re.com<br />
            catiabarbosa@magnagroup-re.com · anacosta@magnagroup-re.com
          </div>
        </div>
      </div>

      <div className="mn-wrap">
        <div className="mn-head">
          <div className="mn-mark">MAGNA<small>GROUP REAL ESTATE</small></div>
          <h1 className="mn-h1">Manual do Consultor</h1>
          <div className="mn-rule" />
        </div>

        <div className="mn-search">
          <input
            type="search"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Procurar — comissão, IVA, exclusivo, licença, renda…"
          />
          <div className="mn-hits">
            {termo ? (nResultados ? `${nResultados} resultado${nResultados > 1 ? "s" : ""} em todos os separadores` : "Sem resultados") : ""}
          </div>
        </div>

        {!termo && (
          <>
            <div className="mn-tabs">
              {visiveis.map(s => (
                <button
                  key={s.id}
                  className={"mn-tab" + (s.id === activo ? " on" : "")}
                  onClick={() => { setActivo(s.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                >{s.nome}</button>
              ))}
            </div>

            <div className="mn-acts">
              <button className="mn-act" onClick={() => todos(true)}>Abrir tudo</button>
              <button className="mn-act" onClick={() => todos(false)}>Fechar tudo</button>
              <button className="mn-act" onClick={() => { setImprimirCliente(false); setTimeout(() => window.print(), 60); }}>
                Imprimir este separador
              </button>
              <button className="mn-act" onClick={() => { setImprimirCliente(true); setTimeout(() => { window.print(); setImprimirCliente(false); }, 60); }}>
                Imprimir ficha do cliente
              </button>
            </div>
          </>
        )}

        {termo ? (
          resultados.length ? resultados.map(({ sep, sec, achados }) => (
            <div className="mn-sec" key={sep.id + sec.label}>
              <div className="mn-lbl">{sep.nome} · {sec.label}</div>
              <h2>{sec.titulo}</h2>
              {achados.map(({ b, i }) => (
                <Bloco key={i} b={b} k={chave(sep.id, sec.label, i)} forcarAberto={true} />
              ))}
            </div>
          )) : (
            <div className="mn-empty">
              <p>Nada encontrado para "{termo}".<br />Tente outra palavra — comissão, exclusivo, licença, renda.</p>
            </div>
          )
        ) : (
          sepActivo?.secoes.map(sec => (
            <div className="mn-sec" key={sec.label}>
              <div className="mn-lbl">{sec.label}</div>
              <h2>{sec.titulo}</h2>
              {sec.intro && <p className="mn-intro">{sec.intro}</p>}
              {sec.blocos.map((b, i) => (
                <Bloco key={i} b={b} k={chave(sepActivo.id, sec.label, i)} />
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}
