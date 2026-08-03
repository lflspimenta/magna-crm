import React, { useState } from "react";

/* ═══════════════════════════════════════════════════════════
   DOSSIER INSTITUCIONAL — Magna Group Real Estate
   Documento de apresentação a promotores e grupos de construção.

   PARA EDITAR OS RETRATOS: colar os URLs abaixo.
   Vazio = mostra espaço reservado.
   ═══════════════════════════════════════════════════════════ */

const FOTO_CATIA = "";
const FOTO_ANA   = "";

/* Paleta do documento (independente da paleta do CRM) */
const D = {
  ink:      "#12100E",
  cream:    "#F3EDE4",
  creamDeep:"#E8DFD2",
  gold:     "#C9A84C",
  paper:    "#2E2A26",
  paperSoft:"#544E47",
  darkText: "#EDE7DE",
  darkSoft: "#CFC8BE",
  darkMuted:"#A29A8F",
};

/* ─── CSS do documento ─────────────────────────────────────── */
const dossierCSS = `
.dsr-wrap{background:#6C6862;padding:24px 12px 60px;min-height:100%;overflow-y:auto}

.dsr-bar{position:sticky;top:0;z-index:20;background:#161618;border:1px solid #2E2E33;
  border-radius:10px;padding:14px 16px;margin:0 auto 22px;max-width:210mm;
  display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.dsr-bar label{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#8A8880;display:block;margin-bottom:6px}
.dsr-bar input{background:#1E1E21;border:1px solid #2E2E33;color:#F0EDE6;
  font-family:'DM Sans',sans-serif;font-size:13px;padding:9px 12px;outline:none;border-radius:6px;width:100%}
.dsr-bar input:focus{border-color:${D.gold}}
.dsr-btn{background:linear-gradient(135deg,#8B6914,${D.gold});color:#12100E;border:none;
  font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;letter-spacing:.06em;
  padding:11px 20px;border-radius:6px;cursor:pointer;white-space:nowrap}
.dsr-btn:hover{filter:brightness(1.08)}
.dsr-hint{font-size:11px;color:#5A5855;line-height:1.6;max-width:210mm;margin:0 auto 22px}

.dsr-sheet{width:210mm;min-height:297mm;margin:0 auto 20px;padding:24mm 22mm;
  background:${D.cream};color:${D.paper};position:relative;overflow:hidden;
  box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:'DM Sans',sans-serif}
.dsr-sheet.dark{background:${D.ink};color:${D.darkText}}

.dsr-cover{display:flex;flex-direction:column;justify-content:space-between}
.dsr-mark{font-family:'Cormorant Garamond',serif;font-size:26px;letter-spacing:.34em;color:${D.gold};font-weight:400}
.dsr-mark small{display:block;font-family:'DM Sans',sans-serif;font-size:8px;letter-spacing:.34em;color:${D.darkMuted};margin-top:10px;font-weight:400}
.dsr-thesis{max-width:150mm}
.dsr-thesis .dsr-rule{width:54px;height:1px;background:${D.gold};margin-bottom:28px}
.dsr-thesis p{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:400;font-size:40px;line-height:1.18;color:#fff}
.dsr-thesis .em{color:${D.gold}}
.dsr-coverfoot{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;
  font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:${D.darkMuted}}
.dsr-prep{border-left:1px solid rgba(201,168,76,.5);padding-left:14px}
.dsr-prep span{display:block;font-size:8px;letter-spacing:.3em;color:${D.darkMuted};margin-bottom:7px}
.dsr-prep strong{font-family:'Cormorant Garamond',serif;font-weight:400;font-size:19px;
  letter-spacing:.02em;color:${D.cream};text-transform:none}

.dsr-head{position:relative;margin-bottom:26px}
.dsr-num{font-family:'Cormorant Garamond',serif;font-size:88px;line-height:1;font-weight:400;
  color:${D.gold};opacity:.16;position:absolute;top:-30px;left:-6px;pointer-events:none}
.dark .dsr-num{opacity:.22}
.dsr-eyebrow{position:relative;font-size:8px;letter-spacing:.34em;text-transform:uppercase;color:${D.gold};margin-bottom:12px}
.dsr-title{position:relative;font-family:'Cormorant Garamond',serif;font-weight:400;font-size:33px;line-height:1.14;color:${D.ink}}
.dark .dsr-title{color:${D.cream}}
.dsr-head .dsr-rule{width:44px;height:1px;background:${D.gold};margin-top:18px}

.dsr-body{font-size:10.5pt;line-height:1.85;margin-bottom:13px;max-width:145mm;font-weight:300}
.dark .dsr-body{color:${D.darkSoft}}
.dsr-lead{font-family:'Cormorant Garamond',serif;font-size:19px;line-height:1.55;font-weight:400;color:${D.ink};margin-bottom:20px;max-width:140mm}
.dark .dsr-lead{color:${D.cream}}
.dsr-pull{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:400;font-size:23px;
  line-height:1.4;color:${D.gold};border-left:1px solid rgba(201,168,76,.45);padding-left:20px;margin:26px 0;max-width:132mm}

.dsr-claim{margin-bottom:20px;max-width:145mm}
.dsr-claim h4{font-size:9.5pt;font-weight:500;margin-bottom:6px;color:${D.ink}}
.dark .dsr-claim h4{color:${D.gold}}
.dsr-claim p{font-size:10pt;line-height:1.8;font-weight:300}
.dark .dsr-claim p{color:${D.darkSoft}}
.dsr-claim p+p{margin-top:9px}

.dsr-row{display:grid;grid-template-columns:30px 1fr;gap:16px;padding:15px 0;
  border-top:1px solid rgba(46,42,38,.16);max-width:150mm}
.dark .dsr-row{border-top-color:rgba(201,168,76,.2)}
.dsr-rows .dsr-row:last-child{border-bottom:1px solid rgba(46,42,38,.16)}
.dark .dsr-rows .dsr-row:last-child{border-bottom-color:rgba(201,168,76,.2)}
.dsr-key{font-family:'Cormorant Garamond',serif;font-size:22px;color:${D.gold};line-height:1}
.dsr-row h4{font-size:9.5pt;font-weight:500;margin-bottom:5px}
.dsr-row p{font-size:9.5pt;line-height:1.75;font-weight:300;color:${D.paperSoft}}
.dark .dsr-row p{color:${D.darkSoft}}

.dsr-steps{display:grid;grid-template-columns:1fr 1fr;gap:26px 30px;max-width:150mm}
.dsr-stepn{font-family:'Cormorant Garamond',serif;font-size:15px;color:${D.gold};letter-spacing:.2em;margin-bottom:8px}
.dsr-steps h4{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:400;margin-bottom:7px;color:${D.ink}}
.dsr-steps p{font-size:9.5pt;line-height:1.75;font-weight:300;color:${D.paperSoft}}

.dsr-founders{display:grid;grid-template-columns:1fr 1fr;gap:34px}
.dsr-portrait{aspect-ratio:4/5;background:repeating-linear-gradient(135deg,rgba(201,168,76,.09) 0 12px,transparent 12px 24px),${D.creamDeep};
  border-bottom:1px solid ${D.gold};display:flex;align-items:center;justify-content:center;margin-bottom:16px;overflow:hidden}
.dsr-portrait img{width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.05)}
.dsr-portrait span{font-size:7.5px;letter-spacing:.28em;text-transform:uppercase;color:#9A9186;text-align:center;line-height:1.9}
.dsr-role{font-size:7.5px;letter-spacing:.32em;text-transform:uppercase;color:${D.gold};margin-bottom:9px}
.dsr-fname{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:400;line-height:1.12;margin-bottom:14px;color:${D.ink}}
.dsr-fbio{font-size:9.5pt;line-height:1.78;font-weight:300;color:${D.paperSoft};margin-bottom:14px}
.dsr-fmail{font-size:7.5px;letter-spacing:.2em;text-transform:uppercase;color:${D.gold};padding-top:11px;border-top:1px solid rgba(201,168,76,.35)}

.dsr-closing{display:flex;flex-direction:column;justify-content:center;min-height:230mm}
.dsr-big{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:400;font-size:35px;
  line-height:1.3;color:#fff;max-width:140mm;margin-bottom:30px}
.dsr-contact{font-size:10pt;line-height:2.1;font-weight:300;color:${D.darkSoft};margin-top:34px}
.dsr-contact a{color:${D.gold};text-decoration:none}

.dsr-foot{position:absolute;bottom:16mm;left:22mm;right:22mm;
  font-size:7px;letter-spacing:.3em;text-transform:uppercase;color:rgba(46,42,38,.4)}
.dark .dsr-foot{color:rgba(162,154,143,.55)}

/* ── Cartas de apresentação (só ecrã) ── */
.dsr-emails{max-width:210mm;margin:34px auto 0;background:#161618;border:1px solid #2E2E33;border-radius:10px;padding:22px}
.dsr-emails h3{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:400;color:#F0EDE6;margin-bottom:6px}
.dsr-emails .sub{font-size:12px;color:#8A8880;line-height:1.6;margin-bottom:20px}
.dsr-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px}
.dsr-fields label{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#8A8880;display:block;margin-bottom:6px}
.dsr-fields input,.dsr-fields select{width:100%;background:#1E1E21;border:1px solid #2E2E33;color:#F0EDE6;
  font-family:'DM Sans',sans-serif;font-size:13px;padding:9px 12px;outline:none;border-radius:6px}
.dsr-fields input:focus,.dsr-fields select:focus{border-color:${D.gold}}
.dsr-mail{border-top:1px solid #2E2E33;padding-top:18px;margin-top:18px}
.dsr-mail:first-of-type{border-top:none;padding-top:0;margin-top:0}
.dsr-mailhead{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px}
.dsr-mailname{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${D.gold}}
.dsr-mailwhen{font-size:11px;color:#5A5855;flex:1;min-width:160px}
.dsr-copy{background:none;border:1px solid rgba(201,168,76,.45);color:${D.gold};
  font-family:'DM Sans',sans-serif;font-size:11px;padding:7px 13px;border-radius:5px;cursor:pointer;white-space:nowrap}
.dsr-copy:hover{background:rgba(201,168,76,.1)}
.dsr-copy.done{background:${D.gold};color:#12100E;border-color:${D.gold}}
.dsr-subject{font-size:12px;color:#8A8880;margin-bottom:8px}
.dsr-subject b{color:#F0EDE6;font-weight:400}
.dsr-preview{background:#1E1E21;border:1px solid #2E2E33;border-radius:6px;padding:14px 16px;
  font-size:12.5px;line-height:1.75;color:#CFC8BE;white-space:pre-wrap;max-height:190px;overflow-y:auto}

/* ── Ecrãs pequenos (nunca aplicar na impressão) ── */
@media screen and (max-width:860px){
  .dsr-wrap{padding:14px 8px 40px}
  .dsr-sheet{width:100%;min-height:auto;padding:26px 22px;margin-bottom:14px}
  .dsr-cover{min-height:70vh}
  .dsr-thesis p{font-size:27px}
  .dsr-title{font-size:25px}
  .dsr-num{font-size:60px;top:-18px}
  .dsr-founders,.dsr-steps{grid-template-columns:1fr}
  .dsr-closing{min-height:auto}
  .dsr-big{font-size:25px}
  .dsr-foot{position:static;margin-top:26px}
  .dsr-coverfoot{flex-direction:column;align-items:flex-start;gap:22px}
  .dsr-fields{grid-template-columns:1fr}
  .dsr-emails{padding:16px;border-radius:8px}
}

/* ── Impressão ── */
@media print{
  @page{size:A4;margin:0}
  html,body{height:auto!important;overflow:visible!important;background:#fff!important}
  #root{height:auto!important;overflow:visible!important;display:block!important}
  #root > div{display:block!important;height:auto!important;max-height:none!important;overflow:visible!important}
  #root > div > *{height:auto!important;max-height:none!important;overflow:visible!important}
  aside,.bottom-nav,.dsr-bar,.dsr-hint,.dsr-emails{display:none!important}
  .dsr-wrap{background:#fff!important;padding:0!important;margin:0!important;
    width:210mm!important;min-height:0!important;overflow:visible!important}
  .dsr-sheet{width:210mm!important;height:297mm!important;min-height:297mm!important;
    max-width:none!important;margin:0!important;padding:24mm 22mm!important;
    box-shadow:none!important;page-break-after:always;break-after:page}
  .dsr-sheet:last-child{page-break-after:auto;break-after:auto}
  .dsr-founders,.dsr-steps{grid-template-columns:1fr 1fr!important}
  .dsr-cover{min-height:0!important;height:100%!important}
  .dsr-coverfoot{flex-direction:row!important;align-items:flex-end!important;gap:20px!important}
  .dsr-closing{min-height:230mm!important}
  .dsr-thesis p{font-size:40px!important}
  .dsr-title{font-size:33px!important}
  .dsr-num{font-size:88px!important;top:-30px!important}
  .dsr-big{font-size:35px!important}
  .dsr-foot{position:absolute!important;bottom:16mm!important;left:22mm!important;
    right:22mm!important;margin-top:0!important}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
}
`;

