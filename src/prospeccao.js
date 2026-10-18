/* ═══════════════════════════════════════════════════════════
   PROSPECÇÃO — regras puras

   Uma reunião de prospecção é uma TAREFA de tipo 'Prospecção'.
   O que lhe é próprio — contacto, preparação, desfecho,
   histórico, anexos — vive em `tarefa.prospeccao`.

   Assim herda de graça o que as tarefas já têm: calendário,
   .ics, filtros, contadores, atribuição e assumir.

   Sem React e sem base de dados, para se poder testar.

   Quatro situações:
     agendada   — ainda vai acontecer
     realizada  — aconteceu; regista-se o desenvolvimento
     reagendada — passou para outra data; regista-se o motivo
     desistiu   — não vai acontecer; regista-se o motivo

   Reagendar NÃO é um estado final: a reunião volta a ficar
   aberta, noutra data. Por isso o motivo vai para o histórico e
   não para um campo — uma reunião adiada duas vezes apagaria o
   primeiro motivo.
   ═══════════════════════════════════════════════════════════ */

export const TIPO_PROSPECCAO = "Prospecção";

export const ESTADOS_REUNIAO = [
  { id: "agendada",   nome: "Agendada",   cor: "blue"  },
  { id: "realizada",  nome: "Realizada",  cor: "green" },
  { id: "reagendada", nome: "Reagendada", cor: "gold1" },
  { id: "desistiu",   nome: "Desistiu",   cor: "red"   },
];

export const nomeEstado = (e) => ESTADOS_REUNIAO.find(x => x.id === e)?.nome || "Agendada";
export const corEstado  = (e) => ESTADOS_REUNIAO.find(x => x.id === e)?.cor  || "blue";

/** É uma tarefa de prospecção? */
export const ehProspeccao = (t) => t?.tipo === TIPO_PROSPECCAO || !!t?.prospeccao;

/** O bloco de prospecção, sempre com forma utilizável. */
export const dados = (t) => ({
  contactoNome: "", contactoTelefone: "", contactoEmail: "", origem: "",
  preparacao: "", desfecho: "", estado: "agendada",
  historico: [], anexos: [],
  criadoPorId: null, criadoPor: "",
  leadTabela: null, leadId: null, promovidaEm: null,
  ...(t?.prospeccao || {}),
});

export const estado = (t) => dados(t).estado;
export const estaFechada = (t) => ["realizada", "desistiu"].includes(estado(t));
export const estaAberta  = (t) => !estaFechada(t);

/** Só uma reunião realizada vira lead — não se promove uma conversa que não houve. */
export const podePromover = (t) => {
  const d = dados(t);
  return d.estado === "realizada" && !d.leadId;
};

/** O que se pede ao mudar para cada estado. */
export const PEDE_TEXTO = {
  realizada:  { etiqueta: "O que se passou",       obrigatorio: true },
  reagendada: { etiqueta: "Porque foi reagendada", obrigatorio: true },
  desistiu:   { etiqueta: "Porque desistiu",       obrigatorio: true },
  agendada:   null,
};

/** Uma tarefa de prospecção nova, pronta para o formulário. */
export const prospeccaoVazia = (user) => ({
  contactoNome: "", contactoTelefone: "", contactoEmail: "", origem: "",
  preparacao: "", desfecho: "", estado: "agendada",
  historico: [], anexos: [],
  // Quem criou fica registado à nascença e não volta a mudar.
  criadoPorId: user?.id ? String(user.id) : null,
  criadoPor: user?.nome || "",
  leadTabela: null, leadId: null, promovidaEm: null,
});

/** O mínimo para gravar. Devolve [] quando está em condições. */
export const validar = (t) => {
  const faltas = [];
  if (!String(t?.titulo || "").trim()) faltas.push("assunto");
  if (!String(dados(t).contactoNome || "").trim()) faltas.push("nome do contacto");
  if (!String(t?.data || "").trim()) faltas.push("data");
  return faltas;
};

const diaPt = (d) => String(d || "").split("-").reverse().join("/");

/**
 * Muda o estado e deixa rasto.
 *
 * Devolve os campos a gravar NA TAREFA — não altera o objecto
 * recebido. Para `reagendada` é preciso `novaData`.
 */
export const mudarEstado = (t, novoEstado, { texto = "", novaData = "", novaHora = "", por = "" } = {}) => {
  const pede = PEDE_TEXTO[novoEstado];
  const limpo = String(texto || "").trim();
  if (pede?.obrigatorio && !limpo) {
    throw new Error(`Falta indicar: ${pede.etiqueta.toLowerCase()}.`);
  }
  if (novoEstado === "reagendada" && !String(novaData || "").trim()) {
    throw new Error("Falta a nova data.");
  }

  const d = dados(t);

  // O registo é montado por inteiro antes de entrar no histórico.
  const entrada = {
    em: new Date().toISOString(),
    de: d.estado,
    para: novoEstado,
    motivo: limpo,
    por: por || "",
    ...(novoEstado === "reagendada"
      ? { data_anterior: t?.data || "", hora_anterior: t?.hora || "" }
      : {}),
  };

  // Reagendar não é um estado em que se fique: a reunião volta a
  // estar por acontecer, noutro dia. O "reagendada" fica no rasto.
  const estadoFinal = novoEstado === "reagendada" ? "agendada" : novoEstado;

  const prospeccao = {
    ...d,
    estado: estadoFinal,
    historico: [...d.historico, entrada],
    // O desfecho é o texto de uma reunião que aconteceu ou de uma
    // desistência. Num reagendamento o motivo vive só no histórico.
    ...(novoEstado === "realizada" || novoEstado === "desistiu" ? { desfecho: limpo } : {}),
  };

  const campos = {
    prospeccao,
    // Fechada é o mesmo que concluída: é assim que a Agenda, os
    // contadores e os filtros já sabem lidar com ela.
    concluida: ["realizada", "desistiu"].includes(estadoFinal),
  };

  if (novoEstado === "reagendada") {
    campos.data = novaData;
    if (novaHora) campos.hora = novaHora;
  }

  return campos;
};

/** O rasto, do mais recente para o mais antigo. */
export const historicoLegivel = (t) => {
  const d = dados(t);
  return [...d.historico].reverse().map(h => ({
    ...h,
    rotulo: h.para === "reagendada"
      ? `Reagendada${h.data_anterior ? ` (era ${diaPt(h.data_anterior)}${h.hora_anterior ? " às " + h.hora_anterior : ""})` : ""}`
      : nomeEstado(h.para),
    // Para uma reunião realizada ou desistida, o motivo guardado é
    // o mesmo texto que já está em destaque como Desenvolvimento.
    repetido: h.motivo === d.desfecho && h.motivo !== "",
  }));
};

/** Os campos de uma lead a partir do que a reunião já sabe. */
export const comoLead = (t) => {
  const d = dados(t);
  return {
    nome: d.contactoNome,
    telefone: d.contactoTelefone,
    email: d.contactoEmail,
    estado: "contactado",
    atribuido_a: t?.atribuidoA || "",
    notas: [
      d.origem ? `Origem: ${d.origem}` : "",
      d.desfecho ? `Reunião de ${diaPt(t?.data) || "—"}: ${d.desfecho}` : "",
    ].filter(Boolean).join("\n\n"),
  };
};

/** O que mostrar na linha da Agenda, no lugar do cliente. */
export const legendaLinha = (t) => ehProspeccao(t)
  ? `${dados(t).contactoNome || "sem contacto"} · Prospecção`
  : null;
