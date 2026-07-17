// src/db.js — Cliente Supabase + funções de leitura/escrita
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_KEY;

export const supa = (URL && KEY) ? createClient(URL, KEY) : null;
export const dbReady = !!supa;

// ── Helpers ──────────────────────────────────────────────
// Converte snake_case da BD para camelCase usado no app
const fromDB = (row, mapping) => {
  if (!row) return null;
  const out = { ...row };
  for (const [appKey, dbKey] of Object.entries(mapping || {})) {
    if (dbKey in out) {
      out[appKey] = out[dbKey];
      if (appKey !== dbKey) delete out[dbKey];
    }
  }
  return out;
};

// Filtra um objecto deixando só os campos permitidos
const onlyFields = (obj, allowed) => {
  const out = {};
  for (const f of allowed) if (f in obj) out[f] = obj[f];
  return out;
};

// Converte appKey -> dbKey e filtra campos não permitidos
const toDB = (obj, mapping, allowed) => {
  const out = { ...obj };
  for (const [appKey, dbKey] of Object.entries(mapping || {})) {
    if (appKey in out) {
      out[dbKey] = out[appKey];
      if (appKey !== dbKey) delete out[appKey];
    }
  }
  return onlyFields(out, allowed);
};

// ── Campos válidos por tabela (snake_case) ──────────────
const F_IMOVEIS = ['titulo','tipo','finalidade','status','valor','area','quartos','casas_banho','bairro','distrito','concelho','cidade','freguesia','foto','fotos','descricao','destaque','proprietario_id'];
const F_CLIENTES = ['nome','email','telefone','interesse','orcamento','temperatura','bairros','tipologia','obs'];
const F_TAREFAS = ['titulo','cliente','data','hora','tipo','prioridade','concluida','local','notas'];
const F_ANGARIACOES = ['prop_nome','prop_nif','prop_email','prop_telefone','prop_morada','tipo','finalidade','valor','area','quartos','casas_banho','descricao','morada','distrito','concelho','freguesia','cidade','tipo_mandato','comissao','prazo','data_inicio','estado','sig_prop','sig_agente','proprietario_id'];
const F_UTILIZADORES = ['email','password','nome','cargo','avatar','role'];
const F_PROPRIETARIOS = ['nome','nif','email','telefone','morada','notas','estado'];
const F_DOCS_PROP = ['proprietario_id','imovel_id','tipo','nome_ficheiro','url','validade','notas','dados_extraidos'];
const F_VISITAS = ['imovel_id','imovel_titulo','cliente_nome','cliente_nif','cliente_contacto','data','hora','agente_nome','notas','sig_cliente','sig_agente'];

// ── Mappings appKey -> dbKey ─────────────────────────────
const M_IMOVEIS = { casasBanho: 'casas_banho' };
const M_VISITAS = {
  imovelId: 'imovel_id', imovelTitulo: 'imovel_titulo',
  clienteNome: 'cliente_nome', clienteNif: 'cliente_nif', clienteContacto: 'cliente_contacto',
  agenteNome: 'agente_nome', sigCliente: 'sig_cliente', sigAgente: 'sig_agente',
};
const M_DOCS = {
  proprietarioId: 'proprietario_id', imovelId: 'imovel_id',
  nomeFicheiro: 'nome_ficheiro', dadosExtraidos: 'dados_extraidos',
};
const M_ANG = {
  propNome: 'prop_nome', propNif: 'prop_nif', propEmail: 'prop_email',
  propTelefone: 'prop_telefone', propMorada: 'prop_morada',
  casasBanho: 'casas_banho', tipoMandato: 'tipo_mandato',
  dataInicio: 'data_inicio', sigProp: 'sig_prop', sigAgente: 'sig_agente',
};

