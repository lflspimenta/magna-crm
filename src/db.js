import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_KEY;

export const supa = (URL && KEY) ? createClient(URL, KEY) : null;
export const dbReady = !!supa;

// ── Helpers ──────────────────────────────────────────────
const fromDB = (row, mapping) => {
  if (!row) return null;
  const out = { ...row };
  for (const [appKey, dbKey] of Object.entries(mapping || {})) {
    if (dbKey in out) { out[appKey] = out[dbKey]; if (appKey !== dbKey) delete out[dbKey]; }
  }
  return out;
};

const onlyFields = (obj, allowed) => {
  const out = {};
  for (const f of allowed) if (f in obj) out[f] = obj[f];
  return out;
};

const toDB = (obj, mapping, allowed) => {
  const out = { ...obj };
  for (const [appKey, dbKey] of Object.entries(mapping || {})) {
    if (appKey in out) { out[dbKey] = out[appKey]; if (appKey !== dbKey) delete out[appKey]; }
  }
  return onlyFields(out, allowed);
};

// ── Campos válidos por tabela ────────────────────────────
const F_IMOVEIS = ['titulo','tipo','finalidade','status','valor','area','quartos','casas_banho','bairro','distrito','concelho','cidade','freguesia','foto','fotos','descricao','destaque','publicado','proprietario_id'];
const F_CLIENTES = ['nome','email','telefone','interesse','orcamento','temperatura','bairros','tipologia','obs'];
const F_TAREFAS = ['titulo','cliente','data','hora','tipo','prioridade','concluida','local','notas'];
const F_ANGARIACOES = ['prop_nome','prop_nif','prop_email','prop_telefone','prop_morada','tipo','finalidade','valor','area','quartos','casas_banho','descricao','morada','distrito','concelho','freguesia','cidade','tipo_mandato','comissao','prazo','data_inicio','estado','sig_prop','sig_agente','proprietario_id'];
const F_UTILIZADORES = ['email','password','nome','cargo','avatar','role'];
const F_PROPRIETARIOS = ['nome','nif','email','telefone','morada','notas','estado'];
const F_DOCS_PROP = ['proprietario_id','imovel_id','tipo','nome_ficheiro','url','validade','notas','dados_extraidos'];
const F_VISITAS = ['imovel_id','imovel_titulo','cliente_nome','cliente_nif','cliente_contacto','data','hora','agente_nome','notas','sig_cliente','sig_agente'];
const F_LEADS_GESTAO = ['nome','telefone','email','localizacao','tipologia','situacao_atual','modalidade','notas','estado','atribuido_a'];
const F_LEADS_AQUISICAO = ['nome','telefone','email','zona_interesse','orcamento','finalidade','tipo_reuniao','notas','estado','atribuido_a'];
const F_LEADS_HABITAR = ['nome','telefone','email','servico_interesse','descricao','notas','estado','atribuido_a'];

// ── Mappings ─────────────────────────────────────────────
const M_IMOVEIS = { casasBanho: 'casas_banho' };
const M_VISITAS = { imovelId: 'imovel_id', imovelTitulo: 'imovel_titulo', clienteNome: 'cliente_nome', clienteNif: 'cliente_nif', clienteContacto: 'cliente_contacto', agenteNome: 'agente_nome', sigCliente: 'sig_cliente', sigAgente: 'sig_agente' };
const M_DOCS = { proprietarioId: 'proprietario_id', imovelId: 'imovel_id', nomeFicheiro: 'nome_ficheiro', dadosExtraidos: 'dados_extraidos' };
const M_ANG = { propNome: 'prop_nome', propNif: 'prop_nif', propEmail: 'prop_email', propTelefone: 'prop_telefone', propMorada: 'prop_morada', casasBanho: 'casas_banho', tipoMandato: 'tipo_mandato', dataInicio: 'data_inicio', sigProp: 'sig_prop', sigAgente: 'sig_agente' };

