-- ============================================================================
-- EntreMesas — 0002: Políticas RLS + Realtime para o app web (MVP de consumo)
-- Rode DEPOIS de 0001_init_entremesas.sql. Idempotente.
--
-- POSTURA MVP:
--   * Leitura PÚBLICA (anon) de cardápio, mesas e da conta (somente leitura) — para
--     o cliente acompanhar a mesa pelo link/QR sem login.
--   * Escrita restrita à equipe autenticada (staff) do próprio estabelecimento.
--   * Cliente pode apenas INSERIR chamadas de garçom (waiter_calls).
--
--   ⚠️ Em produção, restrinja a leitura de orders/order_items à sessão/identidade
--      do cliente (hoje, qualquer um com a anon key pode ler contas em aberto).
-- ============================================================================

-- Vincula um registro de staff a um usuário do Supabase Auth
alter table staff add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_staff_user on staff (user_id);

-- No MVP web o cliente chama o garçom sem criar table_session, então session_id é opcional
alter table waiter_calls alter column session_id drop not null;

-- Helper: o usuário logado é staff ativo deste estabelecimento?
create or replace function public.is_staff(estab uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff s
    where s.user_id = auth.uid()
      and s.establishment_id = estab
      and s.is_active
  );
$$;

-- ===================== POLÍTICAS =====================

-- establishments: leitura pública; criação por qualquer autenticado (onboarding);
-- atualização só pela equipe.
drop policy if exists est_select on establishments;
create policy est_select on establishments for select using (true);
drop policy if exists est_insert on establishments;
create policy est_insert on establishments for insert to authenticated with check (auth.uid() is not null);
drop policy if exists est_update on establishments;
create policy est_update on establishments for update using (is_staff(id)) with check (is_staff(id));

-- staff: vê o próprio registro e colegas do mesmo bar; cria o próprio (ao criar o bar)
drop policy if exists staff_select on staff;
create policy staff_select on staff for select to authenticated
  using (user_id = auth.uid() or is_staff(establishment_id));
drop policy if exists staff_insert on staff;
create policy staff_insert on staff for insert to authenticated with check (user_id = auth.uid());
drop policy if exists staff_update on staff;
create policy staff_update on staff for update using (is_staff(establishment_id)) with check (is_staff(establishment_id));

-- tables
drop policy if exists tables_select on tables;
create policy tables_select on tables for select using (true);
drop policy if exists tables_write on tables;
create policy tables_write on tables for all using (is_staff(establishment_id)) with check (is_staff(establishment_id));

-- categorias e produtos (cardápio público)
drop policy if exists cat_select on product_categories;
create policy cat_select on product_categories for select using (true);
drop policy if exists cat_write on product_categories;
create policy cat_write on product_categories for all using (is_staff(establishment_id)) with check (is_staff(establishment_id));

drop policy if exists prod_select on products;
create policy prod_select on products for select using (true);
drop policy if exists prod_write on products;
create policy prod_write on products for all using (is_staff(establishment_id)) with check (is_staff(establishment_id));

-- orders
drop policy if exists ord_select on orders;
create policy ord_select on orders for select using (true);
drop policy if exists ord_write on orders;
create policy ord_write on orders for all using (is_staff(establishment_id)) with check (is_staff(establishment_id));

-- order_items (equipe escreve; verifica via estabelecimento do pedido)
drop policy if exists oi_select on order_items;
create policy oi_select on order_items for select using (true);
drop policy if exists oi_write on order_items;
create policy oi_write on order_items for all
  using (is_staff((select o.establishment_id from orders o where o.id = order_id)))
  with check (is_staff((select o.establishment_id from orders o where o.id = order_id)));

-- waiter_calls (cliente cria; equipe lê/atualiza)
drop policy if exists wc_select on waiter_calls;
create policy wc_select on waiter_calls for select using (true);
drop policy if exists wc_insert on waiter_calls;
create policy wc_insert on waiter_calls for insert with check (true);
drop policy if exists wc_update on waiter_calls;
create policy wc_update on waiter_calls for update
  using (is_staff((select t.establishment_id from tables t where t.id = table_id)))
  with check (is_staff((select t.establishment_id from tables t where t.id = table_id)));

-- ===================== REALTIME =====================
-- Habilita Realtime (Postgres changes) nas tabelas usadas pelo app.
do $$
begin
  begin alter publication supabase_realtime add table orders;       exception when others then null; end;
  begin alter publication supabase_realtime add table order_items;  exception when others then null; end;
  begin alter publication supabase_realtime add table waiter_calls; exception when others then null; end;
end $$;

-- ============================================================================
-- FIM 0002. Próximo: criar conta na tela de login do app e fazer o onboarding
-- (o app cria estabelecimento + staff(owner) + mesas e cardápio de exemplo).
-- ============================================================================