// ── Genérico CRUD ─────────────────────────────────────────
function makeCRUD(table, mapping, allowed, opts = {}) {
  const orderBy = opts.orderBy || 'created_at';
  const ascending = opts.ascending ?? false;
  return {
    async list() {
      if (!supa) return [];
      const { data, error } = await supa.from(table).select('*').order(orderBy, { ascending });
      if (error) { console.error(`list ${table}:`, error); return []; }
      return (data || []).map(r => fromDB(r, mapping));
    },
    async insert(item) {
      if (!supa) return null;
      const payload = toDB(item, mapping, allowed);
      const { data, error } = await supa.from(table).insert(payload).select().single();
      if (error) { console.error(`insert ${table}:`, error); throw new Error(error.message); }
      return fromDB(data, mapping);
    },
    async update(id, item) {
      if (!supa) return null;
      const payload = toDB(item, mapping, allowed);
      const { data, error } = await supa.from(table).update(payload).eq('id', id).select().single();
      if (error) { console.error(`update ${table}:`, error); throw new Error(error.message); }
      return fromDB(data, mapping);
    },
    async remove(id) {
      if (!supa) return;
      const { error } = await supa.from(table).delete().eq('id', id);
      if (error) { console.error(`delete ${table}:`, error); throw new Error(error.message); }
    },
  };
}

// ── Exports CRUD ──────────────────────────────────────────
export const dbImoveis = makeCRUD('imoveis', M_IMOVEIS, F_IMOVEIS);
export const dbClientes = makeCRUD('clientes', {}, F_CLIENTES);
export const dbTarefas = makeCRUD('tarefas', {}, F_TAREFAS, { orderBy: 'data', ascending: true });
export const dbAngariacoes = makeCRUD('angariacoes', M_ANG, F_ANGARIACOES);
export const dbProprietarios = makeCRUD('proprietarios', {}, F_PROPRIETARIOS);
export const dbDocsProprietario = makeCRUD('documentos_proprietario', M_DOCS, F_DOCS_PROP);
export const dbVisitas = makeCRUD('visitas', M_VISITAS, F_VISITAS);

