import React, { useState, useEffect, useRef } from "react";
import { uploadNotaReuniao, deleteNotaReuniao, dbLeadsAquisicao, dbLeadsGestao, dbLeadsHabitar } from "./db.js";
import { G } from "./tema.js";
import { PRE_WRAP } from "./texto.js";
import { fileToBase64, callClaudeDoc, PROMPT_TRANSCREVER } from "./ia.js";
import {
  nomeEstado, corEstado, estaFechada, podePromover, dados,
  mudarEstado, historicoLegivel, comoLead, prospeccaoVazia,
} from "./prospeccao.js";

/* ═══════════════════════════════════════════════════════════
   PROSPECÇÃO — o que uma tarefa de prospecção tem a mais

   Não há ecrã próprio: é uma tarefa de tipo 'Prospecção', e
   estes são os campos e o painel que se acrescentam ao
   formulário e à ficha da tarefa.

   Assim herda o calendário, o .ics, os filtros, os contadores,
   a atribuição e o assumir — que antes era preciso imitar com
   um adaptador.
   ═══════════════════════════════════════════════════════════ */

const quando = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
    + ", " + d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
};

const LEADS = [
  { id: "leads_aquisicao", nome: "Adquirir — quer comprar",          db: dbLeadsAquisicao },
  { id: "leads_gestao",    nome: "Rentabilizar — quer rentabilizar", db: dbLeadsGestao },
  { id: "leads_habitar",   nome: "Instalar — quer serviços",         db: dbLeadsHabitar },
];

const entrada = {
  width: "100%", padding: "9px 11px", borderRadius: 8,
  border: `1px solid ${G.border}`, background: G.surface2, color: G.text,
  fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none",
};
const Texto = (p) => <input {...p} style={{ ...entrada, ...(p.style || {}) }} />;
const Area  = (p) => <textarea {...p} style={{ ...entrada, resize: "vertical", lineHeight: 1.6, ...(p.style || {}) }} />;

const Campo = ({ etiqueta, children, largo = false }) => (
  <div style={largo ? { gridColumn: "1/-1" } : undefined}>
    <label style={{ display: "block", fontSize: 11, color: G.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".3px" }}>{etiqueta}</label>
    {children}
  </div>
);

const botaoPeq = (cor) => ({
  padding: "4px 11px", borderRadius: 7, cursor: "pointer", fontSize: 11.5,
  background: "transparent", border: `1px solid ${cor}55`, color: cor,
  fontFamily: "'DM Sans',sans-serif",
});

export const Pastilha = ({ estado }) => {
  const cor = G[corEstado(estado)] || G.blue;
  return <span style={{
    fontSize: 10, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase",
    padding: "2px 9px", borderRadius: 10, background: `${cor}20`, color: cor, whiteSpace: "nowrap",
  }}>{nomeEstado(estado)}</span>;
};

/* ═══════════════════════════════════════════════════════════
   ANEXOS
   ═══════════════════════════════════════════════════════════ */
const ehImagem = (tipo) => String(tipo || "").startsWith("image/");
const podeTranscrever = (tipo) => ehImagem(tipo) || tipo === "application/pdf";
const ACEITA = "image/*,application/pdf";

/** Chave da pasta no storage. Gerada no cliente, para não
 *  depender do id que a base de dados só atribui ao gravar —
 *  e assim a gravação passa pelo caminho normal das tarefas. */
