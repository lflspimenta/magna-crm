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
const F_IMOVEIS = ['titulo','tipo','finalidade','status','valor','area','quartos','casas_banho','bairro','distrito','concelho','cidade','freguesia','foto','fotos','descricao'];
const F_CLIENTES = ['nome','email','telefone','interesse','orcamento','temperatura','bairros','obs'];
const F_TAREFAS = ['titulo','cliente','data','hora','tipo','prioridade','concluida','local','notas'];
const F_ANGARIACOES = ['prop_nome','prop_nif','prop_email','prop_telefone','prop_morada','tipo','finalidade','valor','area','quartos','casas_banho','descricao','morada','distrito','concelho','freguesia','cidade','tipo_mandato','comissao','prazo','data_inicio','estado','sig_prop','sig_agente'];
const F_UTILIZADORES = ['email','password','nome','cargo','avatar','role'];

// ── Mappings appKey -> dbKey ─────────────────────────────
const M_IMOVEIS = { casasBanho: 'casas_banho' };
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

export const dbUtilizadores = {
  ...makeCRUD('utilizadores', {}, F_UTILIZADORES, { orderBy: 'created_at', ascending: true }),
  async findByLogin(email, password) {
    if (!supa) return null;
    const { data, error } = await supa.from('utilizadores').select('*').eq('email', email).eq('password', password).maybeSingle();
    if (error) { console.error('find login:', error); return null; }
    return data;
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
