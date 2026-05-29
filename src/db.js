// src/db.js — Cliente Supabase + funções de leitura/escrita
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_KEY;

export const supa = (URL && KEY) ? createClient(URL, KEY) : null;
export const dbReady = !!supa;

// Converte snake_case da BD para camelCase usado no app
const fromDB = (row, mapping) => {
  if (!row) return null;
  const out = { ...row };
  for (const [appKey, dbKey] of Object.entries(mapping)) {
    if (dbKey in out) {
      out[appKey] = out[dbKey];
      if (appKey !== dbKey) delete out[dbKey];
    }
  }
  return out;
};
const toDB = (obj, mapping) => {
  const out = { ...obj };
  for (const [appKey, dbKey] of Object.entries(mapping)) {
    if (appKey in out) {
      out[dbKey] = out[appKey];
      if (appKey !== dbKey) delete out[appKey];
    }
  }
  // Remove id se não for válido (deixar a BD gerar)
  if (!out.id || typeof out.id === 'string' && out.id.length > 18) delete out.id;
  return out;
};

// ── IMÓVEIS ───────────────────────────────────────────────
const IMOVEL_MAP = { casasBanho: 'casas_banho' };
export const dbImoveis = {
  async list() {
    if (!supa) return [];
    const { data, error } = await supa.from('imoveis').select('*').order('created_at', { ascending: false });
    if (error) { console.error('list imoveis:', error); return []; }
    return (data || []).map(r => fromDB(r, IMOVEL_MAP));
  },
  async insert(item) {
    if (!supa) return null;
    const { data, error } = await supa.from('imoveis').insert(toDB(item, IMOVEL_MAP)).select().single();
    if (error) { console.error('insert imovel:', error); throw new Error(error.message); }
    return fromDB(data, IMOVEL_MAP);
  },
  async update(id, item) {
    if (!supa) return null;
    const payload = toDB(item, IMOVEL_MAP);
    delete payload.id;
    delete payload.created_at;
    const { data, error } = await supa.from('imoveis').update(payload).eq('id', id).select().single();
    if (error) { console.error('update imovel:', error); throw new Error(error.message); }
    return fromDB(data, IMOVEL_MAP);
  },
  async remove(id) {
    if (!supa) return;
    const { error } = await supa.from('imoveis').delete().eq('id', id);
    if (error) { console.error('delete imovel:', error); throw new Error(error.message); }
  },
};

// ── CLIENTES ──────────────────────────────────────────────
export const dbClientes = {
  async list() {
    if (!supa) return [];
    const { data, error } = await supa.from('clientes').select('*').order('created_at', { ascending: false });
    if (error) { console.error('list clientes:', error); return []; }
    return data || [];
  },
  async insert(item) {
    if (!supa) return null;
    const p = { ...item }; if (!p.id || (typeof p.id === 'string' && p.id.length > 18)) delete p.id;
    const { data, error } = await supa.from('clientes').insert(p).select().single();
    if (error) { console.error('insert cliente:', error); throw new Error(error.message); }
    return data;
  },
  async update(id, item) {
    if (!supa) return null;
    const p = { ...item }; delete p.id; delete p.created_at;
    const { data, error } = await supa.from('clientes').update(p).eq('id', id).select().single();
    if (error) { console.error('update cliente:', error); throw new Error(error.message); }
    return data;
  },
  async remove(id) {
    if (!supa) return;
    const { error } = await supa.from('clientes').delete().eq('id', id);
    if (error) { console.error('delete cliente:', error); throw new Error(error.message); }
  },
};