export const novaChaveAnexos = () => {
  try { return crypto.randomUUID(); }
  catch (e) { return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
};

const CartaoAnexo = ({ anexo, aTranscrever, onVer, onTranscrever, onRemover }) => (
  <div style={{ border: `1px solid ${G.border}`, borderRadius: 10, background: G.surface2, overflow: "hidden" }}>
    <div style={{ display: "flex", gap: 12, padding: 10, alignItems: "flex-start" }}>
      {ehImagem(anexo.tipo) ? (
        <img src={anexo.url} alt="" onClick={onVer}
          style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 7, cursor: "pointer", flexShrink: 0, border: `1px solid ${G.border}` }} />
      ) : (
        <div style={{ width: 64, height: 64, borderRadius: 7, flexShrink: 0, background: G.surface3, border: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📄</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12.5, color: G.text, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{anexo.nome}</p>
        <p style={{ fontSize: 11, color: G.textDim, marginBottom: 6 }}>{anexo.porGravar ? "por gravar" : quando(anexo.em)}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ehImagem(anexo.tipo) && <button type="button" onClick={onVer} style={botaoPeq(G.blue)}>Ver</button>}
          {!anexo.transcricao && podeTranscrever(anexo.tipo) && (
            <button type="button" onClick={onTranscrever} disabled={aTranscrever} style={botaoPeq(G.gold1)}>
              {aTranscrever ? "A transcrever…" : "Transcrever"}
            </button>
          )}
          <button type="button" onClick={onRemover} style={botaoPeq(G.red)}>Remover</button>
        </div>
      </div>
    </div>
    {anexo.transcricao && (
      <div style={{ borderTop: `1px solid ${G.border}`, padding: "10px 12px", background: G.surface }}>
        <p style={{ fontSize: 10, color: G.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".3px" }}>Transcrição</p>
        <p style={{ fontSize: 12.5, color: G.textMuted, lineHeight: 1.65, ...PRE_WRAP }}>{anexo.transcricao}</p>
      </div>
    )}
  </div>
);

const Cabecalho = ({ n, aCarregar, onEscolher, nota }) => (
  <>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
      <p style={{ fontSize: 11, color: G.textDim, textTransform: "uppercase", letterSpacing: ".3px" }}>Notas e ficheiros</p>
      {n > 0 && <span style={{ fontSize: 11, color: G.textDim }}>{n}</span>}
      <label style={{
        marginLeft: "auto", padding: "6px 14px", borderRadius: 8, cursor: aCarregar ? "default" : "pointer",
        border: `1px dashed ${G.gold1}70`, color: G.gold1, fontSize: 12,
      }}>
        {aCarregar ? "A anexar…" : "+ Anexar"}
        <input type="file" accept={ACEITA} multiple hidden onChange={onEscolher} disabled={aCarregar} />
      </label>
    </div>
    {nota && <p style={{ fontSize: 11.5, color: G.textDim, lineHeight: 1.55, marginBottom: 12 }}>{nota}</p>}
  </>
);

const Lupa = ({ anexo, onFechar }) => (
  <div onClick={onFechar} style={{
    position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,.86)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out",
  }}>
    <img src={anexo.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
  </div>
);

/** Sobe os ficheiros escolhidos antes de gravar. */
export const subirAnexos = async (pendentes = [], chave) => {
  const novos = [];
  for (const p of pendentes) {
    const url = await uploadNotaReuniao(p.ficheiro, chave);
    novos.push({ url, nome: p.nome, tipo: p.tipo, transcricao: p.transcricao || "", em: new Date().toISOString() });
  }
  return novos;
};

/**
 * Prepara o formulário para ser gravado: sobe o que está
 * pendente e devolve a tarefa já sem campos de trabalho.
 * Quem chama grava o resultado como gravaria qualquer tarefa —
 * não há caminho especial na base de dados.
 */
export const prepararProspeccao = async (form) => {
  const pendentes = form.anexosPendentes || [];
  const { anexosPendentes, ...tarefa } = form;
  if (!pendentes.length) return tarefa;

  const d = dados(tarefa);
  const chave = d.chaveAnexos || novaChaveAnexos();
  const novos = await subirAnexos(pendentes, chave);
  pendentes.forEach(p => { try { URL.revokeObjectURL(p.url); } catch (e) {} });

  return { ...tarefa, prospeccao: { ...d, chaveAnexos: chave, anexos: [...d.anexos, ...novos] } };
};

/* ── Ao criar: os ficheiros ficam em memória ───────────────── */
function AnexosPendentes({ pendentes = [], onMudar }) {
  const [aTranscrever, setATranscrever] = useState(null);
  const [erro, setErro] = useState("");
  const [aberta, setAberta] = useState(null);

  // Os previews são URLs de objecto e têm de ser libertados. A
  // lista vai por referência: com `[]` nas dependências, a
  // limpeza via a lista vazia do arranque e não libertava nada.
  const ultima = useRef(pendentes);
  useEffect(() => { ultima.current = pendentes; }, [pendentes]);
  useEffect(() => () => ultima.current.forEach(p => { try { URL.revokeObjectURL(p.url); } catch (e) {} }), []);

  const escolher = (e) => {
    const ficheiros = Array.from(e.target.files || []);
    e.target.value = "";
    if (!ficheiros.length) return;
    onMudar([...pendentes, ...ficheiros.map(f => ({
      ficheiro: f, nome: f.name, tipo: f.type || "application/octet-stream",
      url: URL.createObjectURL(f), transcricao: "", porGravar: true,
    }))]);
  };

  const transcrever = async (i) => {
    setATranscrever(i); setErro("");
    try {
      const p = pendentes[i];
      const texto = await callClaudeDoc(await fileToBase64(p.ficheiro), p.tipo, PROMPT_TRANSCREVER, 2000);
      onMudar(pendentes.map((x, j) => j === i ? { ...x, transcricao: texto } : x));
    } catch (err) { setErro(err.message || "Não foi possível transcrever."); }
    finally { setATranscrever(null); }
  };

  const remover = (i) => {
    try { URL.revokeObjectURL(pendentes[i].url); } catch (e) {}
    onMudar(pendentes.filter((_, j) => j !== i));
  };

  return (
    <div style={{ gridColumn: "1/-1" }}>
      <Cabecalho n={pendentes.length} aCarregar={false} onEscolher={escolher}
        nota={pendentes.length === 0
          ? "O que o contacto já enviou, as notas da chamada, fotografias do bloco. Fica tudo no registo — quem for à reunião encontra-o aqui. Sobem quando gravar."
          : "Ficam anexados assim que gravar."} />
      {erro && <p style={{ fontSize: 12, color: G.red, marginBottom: 10, lineHeight: 1.5 }}>{erro}</p>}
      {pendentes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pendentes.map((p, i) => (
            <CartaoAnexo key={p.url} anexo={p} aTranscrever={aTranscrever === i}
              onVer={() => setAberta(p)} onTranscrever={() => transcrever(i)} onRemover={() => remover(i)} />
          ))}
        </div>
      )}
      {aberta && <Lupa anexo={aberta} onFechar={() => setAberta(null)} />}
    </div>
  );
}