function makeCRUD(table, mapping, allowed, opts = {}) {
  const orderBy = opts.orderBy || 'created_at';
  const ascending = opts.ascending ?? false;
  return {
    async list() { if (!supa) return []; const { data, error } = await supa.from(table).select('*').order(orderBy, { ascending }); if (error) { console.error(table, error); return []; } return (data || []).map(r => fromDB(r, mapping)); },
    async insert(item) { if (!supa) return null; const payload = toDB(item, mapping, allowed); const { data, error } = await supa.from(table).insert(payload).select().single(); if (error) throw new Error(error.message); return fromDB(data, mapping); },
    async update(id, item) { if (!supa) return null; const payload = toDB(item, mapping, allowed); const { data, error } = await supa.from(table).update(payload).eq('id', id).select().single(); if (error) throw new Error(error.message); return fromDB(data, mapping); },
    async remove(id) { if (!supa) return; const { error } = await supa.from(table).delete().eq('id', id); if (error) throw new Error(error.message); },
  };
}

export const dbImoveis = makeCRUD('imoveis', M_IMOVEIS, F_IMOVEIS);
export const dbClientes = makeCRUD('clientes', {}, F_CLIENTES);
export const dbTarefas = makeCRUD('tarefas', {}, F_TAREFAS, { orderBy: 'data', ascending: true });
export const dbAngariacoes = makeCRUD('angariacoes', M_ANG, F_ANGARIACOES);
export const dbProprietarios = makeCRUD('proprietarios', {}, F_PROPRIETARIOS);
export const dbDocsProprietario = makeCRUD('documentos_proprietario', M_DOCS, F_DOCS_PROP);
export const dbVisitas = makeCRUD('visitas', M_VISITAS, F_VISITAS);
export const dbLeadsGestao = makeCRUD('leads_gestao', {}, F_LEADS_GESTAO);
export const dbLeadsAquisicao = makeCRUD('leads_aquisicao', {}, F_LEADS_AQUISICAO);
export const dbLeadsHabitar = makeCRUD('leads_habitar', {}, F_LEADS_HABITAR);

export const dbUtilizadores = {
  async signIn(email, password) { const { data, error } = await supa.auth.signInWithPassword({ email, password }); if (error) throw new Error(error.message); const profile = await dbUtilizadores.getProfile(data.user.id); return { ...data.user, ...profile, authId: data.user.id }; },
  async signOut() { await supa.auth.signOut(); },
  async getSession() { const { data: { session } } = await supa.auth.getSession(); if (!session) return null; const profile = await dbUtilizadores.getProfile(session.user.id); return { ...session.user, ...profile, authId: session.user.id }; },
  async resetPassword(email) { const { error } = await supa.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/?reset=true' }); if (error) throw new Error(error.message); },
  async updatePassword(newPassword) { const { error } = await supa.auth.updateUser({ password: newPassword }); if (error) throw new Error(error.message); },
  async getProfile(authId) { const { data } = await supa.from('utilizadores').select('*').eq('auth_id', authId).maybeSingle(); return data; },
  async list() { const { data } = await supa.from('utilizadores').select('*'); return data || []; },
  async create({ email, password, nome, cargo, avatar, role }) { const { data, error } = await supa.auth.signUp({ email, password, options: { data: { nome, cargo } } }); if (error) throw new Error(error.message); const { data: created } = await supa.from('utilizadores').insert({ auth_id: data.user.id, email, nome, cargo, avatar, role }).select().single(); return created; },
  async updateProfile(id, payload) { const { data, error } = await supa.from('utilizadores').update(payload).eq('id', id).select().single(); if (error) throw new Error(error.message); return data; },
  async remove(id) { await supa.from('utilizadores').delete().eq('id', id); }
};

export async function uploadFoto(file) {
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.name.split('.').pop()}`;
  const { error } = await supa.storage.from('fotos-imoveis').upload(name, file);
  if (error) throw new Error(error.message);
  return supa.storage.from('fotos-imoveis').getPublicUrl(name).data.publicUrl;
}
export async function deleteFoto(url) { const path = url.split('/').pop(); await supa.storage.from('fotos-imoveis').remove([path]); }
export async function deleteFotos(urls) { const paths = urls.map(u => u.split('/').pop()); await supa.storage.from('fotos-imoveis').remove(paths); }
export async function uploadDocumento(file, pid) {
  const name = `${pid}/${Date.now()}-${file.name}`;
  const { error } = await supa.storage.from('documentos-proprietarios').upload(name, file);
  if (error) throw new Error(error.message);
  return supa.storage.from('documentos-proprietarios').getPublicUrl(name).data.publicUrl;
}
export async function deleteDocumento(url) { const path = url.split('/').pop(); await supa.storage.from('documentos-proprietarios').remove([path]); }