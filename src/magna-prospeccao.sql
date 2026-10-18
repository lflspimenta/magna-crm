-- ═══════════════════════════════════════════════════════════
-- PROSPECÇÃO — passa a ser um tipo de tarefa
--
-- A tabela `reunioes` separada estava a custar mais do que
-- rendia: sete dos vinte campos já eram iguais aos das tarefas,
-- a reunião não exportava para o calendário, e era preciso um
-- adaptador para a fazer passar por tarefa na Agenda.
--
-- Passa a ser uma tarefa de tipo 'Prospecção', com o que lhe é
-- próprio numa coluna jsonb — o mesmo padrão que os `interesses`
-- já usam para a checklist e as propostas.
--
-- As tarefas já têm RLS com a política `auth all tarefas` para
-- authenticated, igual à que a tabela `reunioes` tinha: juntar
-- não baixa a protecção dos dados.
--
-- Correr uma vez no SQL Editor da Supabase. É seguro voltar a
-- correr. O bucket `notas-reunioes` continua a ser usado para
-- os anexos — não o apague.
-- ═══════════════════════════════════════════════════════════

alter table public.tarefas
  add column if not exists prospeccao jsonb;

-- Tarefas de prospecção, para a Agenda as encontrar depressa.
create index if not exists tarefas_prospeccao_idx
  on public.tarefas ((prospeccao->>'estado'))
  where prospeccao is not null;

-- ── Arrumar a tabela que deixou de ser precisa ─────────────
-- Só a apaga se estiver vazia. Se tiver alguma reunião lá
-- dentro, não toca em nada e avisa — nesse caso peça-me a
-- migração dos dados antes de a apagar à mão.
do $$
declare n bigint;
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'reunioes') then
    execute 'select count(*) from public.reunioes' into n;
    if n = 0 then
      drop table public.reunioes;
      raise notice 'Tabela reunioes estava vazia e foi removida.';
    else
      raise notice 'Tabela reunioes tem % linha(s) — NÃO foi removida. Migre os dados antes de a apagar.', n;
    end if;
  end if;
end $$;

-- A função auxiliar criada para as reuniões continua a servir os
-- comentários no registo, por isso fica.

-- Recarregar o cache de esquema do PostgREST, senão a API
-- responde "Could not find the 'prospeccao' column in the
-- schema cache" na primeira gravação.
notify pgrst, 'reload schema';
