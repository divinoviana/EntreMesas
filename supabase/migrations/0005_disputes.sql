-- ============================================================================
-- EntreMesas — 0005: Contestação de item (disputes)
-- Rode DEPOIS de 0001–0004. Idempotente. (Depende de is_staff(), criada na 0002.)
--
-- Cliente (sem login) abre contestação; a equipe resolve no painel.
-- O item NÃO é removido automaticamente — só ao a equipe "aceitar".
-- ============================================================================

-- No MVP web o cliente contesta sem table_session
alter table disputes alter column session_id drop not null;

-- Cliente cria/lê; equipe (staff do estabelecimento do item) atualiza/resolve
drop policy if exists disp_select on disputes;
create policy disp_select on disputes for select using (true);

drop policy if exists disp_insert on disputes;
create policy disp_insert on disputes for insert with check (true);

drop policy if exists disp_update on disputes;
create policy disp_update on disputes for update
  using (is_staff((select o.establishment_id from order_items oi join orders o on o.id = oi.order_id where oi.id = order_item_id)))
  with check (is_staff((select o.establishment_id from order_items oi join orders o on o.id = oi.order_id where oi.id = order_item_id)));

-- Realtime
do $$ begin
  begin alter publication supabase_realtime add table disputes; exception when others then null; end;
end $$;

-- ============================================================================
-- FIM 0005.
-- ============================================================================