/* ── Já gravada: sobem de imediato ─────────────────────────── */
function AnexosGuardados({ tarefa, onMudar }) {
  const [aCarregar, setACarregar] = useState(false);
  const [aTranscrever, setATranscrever] = useState(null);
  const [erro, setErro] = useState("");
  const [aberta, setAberta] = useState(null);
  const d = dados(tarefa);
  const anexos = d.anexos;

  const guardar = (lista, extra = {}) => onMudar({ prospeccao: { ...d, ...extra, anexos: lista } });

  const escolher = async (e) => {
    const ficheiros = Array.from(e.target.files || []);
    e.target.value = "";
    if (!ficheiros.length) return;
    setACarregar(true); setErro("");
    try {
      const chave = d.chaveAnexos || novaChaveAnexos();
      const novos = await subirAnexos(
        ficheiros.map(f => ({ ficheiro: f, nome: f.name, tipo: f.type || "application/octet-stream" })), chave);
      await guardar([...anexos, ...novos], { chaveAnexos: chave });
    } catch (err) {
      setErro(err.message?.includes("Bucket not found")
        ? "Falta criar o bucket `notas-reunioes` na Supabase (Storage → New bucket, público)."
        : err.message || "Não foi possível anexar.");
    } finally { setACarregar(false); }
  };

  const transcrever = async (anexo, i) => {
    setATranscrever(i); setErro("");
    try {
      const resp = await fetch(anexo.url);
      if (!resp.ok) throw new Error("Não foi possível ler o ficheiro.");
      const blob = await resp.blob();
      const tipo = anexo.tipo || blob.type || "image/jpeg";
      const texto = await callClaudeDoc(
        await fileToBase64(new File([blob], anexo.nome || "nota", { type: tipo })), tipo, PROMPT_TRANSCREVER, 2000);
      await guardar(anexos.map((x, j) => j === i ? { ...x, transcricao: texto } : x));
    } catch (err) { setErro(err.message || "Não foi possível transcrever."); }
    finally { setATranscrever(null); }
  };

  const remover = async (anexo, i) => {
    if (!confirm("Eliminar este anexo?")) return;
    try {
      await guardar(anexos.filter((_, j) => j !== i));
      await deleteNotaReuniao(anexo.url);
    } catch (err) { setErro(err.message || "Não foi possível eliminar."); }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <Cabecalho n={anexos.length} aCarregar={aCarregar} onEscolher={escolher}
        nota={anexos.length === 0
          ? "Documentação recebida, notas da chamada, fotografias do bloco. Cada ficheiro pode ser transcrito — a letra fica na imagem, o texto fica pesquisável."
          : null} />
      {erro && <p style={{ fontSize: 12, color: G.red, marginBottom: 10, lineHeight: 1.5 }}>{erro}</p>}
      {anexos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {anexos.map((a, i) => (
            <CartaoAnexo key={a.url} anexo={a} aTranscrever={aTranscrever === i}
              onVer={() => setAberta(a)} onTranscrever={() => transcrever(a, i)} onRemover={() => remover(a, i)} />
          ))}
        </div>
      )}
      {aberta && <Lupa anexo={aberta} onFechar={() => setAberta(null)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAMPOS NO FORMULÁRIO DA TAREFA
   ═══════════════════════════════════════════════════════════ */
/** Toma o lugar do dropdown de Cliente: aqui o nome escreve-se. */
export function CamposContacto({ form, setForm, user }) {
  const d = dados(form);
  const por = (k) => ({
    value: d[k] || "",
    onChange: (e) => setForm(p => ({ ...p, prospeccao: { ...dados(p), [k]: e.target.value } })),
  });

  // Quem cria fica registado à nascença e não volta a mudar.
  useEffect(() => {
    if (!form.prospeccao?.criadoPorId && user?.id) {
      setForm(p => ({ ...p, prospeccao: { ...prospeccaoVazia(user), ...dados(p), criadoPorId: String(user.id), criadoPor: user.nome || "" } }));
    }
  }, []);

  return (
    <>
      <div style={{ gridColumn: "1/-1", marginTop: 2 }}>
        <p style={{ fontSize: 11, color: G.gold1, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 5 }}>Contacto</p>
        <p style={{ fontSize: 11.5, color: G.textDim, lineHeight: 1.5 }}>
          Escrito à mão — ainda não é cliente, por isso não há lista por onde o escolher.
        </p>
      </div>
      <Campo etiqueta="Nome *"><Texto {...por("contactoNome")} placeholder="Nome da pessoa ou empresa" /></Campo>
      <Campo etiqueta="Telefone"><Texto {...por("contactoTelefone")} placeholder="912 345 678" /></Campo>
      <Campo etiqueta="E-mail"><Texto {...por("contactoEmail")} placeholder="nome@exemplo.pt" /></Campo>
      <Campo etiqueta="Origem"><Texto {...por("origem")} placeholder="Quem indicou, de onde veio" /></Campo>
    </>
  );
}

/** Preparação e anexos: vão para o fim, depois do quando e do onde. */
export function CamposPreparacao({ form, setForm }) {
  const d = dados(form);
  return (
    <>
      <Campo etiqueta="Preparação — o que vou propor, o que quero saber" largo>
        <Area rows={4} value={d.preparacao || ""}
          onChange={(e) => setForm(p => ({ ...p, prospeccao: { ...dados(p), preparacao: e.target.value } }))}
          placeholder="Pontos a levar, perguntas a fazer, o que é preciso confirmar…" />
      </Campo>
      <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${G.border}`, paddingTop: 12, marginTop: 2 }}>
        <AnexosPendentes pendentes={form.anexosPendentes || []}
          onMudar={(lista) => setForm(p => ({ ...p, anexosPendentes: lista }))} />
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MUDAR SITUAÇÃO
   ═══════════════════════════════════════════════════════════ */
function MudarSituacao({ tarefa, user, onFeito, onCancelar }) {
  const [alvo, setAlvo] = useState("realizada");
  const [texto, setTexto] = useState("");
  const [novaData, setNovaData] = useState(tarefa.data || "");
  const [novaHora, setNovaHora] = useState(tarefa.hora || "");
  const [erro, setErro] = useState("");
  const [aGravar, setAGravar] = useState(false);

  const etiquetas = {
    realizada:  "O que se passou — desenvolvimento da reunião",
    reagendada: "Porque foi reagendada",
    desistiu:   "Porque desistiu",
  };

  const aplicar = async () => {
    setErro(""); setAGravar(true);
    try { await onFeito(mudarEstado(tarefa, alvo, { texto, novaData, novaHora, por: user?.nome || "" })); }
    catch (e) { setErro(e.message || "Não foi possível guardar."); }
    finally { setAGravar(false); }
  };

  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${G.border}`, paddingTop: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {["realizada", "reagendada", "desistiu"].map(id => {
          const cor = G[corEstado(id)] || G.blue;
          const on = alvo === id;
          return (
            <button key={id} type="button" onClick={() => setAlvo(id)} style={{
              padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
              fontFamily: "'DM Sans',sans-serif",
              background: on ? `${cor}20` : "transparent",
              border: `1px solid ${on ? cor : G.border}`, color: on ? cor : G.textMuted,
            }}>{nomeEstado(id)}</button>
          );
        })}
      </div>

      {alvo === "reagendada" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <Campo etiqueta="Nova data *"><Texto type="date" value={novaData} onChange={e => setNovaData(e.target.value)} /></Campo>
          <Campo etiqueta="Nova hora"><Texto type="time" value={novaHora} onChange={e => setNovaHora(e.target.value)} /></Campo>
          <p style={{ gridColumn: "1/-1", fontSize: 11.5, color: G.textDim, lineHeight: 1.5 }}>
            A tarefa passa para a nova data e volta a ficar por fazer. A data antiga e o motivo ficam no histórico.
          </p>
        </div>
      )}

      <Campo etiqueta={`${etiquetas[alvo]} *`} largo>
        <Area rows={5} value={texto} onChange={e => setTexto(e.target.value)}
          placeholder={alvo === "realizada"
            ? "O que foi dito, o que ficou combinado, próximos passos…"
            : "Em poucas palavras, o que levou a isto."} />
      </Campo>

      {alvo === "realizada" && (
        <p style={{ fontSize: 11.5, color: G.textDim, marginTop: 10, lineHeight: 1.5 }}>
          Depois de marcada como realizada, fica disponível o botão para promover o contacto a lead.
        </p>
      )}

      {erro && <p style={{ fontSize: 12, color: G.red, marginTop: 12, lineHeight: 1.5 }}>{erro}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <button type="button" className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="btn-gold" onClick={aplicar} disabled={aGravar}>{aGravar ? "A guardar…" : "Guardar"}</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROMOVER A LEAD
   ═══════════════════════════════════════════════════════════ */
function PromoverLead({ tarefa, onFeito, onCancelar }) {
  const [destino, setDestino] = useState(LEADS[0].id);
  const [erro, setErro] = useState("");
  const [aGravar, setAGravar] = useState(false);
  const d = dados(tarefa);

  const promover = async () => {
    setErro(""); setAGravar(true);
    try {
      const alvo = LEADS.find(l => l.id === destino);
      const criada = await alvo.db.insert(comoLead(tarefa));
      await onFeito({ prospeccao: { ...d, leadTabela: destino, leadId: criada?.id ? String(criada.id) : null, promovidaEm: new Date().toISOString() } });
    } catch (e) { setErro(e.message || "Não foi possível criar a lead."); }
    finally { setAGravar(false); }
  };

  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${G.border}`, paddingTop: 16 }}>
      <p style={{ fontSize: 13, color: G.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
        O contacto <strong style={{ color: G.text }}>{d.contactoNome}</strong> passa ao Funil com o que já se sabe
        dele: telefone, e-mail, origem e o desenvolvimento da reunião.
      </p>
      <Campo etiqueta="Em que vertente" largo>
        <select value={destino} onChange={e => setDestino(e.target.value)} style={entrada}>
          {LEADS.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </Campo>
      {erro && <p style={{ fontSize: 12, color: G.red, marginTop: 12, lineHeight: 1.5 }}>{erro}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <button type="button" className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="btn-gold" onClick={promover} disabled={aGravar}>{aGravar ? "A promover…" : "Promover a lead"}</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BLOCO NA FICHA DA TAREFA
   ═══════════════════════════════════════════════════════════ */
export function BlocoProspeccao({ tarefa, user, onMudar, mob }) {
  const [painel, setPainel] = useState(null);
  const d = dados(tarefa);
  const rasto = historicoLegivel(tarefa);

  const aplicar = async (campos) => { await onMudar(campos); setPainel(null); };

  return (
    <div style={{ marginTop: 18, borderTop: `1px solid ${G.border}`, paddingTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12, flexWrap: "wrap" }}>
        <p style={{ fontSize: 11, color: G.gold1, textTransform: "uppercase", letterSpacing: ".3px" }}>Prospecção</p>
        <Pastilha estado={d.estado} />
        {d.leadId && <span style={{ fontSize: 10, background: `${G.green}20`, color: G.green, padding: "2px 9px", borderRadius: 10, fontWeight: 600, textTransform: "uppercase" }}>Lead criada</span>}
      </div>

      <div style={{ background: G.surface2, borderRadius: 9, padding: "13px 15px", marginBottom: 10 }}>
        <p style={{ fontSize: 10, color: G.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".3px" }}>Contacto</p>
        <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{d.contactoNome || "—"}</p>
        <p style={{ fontSize: 12.5, color: G.textMuted, lineHeight: 1.6 }}>
          {[d.contactoTelefone, d.contactoEmail].filter(Boolean).join(" · ") || "sem contactos registados"}
          {d.origem && <><br /><span style={{ color: G.textDim }}>Origem: {d.origem}</span></>}
        </p>
      </div>

      {d.criadoPor && (
        <p style={{ fontSize: 11.5, color: G.textDim, marginBottom: 12 }}>
          Marcada por {d.criadoPor}
          {tarefa.atribuidoA && tarefa.atribuidoA !== d.criadoPor ? ` · vai ${tarefa.atribuidoA}` : ""}
        </p>
      )}

      {d.preparacao && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: G.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".3px" }}>Preparação</p>
          <p style={{ fontSize: 13, color: G.textMuted, lineHeight: 1.7, background: G.surface2, padding: "12px 14px", borderRadius: 8, ...PRE_WRAP }}>{d.preparacao}</p>
        </div>
      )}

      {d.desfecho && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: G.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".3px" }}>
            {d.estado === "desistiu" ? "Motivo da desistência" : "Desenvolvimento"}
          </p>
          <p style={{ fontSize: 13, color: G.textMuted, lineHeight: 1.7, background: G.surface2, padding: "12px 14px", borderRadius: 8, ...PRE_WRAP }}>{d.desfecho}</p>
        </div>
      )}

      {rasto.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: G.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".3px" }}>Histórico</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {rasto.map((h, i) => (
              <div key={i} style={{ fontSize: 12, color: G.textMuted, lineHeight: 1.6, paddingLeft: 12, borderLeft: `2px solid ${G.border}` }}>
                <span style={{ color: G.text, fontWeight: 500 }}>{h.rotulo}</span>
                <span style={{ color: G.textDim }}> · {quando(h.em)}{h.por ? ` · ${h.por}` : ""}</span>
                {h.motivo && !h.repetido && <><br /><span style={PRE_WRAP}>{h.motivo}</span></>}
              </div>
            ))}
          </div>
        </div>
      )}

      <AnexosGuardados tarefa={tarefa} onMudar={onMudar} />

      {painel === "estado"   && <MudarSituacao tarefa={tarefa} user={user} onFeito={aplicar} onCancelar={() => setPainel(null)} />}
      {painel === "promover" && <PromoverLead  tarefa={tarefa} onFeito={aplicar} onCancelar={() => setPainel(null)} />}

      {!painel && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <button type="button" className="btn-gold" onClick={() => setPainel("estado")} style={{ flex: mob ? "1 1 100%" : 1 }}>
            {estaFechada(tarefa) ? "Mudar situação" : "Registar o que aconteceu"}
          </button>
          {podePromover(tarefa) && (
            <button type="button" className="btn-ghost" onClick={() => setPainel("promover")} style={{ borderColor: G.green, color: G.green, flex: mob ? 1 : "none" }}>
              Promover a lead
            </button>
          )}
        </div>
      )}
    </div>
  );
}
