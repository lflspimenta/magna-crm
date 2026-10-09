// ── Temas ─────────────────────────────────────────────────────
// Três paletas. Os contrastes de texto foram verificados:
// no tema claro o dourado vivo (#C9A84C) dá 1,96:1 sobre creme —
// ilegível — por isso passa a #7A5C12, que dá 5,36:1.
export const TEMAS = {
  escuro: {
    nome: "Escuro",
    gold1:"#C9A84C", gold2:"#E8C96A", gold3:"#F5E199", goldDark:"#8B6914",
    bg:"#0E0E0F", surface:"#161618", surface2:"#1E1E21", surface3:"#26262B",
    border:"#2E2E33", text:"#F0EDE6", textMuted:"#8A8880", textDim:"#5A5855",
    red:"#E05252", green:"#52C07A", blue:"#5290E0", purple:"#9B72E0",
    sombra:"rgba(0,0,0,.45)", botaoTexto:"#0E0E0F",
  },
  medio: {
    nome: "Intermédio",
    gold1:"#C9A84C", gold2:"#E8C96A", gold3:"#F5E199", goldDark:"#8B6914",
    bg:"#1C1C20", surface:"#24242A", surface2:"#2C2C33", surface3:"#35353D",
    border:"#3E3E47", text:"#F0EDE6", textMuted:"#9A968C", textDim:"#6E6A64",
    red:"#E05252", green:"#52C07A", blue:"#5290E0", purple:"#9B72E0",
    sombra:"rgba(0,0,0,.35)", botaoTexto:"#14141A",
  },
  claro: {
    nome: "Claro",
    gold1:"#7A5C12", gold2:"#8B6914", gold3:"#A6851F", goldDark:"#5C4410",
    bg:"#F3EDE4", surface:"#FBF8F3", surface2:"#FFFFFF", surface3:"#EDE6DA",
    border:"#DDD4C6", text:"#2E2A26", textMuted:"#6B655B", textDim:"#8A8378",
    red:"#C23B3B", green:"#2F7347", blue:"#2F6BB5", purple:"#7049B8",
    sombra:"rgba(60,50,35,.14)", botaoTexto:"#FBF8F3",
  },
};

export const TEMA_GUARDADO = (() => {
  try { const t = localStorage.getItem("magna-tema"); return TEMAS[t] ? t : "escuro"; }
  catch (e) { return "escuro"; }
})();

// Objecto mutável: os estilos inline lêem-no a cada render,
// por isso mudar as propriedades muda a aplicação inteira.
// É a MESMA referência em todos os módulos que o importam.
export const G = { ...TEMAS[TEMA_GUARDADO] };

export const aplicarTema = (id) => {
  if (!TEMAS[id]) return;
  Object.assign(G, TEMAS[id]);
  try { localStorage.setItem("magna-tema", id); } catch (e) {}
};

// ── Permissões ────────────────────────────────────────────────
// Três níveis:
//   agente → consultor. Não vê chat nem comentários.
//   ceo    → sócia. Vê chat e comentários. NÃO gere utilizadores.
//   admin  → administrador. Tudo, incluindo gestão de utilizadores.
export const ROLES = [
  { id: "agente", nome: "Agente" },
  { id: "ceo",    nome: "CEO" },
  { id: "admin",  nome: "Administrador" },
];

export const ehAdmin = (u) => u?.role === "admin";
export const ehSocio = (u) => u?.role === "admin" || u?.role === "ceo";
export const nomeRole = (r) => ROLES.find(x => x.id === r)?.nome || "Agente";
export const corRole  = (r) => r === "admin" ? G.purple : r === "ceo" ? G.gold1 : G.blue;