// ── TAREFAS ───────────────────────────────────────────────
export const dbTarefas = {
  async list() {
    if (!supa) return [];
    const { data, error } = await supa.from('tarefas').select('*').order('data', { ascending: true });
    if (error) { console.error('list tarefas:', error); return []; }
    return data || [];
  },
  async insert(item) {
    if (!supa) return null;
    const p = { ...item }; if (!p.id || (typeof p.id === 'string' && p.id.length > 18)) delete p.id;
    const { data, error } = await supa.from('tarefas').insert(p).select().single();
    if (error) { console.error('insert tarefa:', error); throw new Error(error.message); }
    return data;
  },
  async update(id, item) {
    if (!supa) return null;
    const p = { ...item }; delete p.id; delete p.created_at;
    const { data, error } = await supa.from('tarefas').update(p).eq('id', id).select().single();
    if (error) { console.error('update tarefa:', error); throw new Error(error.message); }
    return data;
  },
  async remove(id) {
    if (!supa) return;
    const { error } = await supa.from('tarefas').delete().eq('id', id);
    if (error) { console.error('delete tarefa:', error); throw new Error(error.message); }
  },
};

// ── ANGARIAÇÕES ───────────────────────────────────────────
const ANG_MAP = {
  propNome: 'prop_nome', propNif: 'prop_nif', propEmail: 'prop_email',
  propTelefone: 'prop_telefone', propMorada: 'prop_morada',
  casasBanho: 'casas_banho', tipoMandato: 'tipo_mandato',
  dataInicio: 'data_inicio', sigProp: 'sig_prop', sigAgente: 'sig_agente',
};
export const dbAngariacoes = {
  async list() {
    if (!supa) return [];
    const { data, error } = await supa.from('angariacoes').select('*').order('created_at', { ascending: false });
    if (error) { console.error('list angariacoes:', error); return []; }
    return (data || []).map(r => fromDB(r, ANG_MAP));
  },
  async insert(item) {
    if (!supa) return null;
    const { data, error } = await supa.from('angariacoes').insert(toDB(item, ANG_MAP)).select().single();
    if (error) { console.error('insert angariacao:', error); throw new Error(error.message); }
    return fromDB(data, ANG_MAP);
  },
  async update(id, item) {
    if (!supa) return null;
    const payload = toDB(item, ANG_MAP);
    delete payload.id;
    delete payload.created_at;
    const { data, error } = await supa.from('angariacoes').update(payload).eq('id', id).select().single();
    if (error) { console.error('update angariacao:', error); throw new Error(error.message); }
    return fromDB(data, ANG_MAP);
  },
  async remove(id) {
    if (!supa) return;
    const { error } = await supa.from('angariacoes').delete().eq('id', id);
    if (error) { console.error('delete angariacao:', error); throw new Error(error.message); }
  },
};

// ── UTILIZADORES ──────────────────────────────────────────
export const dbUtilizadores = {
  async list() {
    if (!supa) return [];
    const { data, error } = await supa.from('utilizadores').select('*').order('created_at', { ascending: true });
    if (error) { console.error('list utilizadores:', error); return []; }
    return data || [];
  },
  async insert(item) {
    if (!supa) return null;
    const p = { ...item }; if (!p.id || (typeof p.id === 'string' && p.id.length > 18)) delete p.id;
    const { data, error } = await supa.from('utilizadores').insert(p).select().single();
    if (error) { console.error('insert utilizador:', error); throw new Error(error.message); }
    return data;
  },
  async update(id, item) {
    if (!supa) return null;
    const p = { ...item }; delete p.id; delete p.created_at;
    const { data, error } = await supa.from('utilizadores').update(p).eq('id', id).select().single();
    if (error) { console.error('update utilizador:', error); throw new Error(error.message); }
    return data;
  },
  async remove(id) {
    if (!supa) return;
    const { error } = await supa.from('utilizadores').delete().eq('id', id);
    if (error) { console.error('delete utilizador:', error); throw new Error(error.message); }
  },
  async findByLogin(email, password) {
    if (!supa) return null;
    const { data, error } = await supa.from('utilizadores').select('*').eq('email', email).eq('password', password).maybeSingle();
    if (error) { console.error('find login:', error); return null; }
    return data;
  },
};
