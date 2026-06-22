-- ============================================================================
-- EntreMesas — 0004: Social Bar (perfis efêmeros, conversas, moderação)
-- Rode DEPOIS de 0001–0003. Idempotente.
--
-- MODELO: o cliente do Social Bar se autentica de forma ANÔNIMA (Supabase
-- Anonymous sign-in). Cada perfil pertence a um auth.users (anônimo) e a um
-- estabelecimento. Habilite "Anonymous sign-ins" em Authentication → Providers.
-- ============================================================================

-- Identidade por usuário (em vez de device) para o Social Bar
alter table social_profiles add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table social_profiles add column if not exists table_id uuid references tables(id);
alter table social_profiles alter column session_id drop not null;
alter table social_profiles alter column device_id  drop not null;
create unique index if not exists uq_social_user_estab on social_profiles(user_id, establishment_id) where user_id is not null;
create index if not exists idx_social_estab_visible on social_profiles(establishment_id) where visible;

alter table blocks add column if not exists blocker_user uuid references auth.users(id) on delete cascade;
alter table blocks add column if not exists blocked_user uuid references auth.users(id) on delete cascade;
alter table blocks alter column blocker_device drop not null;
alter table blocks alter column blocked_device drop not null;

alter table reports add column if not exists reporter_user uuid references auth.users(id);
alter table reports add column if not exists target_user   uuid references auth.users(id);
alter table reports alter column reporter_device drop not null;
alter table reports alter column target_device   drop not null;

-- Helpers (SECURITY DEFINER evita recursão de RLS)
create or replace function public.owns_profile(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from social_profiles sp where sp.id = p and sp.user_id = auth.uid());
$$;

create or replace function public.has_profile_in(estab uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from social_profiles sp where sp.establishment_id = estab and sp.user_id = auth.uid());
$$;

create or replace function public.in_conversation(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from conversations c
    join social_profiles sp on sp.id in (c.profile_a, c.profile_b)
    where c.id = conv and sp.user_id = auth.uid()
  );
$$;

-- ===== social_profiles =====
drop policy if exists sp_select on social_profiles;
create policy sp_select on social_profiles for select to authenticated
  using (user_id = auth.uid() or (visible and has_profile_in(establishment_id)));
drop policy if exists sp_insert on social_profiles;
create policy sp_insert on social_profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists sp_update on social_profiles;
create policy sp_update on social_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists sp_delete on social_profiles;
create policy sp_delete on social_profiles for delete to authenticated using (user_id = auth.uid());

-- ===== conversations =====
drop policy if exists conv_select on conversations;
create policy conv_select on conversations for select to authenticated using (owns_profile(profile_a) or owns_profile(profile_b));
drop policy if exists conv_insert on conversations;
create policy conv_insert on conversations for insert to authenticated with check (owns_profile(profile_a));
drop policy if exists conv_update on conversations;
create policy conv_update on conversations for update to authenticated
  using (owns_profile(profile_a) or owns_profile(profile_b)) with check (owns_profile(profile_a) or owns_profile(profile_b));

-- ===== messages =====
drop policy if exists msg_select on messages;
create policy msg_select on messages for select to authenticated using (in_conversation(conversation_id));
drop policy if exists msg_insert on messages;
create policy msg_insert on messages for insert to authenticated
  with check (owns_profile(sender_profile) and in_conversation(conversation_id));

-- ===== blocks / reports =====
drop policy if exists blk_select on blocks;
create policy blk_select on blocks for select to authenticated using (blocker_user = auth.uid());
drop policy if exists blk_insert on blocks;
create policy blk_insert on blocks for insert to authenticated with check (blocker_user = auth.uid());
drop policy if exists blk_delete on blocks;
create policy blk_delete on blocks for delete to authenticated using (blocker_user = auth.uid());

drop policy if exists rep_insert on reports;
create policy rep_insert on reports for insert to authenticated with check (reporter_user = auth.uid());

-- ===== Realtime =====
do $$ begin
  begin alter publication supabase_realtime add table social_profiles; exception when others then null; end;
  begin alter publication supabase_realtime add table conversations;   exception when others then null; end;
  begin alter publication supabase_realtime add table messages;        exception when others then null; end;
end $$;

-- ============================================================================
-- FIM 0004. Habilite Anonymous sign-ins no painel do Supabase para o Social Bar.
-- Moderação por IA é opcional (função /api/moderate na Vercel usa ANTHROPIC_API_KEY).
-- ============================================================================
