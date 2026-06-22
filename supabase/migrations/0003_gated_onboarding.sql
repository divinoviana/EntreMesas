-- ============================================================================
-- EntreMesas — 0003: Cadastro de bares CONTROLADO por convite + admin da plataforma
-- Rode DEPOIS de 0001 e 0002. Idempotente.
--
-- O QUE MUDA:
--   * Criar um bar passa a exigir um CÓDIGO DE CONVITE válido, emitido por um
--     "admin da plataforma" (você). Sem código => não cria bar.
--   * A criação é feita por uma função SECURITY DEFINER (atômica e segura). A
--     inserção DIRETA em establishments/staff pelo cliente é BLOQUEADA (RLS).
-- ============================================================================

-- Pré-requisito da 0002 (idempotente): a função create_bar_with_invite grava
-- staff.user_id. Garantimos a coluna aqui também, caso a 0002 não tenha rodado.
alter table staff add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_staff_user on staff (user_id);

-- Admins da plataforma (operadores do EntreMesas) -----------------------------
create table if not exists platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

drop policy if exists pa_select on platform_admins;
create policy pa_select on platform_admins for select to authenticated
  using (user_id = auth.uid() or is_platform_admin());
-- (inserção de admins só via SQL/Dashboard — sem policy de insert para o cliente)

-- Convites de cadastro de bar -------------------------------------------------
create table if not exists establishment_invites (
  code             text primary key,
  note             text,                       -- ex.: nome do bar/dono autorizado
  is_active        boolean not null default true,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  used_by          uuid references auth.users(id),
  used_at          timestamptz,
  establishment_id uuid references establishments(id)
);
alter table establishment_invites enable row level security;

-- Só admins da plataforma enxergam/gerenciam convites
drop policy if exists inv_select on establishment_invites;
create policy inv_select on establishment_invites for select to authenticated using (is_platform_admin());
drop policy if exists inv_insert on establishment_invites;
create policy inv_insert on establishment_invites for insert to authenticated with check (is_platform_admin());
drop policy if exists inv_update on establishment_invites;
create policy inv_update on establishment_invites for update using (is_platform_admin()) with check (is_platform_admin());

-- TRAVA: ninguém cria establishment/staff direto pelo cliente (só via a função abaixo)
drop policy if exists est_insert on establishments;
drop policy if exists staff_insert on staff;

-- Função: resgata o convite e cria o bar (com cardápio e mesas de exemplo)
create or replace function public.create_bar_with_invite(
  p_code text, p_bar_name text, p_owner_name text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_inv establishment_invites%rowtype;
  v_est uuid;
  v_cat uuid;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  if coalesce(trim(p_bar_name), '') = '' then raise exception 'Informe o nome do bar'; end if;

  select * into v_inv from establishment_invites where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Código de convite inválido'; end if;
  if (not v_inv.is_active) or (v_inv.used_by is not null) then
    raise exception 'Este convite já foi utilizado ou está inativo';
  end if;

  insert into establishments(name) values (trim(p_bar_name)) returning id into v_est;
  insert into staff(establishment_id, name, role, user_id, is_active)
    values (v_est, coalesce(nullif(trim(p_owner_name), ''), 'Responsável'), 'owner', v_uid, true);

  insert into product_categories(establishment_id, name, sort_order) values (v_est, 'Cervejas', 0) returning id into v_cat;
  insert into products(establishment_id, category_id, name, price_cents, is_available) values
    (v_est, v_cat, 'Heineken 600ml', 1900, true), (v_est, v_cat, 'Original 600ml', 1700, true), (v_est, v_cat, 'Chopp Pilsen', 1200, true);
  insert into product_categories(establishment_id, name, sort_order) values (v_est, 'Drinks', 1) returning id into v_cat;
  insert into products(establishment_id, category_id, name, price_cents, is_available) values
    (v_est, v_cat, 'Caipirinha', 1900, true), (v_est, v_cat, 'Gin Tônica', 2600, true);
  insert into product_categories(establishment_id, name, sort_order) values (v_est, 'Porções', 2) returning id into v_cat;
  insert into products(establishment_id, category_id, name, price_cents, is_available) values
    (v_est, v_cat, 'Batata Frita', 3500, true), (v_est, v_cat, 'Calabresa Acebolada', 3900, true), (v_est, v_cat, 'Mandioca Frita', 3200, true);
  insert into product_categories(establishment_id, name, sort_order) values (v_est, 'Não Alcoólicos', 3) returning id into v_cat;
  insert into products(establishment_id, category_id, name, price_cents, is_available) values
    (v_est, v_cat, 'Refrigerante', 800, true), (v_est, v_cat, 'Água', 500, true), (v_est, v_cat, 'Suco Natural', 1200, true);

  insert into tables(establishment_id, label, status)
    select v_est, lpad(g::text, 2, '0'), 'free' from generate_series(1, 8) g;

  update establishment_invites
     set is_active = false, used_by = v_uid, used_at = now(), establishment_id = v_est
   where code = v_inv.code;

  return v_est;
end; $$;

revoke execute on function public.create_bar_with_invite(text, text, text) from public, anon;
grant execute on function public.create_bar_with_invite(text, text, text) to authenticated;

-- ============================================================================
-- COMO TORNAR-SE O ADMIN DA PLATAFORMA (rode UMA vez, após criar sua conta no app):
--
--   insert into platform_admins (user_id)
--   select id from auth.users where email = 'divinoviana@gmail.com'
--   on conflict do nothing;
--
-- Depois, em /convites (no app) você gera os códigos para liberar cada bar.
-- ============================================================================
