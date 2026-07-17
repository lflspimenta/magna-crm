// src/db.js — Cliente Supabase + funções de leitura/escrita
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
    if (dbKey in out) {
      out[appKey] = out[dbKey];
      if (appKey !== dbKey) delete out[dbKey];
    }
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
    if (appKey in out) {
      out[dbKey] = out[appKey];
      if (appKey !== dbKey) delete out[appKey];
    }
  }
  return onlyFields(out, allowed);
};

// ── Campos válidos por tabela (snake_case) ──────────────
// 'publicado' adicionado abaixo:
const F_IMOVEIS = ['titulo','tipo','finalidade','status','valor','area','quartos','casas_banho','bairro','distrito','concelho','cidade','freguesia','foto','fotos','descricao','destaque','publicado','proprietario_id'];
const F_CLIENTES = ['nome','email','telefone','interesse','orcamento','temperatura','bairros','tipologia','obs'];
const F_TAREFAS = ['titulo','cliente','data','hora','tipo','prioridade','concluida','local','notas'];
const F_ANGARIACOES = ['prop_nome','prop_nif','prop_email','prop_telefone','prop_morada','tipo','finalidade','valor','area','quartos','casas_banho','descricao','morada','distrito','concelho','freguesia','cidade','tipo_mandato','comissao','prazo','data_inicio','estado','sig_prop','sig_agente','proprietario_id'];
const F_UTILIZADORES = ['email','password','nome','cargo','avatar','role'];
const F_PROPRIETARIOS = ['nome','nif','email','telefone','morada','notas','estado'];
const F_DOCS_PROP = ['proprietario_id','imovel_id','tipo','nome_ficheiro','url','validade','notas','dados_extraidos'];
const F_VISITAS = ['imovel_id','imovel_titulo','cliente_nome','cliente_nif','cliente_contacto','data','hora','agente_nome','notas','sig_cliente','sig_agente'];

// ... (O restante do ficheiro mantém-se igual)
// ── Mappings, CRUD, Auth, Storage, etc ──────────────────
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

export const dbImoveis = makeCRUD('imoveis', M_IMOVEIS, F_IMOVEIS);
export const dbClientes = makeCRUD('clientes', {}, F_CLIENTES);
export const dbTarefas = makeCRUD('tarefas', {}, F_TAREFAS, { orderBy: 'data', ascending: true });
export const dbAngariacoes = makeCRUD('angariacoes', M_ANG, F_ANGARIACOES);
export const dbProprietarios = makeCRUD('proprietarios', {}, F_PROPRIETARIOS);
export const dbDocsProprietario = makeCRUD('documentos_proprietario', M_DOCS, F_DOCS_PROP);
export const dbVisitas = makeCRUD('visitas', M_VISITAS, F_VISITAS);

// ... (Pode manter o resto do ficheiro exatamente como estava)