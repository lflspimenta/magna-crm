/* ═══════════════════════════════════════════════════════════
   ATRIBUIÇÃO DE TAREFAS — regras puras

   Separado do App.jsx para se poder testar sem montar o ecrã
   inteiro. Sem React e sem base de dados: só as regras.

   Uma tarefa sem `atribuidoId` está por atribuir — qualquer
   pessoa a pode assumir. Dar a outra pessoa é só da direcção.
   ═══════════════════════════════════════════════════════════ */

export const SEM_DONO = "";

export const temDono = (t) => !!t?.atribuidoId;

export const eMinha = (t, u) =>
  temDono(t) && !!u?.id && String(t.atribuidoId) === String(u.id);

export const donoDe = (t) => t?.atribuidoA || "Por atribuir";

export const primeiroNome = (n) => String(n || "").trim().split(" ")[0] || "—";

/** Campos a gravar para pôr (ou tirar) uma tarefa a alguém. */
export const camposDono = (pessoa) => pessoa?.id
  ? { atribuidoId: String(pessoa.id), atribuidoA: pessoa.nome || SEM_DONO }
  : { atribuidoId: null, atribuidoA: SEM_DONO };

/** Uma tarefa nova nasce de quem a cria. */
export const novaTarefaDe = (base, u, extra = {}) => ({
  ...base,
  ...camposDono(u),
  ...extra,
});

/**
 * Os dois filtros da Agenda cruzam-se:
 *   estado → "Todas" | "Pendentes" | "Concluídas"
 *   quem   → "minhas" | "livres" | "todos"
 */
export const filtrarTarefas = (tarefas = [], { estado = "Todas", quem = "todos", user } = {}) =>
  tarefas
    .filter(t => estado === "Todas" ? true : estado === "Pendentes" ? !t.concluida : !!t.concluida)
    .filter(t => quem === "todos" ? true : quem === "livres" ? !temDono(t) : eMinha(t, user));

/** Os números do cabeçalho e do menu. */
export const contarTarefas = (tarefas = [], user) => {
  const porFazer = tarefas.filter(t => !t.concluida);
  return {
    minhas: porFazer.filter(t => eMinha(t, user)).length,
    total:  porFazer.length,
    livres: porFazer.filter(t => !temDono(t)).length,
  };
};