/* ─── Cartas de apresentação ───────────────────────────────── */
const ASSINANTES = {
  catia: { nome: "Cátia Barbosa", email: "catiabarbosa@magnagroup-re.com" },
  ana:   { nome: "Ana Costa",     email: "anacosta@magnagroup-re.com" },
};

const assinatura = (a) =>
  `Com os melhores cumprimentos,\n\n${a.nome}\nSócia Fundadora · Magna Group Real Estate\n${a.email}\nmagnagroup-re.com`;

const CARTAS = [
  {
    id: "directa",
    nome: "Directa e curta",
    quando: "Primeiro contacto, quando não se conhece o projecto em curso.",
    assunto: () => "Comercialização de empreendimentos — Magna Group",
    corpo: (n, e, a) =>
`Bom dia ${n},

A Magna Group Real Estate trabalha comercialização de empreendimentos com promotores e grupos de construção. Envio o nosso dossier institucional em anexo.

A diferença que costuma interessar mais a quem constrói: não começamos a vender no lançamento. Temos carteira própria de investidores nacionais e internacionais, e acesso a grupos e fundos que compram em bloco — o que permite colocar unidades antes da obra estar concluída.

Se tiver um projecto em curso, em qualquer fase, disponho de uma hora para o analisar e dizer-lhe o que colocaríamos, a que preço e em que prazo. Sem compromisso.

${assinatura(a)}`,
  },
  {
    id: "ancorada",
    nome: "Ancorada no projecto dele",
    quando: "Quando se conhece o empreendimento. É a que tem melhor taxa de abertura.",
    assunto: (n, e) => `${e} — uma nota sobre comercialização`,
    corpo: (n, e, a) =>
`Bom dia ${n},

Acompanhei o ${e} e é por isso que lhe escrevo.

A Magna Group Real Estate trabalha a comercialização de empreendimentos com promotores. O que nos distingue de uma mediadora convencional é a fase em que entramos: temos carteira própria de investidores e acesso directo a grupos e fundos, o que permite colocar unidades antes da conclusão da obra — e, quando o projecto o justifica, apresentá-lo para saída em bloco.

Envio o dossier institucional em anexo. Se fizer sentido, gostava de perceber em que ponto está o ${e} e dizer-lhe com franqueza o que conseguiríamos fazer por ele.

${assinatura(a)}`,
  },
  {
    id: "dor",
    nome: "Abre com a dor",
    quando: "Para promotores com stock por escoar ou obra já concluída.",
    assunto: () => "O custo de vender tarde",
    corpo: (n, e, a) =>
`Bom dia ${n},

Um empreendimento raramente falha por não vender. Falha por vender tarde — com o juro da construção a correr, o capital preso e a margem a perder-se no desconto das últimas frações.

É o problema que a Magna Group Real Estate trabalha. Entramos antes do lançamento, com carteira própria de investidores nacionais e internacionais e acesso a grupos e fundos que compram em bloco.

O dossier em anexo explica como, em sete páginas.

Se quiser testar-nos, traga-me um projecto na fase em que está — licenciamento, obra ou stock por escoar. Saímos dessa reunião com uma posição concreta sobre preço e prazo.

${assinatura(a)}`,
  },
];

