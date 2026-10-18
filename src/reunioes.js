/* ═══════════════════════════════════════════════════════════
   REUNIÕES DE PROSPECÇÃO — regras puras

   Sem React e sem base de dados, para se poderem testar.

   Uma reunião tem quatro estados:
     agendada   — ainda vai acontecer
     realizada  — aconteceu; regista-se o desenvolvimento
     reagendada — passou para outra data; regista-se o motivo
     desistiu   — não vai acontecer; regista-se o motivo

   Reagendar NÃO é um estado final: a reunião volta a ficar
   aberta, noutra data. Por isso o motivo do reagendamento vai
   para o histórico e não para um campo — uma reunião adiada
   duas vezes apagaria o primeiro motivo.
   ═══════════════════════════════════════════════════════════ */

export const ESTADOS_REUNIAO = [
  { id: "agendada",   nome: "Agendada",   cor: "blue"  },
  { id: "realizada",  nome: "Realizada",  cor: "green" },
  { id: "reagendada", nome: "Reagendada", cor: "gold1" },
  { id: "desistiu",   nome: "Desistiu",   cor: "red"   },
];

export const nomeEstado = (e) => ESTADOS_REUNIAO.find(x => x.id === e)?.nome || "Agendada";
export const corEstado  = (e) => ESTADOS_REUNIAO.find(x => x.id === e)?.cor  || "blue";

/** Já não está à espera de acontecer. */
export const estaFechada = (r) => r?.estado === "realizada" || r?.estado === "desistiu";

/** Continua no horizonte: por acontecer, ou adiada para nova data. */
export const estaAberta = (r) => !estaFechada(r);

/** Só uma reunião realizada vira lead — não se promove uma conversa que não houve. */
export const podePromover = (r) => r?.estado === "realizada" && !r?.leadId;

/** O que se pede ao mudar para cada estado. */
export const PEDE_TEXTO = {
  realizada:  { campo: "desfecho", etiqueta: "O que se passou",          obrigatorio: true  },
  reagendada: { campo: "motivo",   etiqueta: "Porque foi reagendada",    obrigatorio: true  },
  desistiu:   { campo: "motivo",   etiqueta: "Porque desistiu",          obrigatorio: true  },
  agendada:   null,
};

export const reuniaoVazia = (user, extra = {}) => ({
  titulo: "",
  data: "",
  hora: "10:00",
  local: "",
  contactoNome: "",
  contactoTelefone: "",
  contactoEmail: "",
  origem: "",
  preparacao: "",
  desfecho: "",
  estado: "agendada",
  historico: [],
  notas: [],
  // Quem criou fica registado à nascença e não volta a mudar.
  criadoPorId: user?.id ? String(user.id) : null,
  criadoPor: user?.nome || "",
  // Quem fica com ela começa por ser quem a criou.
  atribuidoId: user?.id ? String(user.id) : null,
  atribuidoA: user?.nome || "",
  ...extra,
});

/** O mínimo para gravar. Devolve [] quando está em condições. */
export const validar = (r) => {
  const faltas = [];
  if (!String(r?.titulo || "").trim()) faltas.push("título");
  if (!String(r?.contactoNome || "").trim()) faltas.push("nome do contacto");
  if (!String(r?.data || "").trim()) faltas.push("data");
  return faltas;
};

/**
 * Muda o estado e deixa rasto.
 *
 * Devolve os campos a gravar — não altera o objecto recebido.
 * Para `reagendada` é preciso `novaData`: a reunião passa a
 * essa data e a anterior fica no histórico.
 */
export const mudarEstado = (r, novoEstado, { texto = "", novaData = "", novaHora = "", por = "" } = {}) => {
  const pede = PEDE_TEXTO[novoEstado];
  const limpo = String(texto || "").trim();
  if (pede?.obrigatorio && !limpo) {
    throw new Error(`Falta indicar: ${pede.etiqueta.toLowerCase()}.`);
  }
  if (novoEstado === "reagendada" && !String(novaData || "").trim()) {
    throw new Error("Falta a nova data.");
  }

  // O registo é montado por inteiro antes de entrar no histórico.
  const entrada = {
    em: new Date().toISOString(),
    de: r?.estado || "agendada",
    para: novoEstado,
    motivo: limpo,
    por: por || "",
    ...(novoEstado === "reagendada"
      ? { data_anterior: r?.data || "", hora_anterior: r?.hora || "" }
      : {}),
  };

  const campos = {
    // Reagendar não é um estado em que se fique: a reunião volta
    // a estar por acontecer, noutro dia. O "reagendada" fica no
    // rasto, que é onde interessa.
    estado: novoEstado === "reagendada" ? "agendada" : novoEstado,
    historico: [...(r?.historico || []), entrada],
  };

  if (novoEstado === "reagendada") {
    campos.data = novaData;
    if (novaHora) campos.hora = novaHora;
  }

  // O desfecho é o texto de uma reunião que aconteceu ou de uma
  // desistência. Num reagendamento o motivo vive só no histórico.
  if (novoEstado === "realizada" || novoEstado === "desistiu") {
    campos.desfecho = limpo;
  }

  return campos;
};

const diaPt = (d) => String(d || "").split("-").reverse().join("/");

/** O rasto, do mais recente para o mais antigo. */
export const historicoLegivel = (r) => [...(r?.historico || [])]
  .reverse()
  .map(h => ({
    ...h,
    // Um reagendamento devolve a reunião a "agendada", por isso o
    // `para` guardado é o que o utilizador escolheu, não o estado final.
    rotulo: h.para === "reagendada"
      ? `Reagendada${h.data_anterior ? ` (era ${diaPt(h.data_anterior)}${h.hora_anterior ? " às " + h.hora_anterior : ""})` : ""}`
      : nomeEstado(h.para),
    // Para uma reunião realizada ou desistida, o motivo guardado é
    // o mesmo texto que já está em destaque como Desenvolvimento.
    // Repeti-lo aqui era lê-lo duas vezes seguidas.
    repetido: h.motivo === (r?.desfecho || "") && h.motivo !== "",
  }));

/** Os campos de uma lead a partir do que a reunião já sabe. */
export const comoLead = (r) => ({
  nome: r?.contactoNome || "",
  telefone: r?.contactoTelefone || "",
  email: r?.contactoEmail || "",
  estado: "contactado",
  atribuido_a: r?.atribuidoA || "",
  notas: [
    r?.origem ? `Origem: ${r.origem}` : "",
    r?.desfecho ? `Reunião de ${r.data || "—"}: ${r.desfecho}` : "",
  ].filter(Boolean).join("\n\n"),
});

/**
 * Uma reunião vista como linha de agenda, para poder aparecer
 * ao lado das tarefas sem a Agenda ter de saber a diferença.
 */
export const comoLinhaAgenda = (r) => ({
  id: `r${r.id}`,
  reuniaoId: r.id,
  ehReuniao: true,
  titulo: r.titulo,
  cliente: r.contactoNome,
  data: r.data,
  hora: r.hora || "",
  tipo: "Reunião",
  prioridade: "Média",
  concluida: estaFechada(r),
  atribuidoId: r.atribuidoId,
  atribuidoA: r.atribuidoA,
  estadoReuniao: r.estado,
});