// ── UTILIZADORES via Supabase Auth ────────────────────────
// Dados do perfil (nome, cargo, avatar, role) vivem na tabela 'utilizadores'
// ligada ao auth.users por user_id
export const dbUtilizadores = {
  // Login com e-mail e password reais
  async signIn(email, password) {
    if (!supa) throw new Error('Supabase não configurado');
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // Carregar o perfil (nome, cargo, etc) da tabela utilizadores
    const profile = await dbUtilizadores.getProfile(data.user.id);
    return { ...data.user, ...profile, authId: data.user.id };
  },

  // Logout
  async signOut() {
    if (!supa) return;
    await supa.auth.signOut();
  },

  // Recuperar sessão (chamado no arranque da app)
  async getSession() {
    if (!supa) return null;
    const { data: { session } } = await supa.auth.getSession();
    if (!session) return null;
    const profile = await dbUtilizadores.getProfile(session.user.id);
    return { ...session.user, ...profile, authId: session.user.id };
  },

  // Recuperar password — envia email com link
  async resetPassword(email) {
    if (!supa) throw new Error('Supabase não configurado');
    const { error } = await supa.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/?reset=true',
    });
    if (error) throw new Error(error.message);
  },

  // Atualizar password (após clicar no link de recuperação)
  async updatePassword(newPassword) {
    if (!supa) throw new Error('Supabase não configurado');
    const { error } = await supa.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  // ── Gestão de perfis (tabela utilizadores) ──
  async getProfile(authId) {
    if (!supa) return null;
    const { data } = await supa.from('utilizadores').select('*').eq('auth_id', authId).maybeSingle();
    return data;
  },

  async list() {
    if (!supa) return [];
    const { data, error } = await supa.from('utilizadores').select('*').order('created_at', { ascending: true });
    if (error) { console.error('list utilizadores:', error); return []; }
    return data || [];
  },

  // Criar novo utilizador completo (Auth + perfil) — só admin
  async create({ email, password, nome, cargo, avatar, role }) {
    if (!supa) throw new Error('Supabase não configurado');
    // 1. Criar conta no Auth via signUp (cliente browser não tem permissão admin)
    const { data, error } = await supa.auth.signUp({
      email, password,
      options: { data: { nome, cargo } }
    });
    if (error) throw new Error(error.message);
    // 2. Criar perfil na tabela utilizadores
    const profile = { auth_id: data.user.id, email, nome, cargo, avatar, role };
    const { data: created, error: profErr } = await supa.from('utilizadores').insert(profile).select().single();
    if (profErr) { console.error('create profile:', profErr); throw new Error(profErr.message); }
    return created;
  },

  async updateProfile(id, payload) {
    if (!supa) return null;
    const allowed = ['nome', 'cargo', 'avatar', 'role'];
    const p = {};
    for (const k of allowed) if (k in payload) p[k] = payload[k];
    const { data, error } = await supa.from('utilizadores').update(p).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async remove(id) {
    if (!supa) return;
    // Apaga só o perfil; o auth.user fica (só admin pode apagar via API admin)
    const { error } = await supa.from('utilizadores').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ── STORAGE: Fotos de imóveis ─────────────────────────────
const BUCKET = 'fotos-imoveis';

// Faz upload de um File (do <input type="file">) e devolve o URL público
export async function uploadFoto(file) {
  if (!supa) throw new Error('Supabase não configurado');
  if (!file) throw new Error('Ficheiro inválido');
  // Nome único: timestamp + random + extensão original
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supa.storage.from(BUCKET).upload(name, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });
  if (error) { console.error('upload foto:', error); throw new Error(error.message); }
  // Devolver URL público
  const { data } = supa.storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

// Apaga uma foto do bucket dado o seu URL público
export async function deleteFoto(url) {
  if (!supa || !url) return;
  // Extrair o caminho do ficheiro do URL público
  // URL formato: https://<proj>.supabase.co/storage/v1/object/public/fotos-imoveis/<nome>
  const match = url.match(new RegExp(`/${BUCKET}/(.+)$`));
  if (!match) return;
  const path = match[1];
  const { error } = await supa.storage.from(BUCKET).remove([path]);
  if (error) console.warn('delete foto:', error.message);
}
// ── Leads: três pilares ───────────────────────────────────
const F_LEADS_GESTAO = ['nome','telefone','email','localizacao','tipologia','situacao_atual','modalidade','notas','estado','atribuido_a'];
const F_LEADS_AQUISICAO = ['nome','telefone','email','zona_interesse','orcamento','finalidade','tipo_reuniao','notas','estado','atribuido_a'];
const F_LEADS_HABITAR = ['nome','telefone','email','servico_interesse','descricao','notas','estado','atribuido_a'];

export const dbLeadsGestao    = makeCRUD('leads_gestao',    {}, F_LEADS_GESTAO);
export const dbLeadsAquisicao = makeCRUD('leads_aquisicao', {}, F_LEADS_AQUISICAO);
export const dbLeadsHabitar   = makeCRUD('leads_habitar',   {}, F_LEADS_HABITAR);
// Apaga várias fotos em lote
export async function deleteFotos(urls) {
  if (!supa || !urls || urls.length === 0) return;
  const paths = urls.map(url => {
    const m = url.match(new RegExp(`/${BUCKET}/(.+)$`));
    return m ? m[1] : null;
  }).filter(Boolean);
  if (paths.length === 0) return;
  const { error } = await supa.storage.from(BUCKET).remove(paths);
  if (error) console.warn('delete fotos:', error.message);
}

// ── STORAGE: Documentos de proprietários ──────────────────
const BUCKET_DOCS = 'documentos-proprietarios';

// Upload de documento (PDF/imagem) → URL público
export async function uploadDocumento(file, proprietarioId) {
  if (!supa) throw new Error('Supabase não configurado');
  if (!file) throw new Error('Ficheiro inválido');
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
  const name = `${proprietarioId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supa.storage.from(BUCKET_DOCS).upload(name, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/pdf',
  });
  if (error) { console.error('upload documento:', error); throw new Error(error.message); }
  const { data } = supa.storage.from(BUCKET_DOCS).getPublicUrl(name);
  return data.publicUrl;
}

// Apaga um documento do bucket dado o seu URL público
export async function deleteDocumento(url) {
  if (!supa || !url) return;
  const match = url.match(new RegExp(`/${BUCKET_DOCS}/(.+)$`));
  if (!match) return;
  const { error } = await supa.storage.from(BUCKET_DOCS).remove([match[1]]);
  if (error) console.warn('delete documento:', error.message);
}