/* Cópia com alternativa para clientes que não suportam a API moderna */
const copiarTexto = async (texto) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (e) { /* segue para a alternativa */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
};

/* ─── Componente ───────────────────────────────────────────── */
export default function DossierInstitucional({ mob = false }) {
  const [destinatario, setDestinatario] = useState("");
  const [empreendimento, setEmpreendimento] = useState("");
  const [assinante, setAssinante] = useState("catia");
  const [copiado, setCopiado] = useState("");

  const nomeVar = destinatario.trim() || "[Nome]";
  const empVar  = empreendimento.trim() || "[empreendimento]";
  const quemAssina = ASSINANTES[assinante];

  const copiar = async (chave, texto) => {
    const ok = await copiarTexto(texto);
    setCopiado(ok ? chave : "erro-" + chave);
    setTimeout(() => setCopiado(""), 2200);
  };

  const Rule = () => <div className="dsr-rule" />;

  const Head = ({ num, eyebrow, children }) => (
    <div className="dsr-head">
      {num && <div className="dsr-num">{num}</div>}
      <div className="dsr-eyebrow">{eyebrow}</div>
      <h2 className="dsr-title">{children}</h2>
      <Rule />
    </div>
  );

  const Foot = () => <div className="dsr-foot">Magna Group Real Estate</div>;

  const Portrait = ({ src, nome }) => (
    <div className="dsr-portrait">
      {src ? <img src={src} alt={nome} /> : <span>Retrato<br />{nome}</span>}
    </div>
  );

  return (
    <>
      <style>{dossierCSS}</style>

      <div className="dsr-wrap">

        {/* ── Barra de controlo (não imprime) ── */}
        <div className="dsr-bar">
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Preparado para</label>
            <input
              value={destinatario}
              onChange={e => setDestinatario(e.target.value)}
              placeholder="Nome do grupo ou promotor"
            />
          </div>
          <button className="dsr-btn" onClick={() => window.print()}>
            Gerar PDF
          </button>
        </div>

        <div className="dsr-hint">
          Escreva o nome do destinatário e escolha Gerar PDF. Na janela de impressão,
          seleccione “Guardar como PDF”, margens “Nenhuma” e active os gráficos de fundo.
        </div>

        {/* ══ CAPA ══ */}
        <section className="dsr-sheet dark dsr-cover">
          <div className="dsr-mark">MAGNA<small>GROUP REAL ESTATE · PORTUGAL</small></div>

          <div className="dsr-thesis">
            <Rule />
            <p>
              Um empreendimento não falha por não vender.<br />
              <span className="em">Falha por vender tarde.</span>
            </p>
          </div>

          <div className="dsr-coverfoot">
            <div>Dossier Institucional<br />Parcerias com promotores</div>
            {destinatario.trim() && (
              <div className="dsr-prep">
                <span>Preparado para</span>
                <strong>{destinatario}</strong>
              </div>
            )}
          </div>
        </section>

        {/* ══ 01 + 02 ══ */}
        <section className="dsr-sheet">
          <Head num="01" eyebrow="O ponto de partida">O problema não é vender</Head>

          <p className="dsr-lead">Um empreendimento não falha por não vender. Falha por vender tarde.</p>

          <p className="dsr-body">
            Cada mês de stock por escoar é juro de financiamento à construção que continua a correr.
            É capital imobilizado que não roda para a operação seguinte. E é margem que se perde no
            desconto inevitável das últimas frações — aquelas que ficam quando a procura inicial se
            esgotou e o projecto já deixou de ser novidade.
          </p>

          <p className="dsr-body">
            A comercialização que arranca depois da obra chega sempre tarde de mais para corrigir seja o que for.
          </p>

          <div className="dsr-pull">A Magna Group entra antes.</div>

          <div style={{ marginTop: 52 }}>
            <Head num="02" eyebrow="Quem somos">Uma equipa dedicada.<br />Um grupo por trás.</Head>
          </div>

          <p className="dsr-body">
            A Magna Group Real Estate é a vertente de mediação e gestão do Grupo Magna, com actividade
            em todo o território nacional. É dirigida pelas suas fundadoras, Cátia Barbosa e Ana Costa.
          </p>

          <p className="dsr-body">
            A equipa que acompanha cada empreendimento é deliberadamente restrita — não por limitação
            de escala, mas porque o promotor que nos confia um projecto trata directamente com quem
            decide. Não com um comercial que lhe foi atribuído e que muda no trimestre seguinte.
            É uma diferença que se nota no primeiro problema que aparecer. E aparece sempre.
          </p>

          <Foot />
        </section>

        {/* ══ O GRUPO ══ */}
        <section className="dsr-sheet">
          <Head eyebrow="Estrutura" >O que o grupo<br />põe ao serviço do projecto</Head>

          <div className="dsr-rows">
            <div className="dsr-row">
              <div className="dsr-key">·</div>
              <div>
                <h4>Aquisição e reposicionamento de activos</h4>
                <p>O grupo compra e reposiciona imóveis por conta própria. Para um promotor, isto
                significa que não somos apenas quem procura o comprador — em determinadas condições,
                podemos ser a contraparte.</p>
              </div>
            </div>
            <div className="dsr-row">
              <div className="dsr-key">·</div>
              <div>
                <h4>Financiamento e apoio ao investimento</h4>
                <p>Consultoria de enquadramento em programas de financiamento, incluindo PRR, e
                parceiros financeiros estabelecidos — para o projecto e para quem o compra.</p>
              </div>
            </div>
            <div className="dsr-row">
              <div className="dsr-key">·</div>
              <div>
                <h4>Acompanhamento de licenciamento</h4>
                <p>Gestão processual junto de autarquias onde temos experiência instalada: instrução,
                controlo de prazos e resposta a pedidos de elementos.</p>
              </div>
            </div>
            <div className="dsr-row">
              <div className="dsr-key">·</div>
              <div>
                <h4>Design e reformulação de interiores</h4>
                <p>Capacidade de execução, e não apenas de parecer. Quando a leitura de mercado indica
                que o produto precisa de mudar, o grupo altera-o.</p>
              </div>
            </div>
            <div className="dsr-row">
              <div className="dsr-key">·</div>
              <div>
                <h4>Gestão de activos para investidores</h4>
                <p>Arrendamento, avaliação e acompanhamento de inquilinos, exploração e reporte de
                rendimento. É o que permite vender a quem compra para rentabilizar.</p>
              </div>
            </div>
          </div>

          <Foot />
        </section>

        {/* ══ 03 — credenciais ══ */}
        <section className="dsr-sheet dark">
          <Head num="03" eyebrow="Credenciais">O que trazemos de trás</Head>

          <p className="dsr-lead">A Magna Group é uma marca recente. A experiência que a sustenta não é.</p>

          <p className="dsr-body">
            As operações anteriores das fundadoras foram executadas enquanto membros e consultores de
            grupos e fundos de investimento imobiliário. Não podemos identificar essas operações, os
            valores envolvidos ou as entidades para quem trabalhámos — o sector funciona sob acordos
            de confidencialidade e nós cumprimo-los.
          </p>

          <div className="dsr-pull">
            O mesmo acordo que nos impede de lhe mostrar nomes é o que protegerá o seu projecto.
          </div>

          <p className="dsr-body">
            Um promotor que nos entrega um empreendimento não vai encontrar os seus números na
            apresentação seguinte, feita ao concorrente do outro lado da rua. Num mercado onde o preço
            de venda real e o ritmo de absorção são informação sensível, a discrição não é uma
            cortesia — é parte do serviço.
          </p>

          <div className="dsr-claim" style={{ marginTop: 30 }}>
            <h4>A escola foi a hotelaria</h4>
            <p>As operações de maior dimensão fizeram-se no sector turístico, com capital estrangeiro
            e com grupos portugueses. É o segmento mais exigente que existe: o activo tem de gerar
            rendimento desde o primeiro mês, o comprador é internacional, a decisão passa por comités,
            e a venda não termina na escritura porque a exploração continua.</p>
            <p>Não é onde queremos ficar. É o que nos ensinou a trabalhar com um padrão que o
            residencial e o comercial raramente exigem — e é esse padrão que trazemos agora para todo
            o território nacional.</p>
          </div>

          <div className="dsr-claim">
            <h4>Conhecemos a decisão do lado de quem compra</h4>
            <p>Sabemos o que um comité aprova e o que devolve, que rácios são olhados primeiro, que
            documentação trava uma operação em due diligence, e em que ponto um investidor desiste de
            um activo que parecia fechado.</p>
          </div>

          <div className="dsr-claim">
            <h4>As relações não são uma base de dados</h4>
            <p>A carteira de investidores nacionais e internacionais e o acesso a grupos e fundos
            foram construídos nesse período, nome a nome.</p>
          </div>

          <Foot />
        </section>

        {/* ══ 04 ══ */}
        <section className="dsr-sheet">
          <Head num="04" eyebrow="Proposta de valor">O que trazemos<br />a um empreendimento</Head>

          <div className="dsr-claim">
            <h4>Procura já constituída</h4>
            <p>A comercialização não começa no dia do lançamento. Começa com uma lista de nomes que já
            conhecemos, cujo critério de investimento já mapeámos, e a quem podemos apresentar o
            projecto antes de ele existir em betão.</p>
          </div>

          <div className="dsr-claim">
            <h4>Assessoria jurídica dentro de casa</h4>
            <p>Ana Costa, uma das fundadoras, é jurista com especialização em direito imobiliário.
            Contratos-promessa, condições suspensivas, questões registrais e documentação de
            compradores estrangeiros resolvem-se internamente. Menos tempo entre reserva e escritura —
            e menos negócios a cair por atrito processual, que é como se perde boa parte das vendas
            que já estavam ganhas.</p>
          </div>

          <div className="dsr-claim">
            <h4>O activo que já funciona no dia da escritura</h4>
            <p>Um investidor que compra para rentabilizar tem sempre a mesma hesitação antes de
            assinar: e depois da entrega, quem trata disto? Quase sempre a resposta que recebe é que o
            problema passa a ser dele.</p>
            <p>A Magna trata. Colocação em arrendamento, avaliação e acompanhamento dos inquilinos,
            exploração em alojamento local, manutenção corrente e relatórios de rendimento. O comprador
            não adquire uma fração — adquire um activo que entra em funcionamento sem que precise de
            montar nada, contratar ninguém ou estar no país.</p>
          </div>

          <div className="dsr-claim">
            <h4>A venda que não cai por falta de crédito</h4>
            <p>Uma parte das vendas perde-se depois do contrato-promessa, quando o financiamento do
            comprador não sai. O promotor liberta a fração meses mais tarde, já fora do momento de
            procura em que a tinha colocado.</p>
            <p>Trabalhamos com parceiros financeiros estabelecidos e enquadramos a solução de crédito
            ainda durante a negociação, antes de haver um contrato dependente dela.</p>
          </div>

          <Foot />
        </section>

        {/* ══ 04 cont. ══ */}
        <section className="dsr-sheet">
          <Head eyebrow="Proposta de valor · continuação">O comprador que<br />o mercado não alcança</Head>

          <div className="dsr-claim">
            <h4>Comprador internacional sem fricção</h4>
            <p>O capital estrangeiro deixou de se concentrar em duas ou três zonas do país. Procura
            hoje em regiões onde a maioria das mediadoras não tem forma de o receber — porque receber
            um comprador internacional não é traduzir uma ficha técnica.</p>
            <p>Acompanhamos esse comprador do primeiro contacto até à instalação: apoio à
            relocalização, abertura de contratos de utilities, os primeiros noventa dias no país. É o
            que faz um investidor estrangeiro escolher o seu empreendimento em vez de um outro
            equivalente a cem quilómetros de distância.</p>
          </div>

          <div className="dsr-claim">
            <h4>Leitura de produto antes do projecto fechar</h4>
            <p>Que tipologias colocam, que áreas travam a venda, que decisões de acabamento se pagam a
            si próprias no preço final.</p>
            <p>É informação que vale muito mais antes da licença do que depois da laje — e que só
            existe em quem está no mercado todos os dias a ouvir a razão pela qual alguém não comprou.
            Quando a conclusão for que o produto tem de mudar, o grupo tem quem o altere.</p>
          </div>

          <Foot />
        </section>

        {/* ══ 05 + 06 ══ */}
        <section className="dsr-sheet">
          <Head num="05" eyebrow="Formatos">Modalidades de parceria</Head>

          <div className="dsr-rows">
            <div className="dsr-row">
              <div className="dsr-key">A</div>
              <div>
                <h4>Comercialização em exclusivo</h4>
                <p>Estruturação e execução da venda desde a fase de planta, com pré-colocação junto da
                carteira antes do lançamento público.</p>
              </div>
            </div>
            <div className="dsr-row">
              <div className="dsr-key">B</div>
              <div>
                <h4>Colocação em bloco</h4>
                <p>Apresentação do empreendimento — total ou por lotes — a investidores institucionais,
                grupos e fundos, para saída concentrada em vez de venda fração a fração.</p>
              </div>
            </div>
            <div className="dsr-row">
              <div className="dsr-key">C</div>
              <div>
                <h4>Consultoria de produto</h4>
                <p>Intervenção em fase de projecto sobre tipologias, áreas, mix e acabamentos,
                calibrada pela procura real em carteira.</p>
              </div>
            </div>
            <div className="dsr-row">
              <div className="dsr-key">D</div>
              <div>
                <h4>Comercialização com gestão subsequente</h4>
                <p>Venda ao investidor e gestão continuada do activo adquirido. A modalidade que mais
                eleva a taxa de conversão junto de compradores de rendimento.</p>
              </div>
            </div>
          </div>

          <p className="dsr-body" style={{ marginTop: 18 }}>
            As modalidades combinam-se. A maioria das parcerias começa em A ou C e evolui para D.
          </p>

          <div style={{ marginTop: 48 }}>
            <Head num="06" eyebrow="Método">Como trabalhamos</Head>
          </div>

          <div className="dsr-steps">
            <div>
              <div className="dsr-stepn">01</div>
              <h4>Leitura</h4>
              <p>Analisamos o projecto, o mercado da zona e o preço-alvo. Dizemos o que colocamos e a
              que ritmo — antes de assinar seja o que for.</p>
            </div>
            <div>
              <div className="dsr-stepn">02</div>
              <h4>Estruturação</h4>
              <p>Posicionamento, faseamento de preço e materiais de venda. O empreendimento passa a
              ter um argumento, não apenas uma ficha técnica.</p>
            </div>
            <div>
              <div className="dsr-stepn">03</div>
              <h4>Colocação</h4>
              <p>Abordagem à carteira antes do mercado aberto. Apresentações fechadas a investidores
              institucionais. Só depois a distribuição pública.</p>
            </div>
            <div>
              <div className="dsr-stepn">04</div>
              <h4>Continuidade</h4>
              <p>Acompanhamento jurídico até à escritura e, quando aplicável, gestão dos activos
              vendidos a investidores.</p>
            </div>
          </div>

          <Foot />
        </section>

        {/* ══ 07 — fundadoras ══ */}
        <section className="dsr-sheet">
          <Head num="07" eyebrow="Responsabilidade">Quem responde<br />pelo seu projecto</Head>

          <div className="dsr-founders">
            <div>
              <Portrait src={FOTO_CATIA} nome="Cátia Barbosa" />
              <div className="dsr-role">Sócia Fundadora</div>
              <div className="dsr-fname">Cátia<br />Barbosa</div>
              <p className="dsr-fbio">
                Mais de uma década no residencial de gama alta, acompanhando famílias e investidores na
                aquisição de imóveis em Portugal. Formação em arquitectura de interiores. É quem lê o
                produto e define como se posiciona.
              </p>
              <div className="dsr-fmail">catiabarbosa@magnagroup-re.com</div>
            </div>

            <div>
              <Portrait src={FOTO_ANA} nome="Ana Costa" />
              <div className="dsr-role">Sócia Fundadora</div>
              <div className="dsr-fname">Ana<br />Costa</div>
              <p className="dsr-fbio">
                Formação em direito, com especialização em direito imobiliário. É a assessoria
                jurídica que a Magna tem dentro de casa — contratos-promessa, condições suspensivas,
                questões registrais e documentação de compradores estrangeiros. Trabalha as operações
                que exigem precisão: arrendamento comercial, heranças, divisões e realojamentos.
                É quem garante que o processo chega ao fim sem surpresas.
              </p>
              <div className="dsr-fmail">anacosta@magnagroup-re.com</div>
            </div>
          </div>

          <Foot />
        </section>

        {/* ══ 08 — fecho ══ */}
        <section className="dsr-sheet dark">
          <div className="dsr-closing">
            <Rule />
            <p className="dsr-big">
              Traga o projecto na fase em que está.<br />
              Licenciamento, obra ou stock por escoar.
            </p>
            <p className="dsr-body" style={{ maxWidth: "132mm" }}>
              Saímos dessa primeira reunião com uma posição concreta sobre o que colocamos, a que preço
              e em que prazo. Sem compromisso.
            </p>
            <div className="dsr-contact">
              <a href="https://magnagroup-re.com">magnagroup-re.com</a><br />
              catiabarbosa@magnagroup-re.com<br />
              anacosta@magnagroup-re.com
            </div>
          </div>
          <div className="dsr-foot">Magna Group Real Estate · Portugal</div>
        </section>

        {/* ══ CARTAS DE APRESENTAÇÃO — só ecrã ══ */}
        <div className="dsr-emails">
          <h3>Carta de apresentação</h3>
          <p className="sub">
            Escolha a variante conforme o promotor. Copie o texto, abra o seu email e cole —
            depois anexe o PDF que gerou acima.
          </p>

          <div className="dsr-fields">
            <div>
              <label>Nome do destinatário</label>
              <input
                value={destinatario}
                onChange={e => setDestinatario(e.target.value)}
                placeholder="Ex: Sr. António Mota"
              />
            </div>
            <div>
              <label>Empreendimento</label>
              <input
                value={empreendimento}
                onChange={e => setEmpreendimento(e.target.value)}
                placeholder="Ex: Quinta das Oliveiras, Braga"
              />
            </div>
            <div>
              <label>Assinado por</label>
              <select value={assinante} onChange={e => setAssinante(e.target.value)}>
                <option value="catia">Cátia Barbosa</option>
                <option value="ana">Ana Costa</option>
              </select>
            </div>
          </div>

          {CARTAS.map(c => {
            const assunto = c.assunto(nomeVar, empVar);
            const corpo   = c.corpo(nomeVar, empVar, quemAssina);
            const kA = c.id + "-assunto";
            const kC = c.id + "-corpo";
            return (
              <div className="dsr-mail" key={c.id}>
                <div className="dsr-mailhead">
                  <span className="dsr-mailname">{c.nome}</span>
                  <span className="dsr-mailwhen">{c.quando}</span>
                  <button
                    className={"dsr-copy" + (copiado === kA ? " done" : "")}
                    onClick={() => copiar(kA, assunto)}
                  >
                    {copiado === kA ? "Copiado" : copiado === "erro-" + kA ? "Falhou" : "Copiar assunto"}
                  </button>
                  <button
                    className={"dsr-copy" + (copiado === kC ? " done" : "")}
                    onClick={() => copiar(kC, corpo)}
                  >
                    {copiado === kC ? "Copiado" : copiado === "erro-" + kC ? "Falhou" : "Copiar mensagem"}
                  </button>
                </div>
                <p className="dsr-subject">Assunto: <b>{assunto}</b></p>
                <div className="dsr-preview">{corpo}</div>
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}
