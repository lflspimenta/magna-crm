-- ═══════════════════════════════════════════════════════════
-- REUNIÕES DE PROSPECÇÃO — Magna CRM
--
-- Encontros com quem ainda não é cliente. Tabela própria, e não
-- mais colunas nas tarefas: uma reunião tem contacto, preparação,
-- desfecho, histórico e folhas de notas, que só a ela dizem
-- respeito.
--
-- Correr uma vez no SQL Editor da Supabase.
-- É seguro voltar a correr.
--
-- FALTA UM PASSO À MÃO: criar o bucket das folhas de notas.
-- Storage → New bucket → nome `notas-reunioes` → Public bucket.
-- Sem isso, anexar uma folha dá "Bucket not found".
-- ═══════════════════════════════════════════════════════════

create table if not exists public.reunioes (
  id            bigserial primary key,

  -- Quando e onde
  titulo        text not null,
  data          date not null,
  hora          text,
  local         text,

  -- Com quem. Escrito à mão: ainda não é cliente, não há lista.
  contacto_nome     text not null,
  contacto_telefone text,
  contacto_email    text,
  origem            text,          -- quem indicou, de onde veio

  -- Antes e depois
  preparacao    text,              -- o que vou propor, o que quero saber
  desfecho      text,              -- o que se passou (ou o motivo da desistência)

  -- agendada · realizada · reagendada · desistiu
  estado        text not null default 'agendada'
                check (estado in ('agendada','realizada','reagendada','desistiu')),

  -- Cada mudança de estado fica registada, com motivo e autor.
  -- Um reagendamento repetido não apaga o motivo do anterior.
  -- [{ "em":"...", "de":"...", "para":"...", "motivo":"...",
  --    "por":"...", "data_anterior":"...", "hora_anterior":"..." }]
  historico     jsonb not null default '[]'::jsonb,

  -- Folhas de notas manuscritas, fotografadas.
  -- [{ "url":"...", "nome":"...", "transcricao":"...", "em":"..." }]
  notas         jsonb not null default '[]'::jsonb,

  -- Quem criou e quem fica com ela. Podem ser pessoas diferentes.
  criado_por_id text,
  criado_por    text,
  atribuido_id  text,
  atribuido_a   text,

  -- Preenchido quando se carrega em "Promover a lead"
  lead_tabela   text,
  lead_id       text,
  promovida_em  timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Procura típica: a agenda, por data.
create index if not exists reunioes_data_idx     on public.reunioes (data);
create index if not exists reunioes_atribuido_idx on public.reunioes (atribuido_id, data);
create index if not exists reunioes_estado_idx    on public.reunioes (estado);

-- updated_at automático
create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists reunioes_updated_at on public.reunioes;
create trigger reunioes_updated_at before update on public.reunioes
  for each row execute function public.tocar_updated_at();

-- ── Segurança ──────────────────────────────────────────────
-- Sem isto, a chave anon do frontend lê a tabela inteira.
-- Toda a equipa vê e trabalha as reuniões; o que distingue os
-- papéis está na aplicação, não aqui.
alter table public.reunioes enable row level security;

drop policy if exists reunioes_ler      on public.reunioes;
drop policy if exists reunioes_escrever on public.reunioes;

create policy reunioes_ler on public.reunioes
  for select to authenticated using (true);

create policy reunioes_escrever on public.reunioes
  for all to authenticated using (true) with check (true);

-- Recarregar o cache de esquema do PostgREST, senão a API
-- responde "Could not find the table in the schema cache".
notify pgrst, 'reload schema';
