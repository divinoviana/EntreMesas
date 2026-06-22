-- ============================================================================
-- EntreMesas — Migration inicial (estrutura de tabelas)
-- Alvo: Supabase (PostgreSQL 15+). Gerado a partir de docs/04-banco-de-dados.md
--
-- COMO RODAR:
--   Opção A) Supabase Dashboard → SQL Editor → New query → cole este arquivo → Run.
--   Opção B) Supabase CLI:  supabase db push   (com este arquivo em supabase/migrations/)
--
-- NOTAS DE PROJETO:
--   * Valores monetários SEMPRE em centavos (integer) — evita erro de ponto flutuante.
--   * RLS é habilitado em TODAS as tabelas com "deny-by-default" (sem políticas).
--     => Com a anon/publishable key o cliente NÃO lê nada até criarmos políticas +
--        Supabase Auth. Isto é proposital: o app trata dados financeiros, pessoais e
--        sociais. Acesso server-side deve usar a service_role key (que ignora RLS).
--   * Particionamento de order_items/messages foi ADIADO (otimização de escala).
--     Aqui são tabelas normais, para simplicidade e integridade referencial.
--   * Script idempotente: pode ser re-executado (CREATE ... IF NOT EXISTS).
-- ============================================================================

-- Extensões -------------------------------------------------------------------
create extension if not exists postgis with schema extensions;  -- geofence / geoespacial
-- gen_random_uuid() é nativo no Postgres 13+ (não requer extensão).

set search_path = public, extensions;

-- ============================================================================
-- DOMÍNIO: ESTABELECIMENTO E CARDÁPIO
-- ============================================================================

create table if not exists establishments (
    id               uuid primary key default gen_random_uuid(),
    name             text not null,
    legal_name       text,
    cnpj             varchar(14) unique,
    timezone         text not null default 'America/Sao_Paulo',
    geofence         geography(Polygon, 4326),     -- polígono físico p/ presença real
    centroid         geography(Point, 4326),
    pdv_integration  jsonb,                          -- {provider, credentials_ref, mode}
    settings         jsonb not null default '{}',    -- features habilitadas, social on/off
    status           text not null default 'active', -- active|suspended|trial
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);
comment on table establishments is 'Estabelecimentos (tenants) — base do multi-tenant.';

create table if not exists staff (
    id               uuid primary key default gen_random_uuid(),
    establishment_id uuid not null references establishments(id) on delete cascade,
    name             text not null,
    email            text,
    password_hash    text,
    role             text not null default 'waiter', -- owner|manager|waiter|cashier
    is_active        boolean not null default true,
    created_at       timestamptz not null default now()
);
create unique index if not exists uq_staff_email_lower on staff (lower(email)) where email is not null;
create index if not exists idx_staff_establishment on staff (establishment_id);

create table if not exists tables (
    id               uuid primary key default gen_random_uuid(),
    establishment_id uuid not null references establishments(id) on delete cascade,
    label            text not null,                  -- "07", "Balcão 3", "Camarote A"
    capacity         smallint,
    map_x            numeric(6,2),                   -- posição no mapa do salão
    map_y            numeric(6,2),
    zone             text,
    status           text not null default 'free',   -- free|occupied|reserved|disabled
    created_at       timestamptz not null default now(),
    unique (establishment_id, label)
);

create table if not exists product_categories (
    id               uuid primary key default gen_random_uuid(),
    establishment_id uuid not null references establishments(id) on delete cascade,
    name             text not null,
    sort_order       smallint default 0
);

create table if not exists products (
    id               uuid primary key default gen_random_uuid(),
    establishment_id uuid not null references establishments(id) on delete cascade,
    category_id      uuid references product_categories(id) on delete set null,
    name             text not null,
    description      text,
    price_cents      integer not null check (price_cents >= 0),
    image_url        text,
    is_available     boolean not null default true,
    external_ref     text,                           -- id do produto no PDV
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);
create index if not exists idx_products_establishment on products (establishment_id);

create table if not exists table_assignments (
    id               uuid primary key default gen_random_uuid(),
    table_id         uuid not null references tables(id) on delete cascade,
    staff_id         uuid not null references staff(id) on delete cascade,
    active           boolean not null default true,
    assigned_at      timestamptz not null default now()
);

create table if not exists subscriptions (
    id                  uuid primary key default gen_random_uuid(),
    establishment_id    uuid not null references establishments(id) on delete cascade,
    plan                text not null,               -- start|pro|night
    status              text not null,               -- trialing|active|past_due|canceled
    monthly_price_cents integer not null,
    current_period_end  timestamptz,
    created_at          timestamptz not null default now()
);

-- ============================================================================
-- DOMÍNIO: DISPOSITIVO, SESSÃO, CONSUMO E PAGAMENTO
-- ============================================================================

create table if not exists devices (
    id           uuid primary key default gen_random_uuid(),
    device_uid   text not null unique,               -- id estável do app (keystore)
    push_token   text,                               -- FCM/APNs
    phone_e164   text,                               -- só com opt-in WhatsApp (cifrar)
    is_banned    boolean not null default false,
    banned_until timestamptz,
    created_at   timestamptz not null default now()
);
comment on table devices is 'Identidade anônima e persistente do aparelho.';

create table if not exists qr_tokens (
    id         uuid primary key default gen_random_uuid(),
    table_id   uuid not null references tables(id) on delete cascade,
    secret     bytea not null,                       -- segredo TOTP da mesa (cifrar)
    rotated_at timestamptz not null default now()
);

create table if not exists table_sessions (
    id               uuid primary key default gen_random_uuid(),
    establishment_id uuid not null references establishments(id) on delete cascade,
    table_id         uuid not null references tables(id),
    device_id        uuid not null references devices(id),
    role             text not null default 'guest',  -- guest|host
    whatsapp_optin   boolean not null default false,
    social_optin     boolean not null default false,
    joined_geo       geography(Point, 4326),         -- posição no opt-in (verificação)
    status           text not null default 'active', -- active|closed|expired
    started_at       timestamptz not null default now(),
    last_seen_at     timestamptz not null default now(), -- heartbeat
    ended_at         timestamptz
);
create index if not exists idx_sessions_active on table_sessions (establishment_id, status) where status = 'active';
create index if not exists idx_sessions_table on table_sessions (table_id);
create index if not exists idx_sessions_device on table_sessions (device_id);
create index if not exists idx_sessions_geo on table_sessions using gist (joined_geo);

create table if not exists orders (
    id               uuid primary key default gen_random_uuid(),
    establishment_id uuid not null references establishments(id),
    table_id         uuid not null references tables(id),
    status           text not null default 'open',   -- open|closing|paid|canceled
    total_cents      integer not null default 0,     -- desnormalizado p/ leitura rápida
    opened_at        timestamptz not null default now(),
    closed_at        timestamptz
);
-- garante no máx. 1 conta aberta por mesa
create unique index if not exists uq_order_open_per_table on orders (table_id) where status in ('open','closing');
create index if not exists idx_orders_establishment on orders (establishment_id, status);

create table if not exists order_items (
    id               uuid primary key default gen_random_uuid(),
    order_id         uuid not null references orders(id) on delete cascade,
    product_id       uuid references products(id),
    product_name     text not null,                  -- snapshot (nome no momento)
    quantity         smallint not null check (quantity > 0),
    unit_price_cents integer not null,
    line_total_cents integer not null,
    launched_by      uuid references staff(id),
    status           text not null default 'active', -- active|disputed|voided
    note             text,
    created_at       timestamptz not null default now()
);
create index if not exists idx_order_items_order on order_items (order_id, status);
create index if not exists idx_order_items_created on order_items (created_at);

create table if not exists disputes (
    id            uuid primary key default gen_random_uuid(),
    order_item_id uuid not null references order_items(id),
    session_id    uuid not null references table_sessions(id),
    reason        text not null,                     -- not_ordered|wrong_qty|wrong_price|other
    detail        text,
    status        text not null default 'open',      -- open|accepted|rejected
    resolved_by   uuid references staff(id),
    resolved_at   timestamptz,
    created_at    timestamptz not null default now()
);

create table if not exists waiter_calls (
    id         uuid primary key default gen_random_uuid(),
    session_id uuid not null references table_sessions(id),
    table_id   uuid not null references tables(id),
    type       text not null,                        -- service|checkout|help
    status     text not null default 'pending',      -- pending|enroute|done
    priority   smallint not null default 0,
    created_at timestamptz not null default now(),
    handled_by uuid references staff(id),
    handled_at timestamptz
);
create index if not exists idx_waiter_calls_table on waiter_calls (table_id, status);

create table if not exists bill_splits (
    id         uuid primary key default gen_random_uuid(),
    order_id   uuid not null references orders(id),
    mode       text not null,                        -- equal|by_item|by_amount
    created_by uuid references devices(id),
    created_at timestamptz not null default now()
);

create table if not exists bill_split_shares (
    id           uuid primary key default gen_random_uuid(),
    split_id     uuid not null references bill_splits(id) on delete cascade,
    device_id    uuid references devices(id),
    label        text,                               -- "Pessoa 2" quando anônimo
    amount_cents integer not null,
    paid         boolean not null default false
);

create table if not exists payments (
    id             uuid primary key default gen_random_uuid(),
    order_id       uuid not null references orders(id),
    split_share_id uuid references bill_split_shares(id),
    method         text not null,                    -- pix|credit|debit|cash
    amount_cents   integer not null,
    gateway_ref    text,
    status         text not null default 'pending',  -- pending|paid|failed|refunded
    created_at     timestamptz not null default now(),
    paid_at        timestamptz
);

-- ============================================================================
-- DOMÍNIO: SOCIAL BAR (efêmero)
-- ============================================================================

create table if not exists social_profiles (
    id               uuid primary key default gen_random_uuid(),
    session_id       uuid not null references table_sessions(id) on delete cascade,
    establishment_id uuid not null references establishments(id),
    device_id        uuid not null references devices(id),
    nickname         text not null,
    photo_url        text,                           -- opcional, moderada
    age_range        text not null,                  -- 18-24|25-34|35-44|45+
    bio              text,
    interests        text[] not null default '{}',
    status           text not null,                  -- serious|flirt|casual|friends|night|unavailable
    visible          boolean not null default true,
    created_at       timestamptz not null default now(),
    expires_at       timestamptz not null            -- TTL; encerra ao sair do local
);
create index if not exists idx_social_active on social_profiles (establishment_id) where visible = true;
comment on table social_profiles is 'Perfil social EFÊMERO — expira ao sair do estabelecimento.';

create table if not exists conversations (
    id               uuid primary key default gen_random_uuid(),
    establishment_id uuid not null references establishments(id),
    profile_a        uuid not null references social_profiles(id) on delete cascade,
    profile_b        uuid not null references social_profiles(id) on delete cascade,
    status           text not null default 'pending', -- pending|open|declined|closed
    created_at       timestamptz not null default now(),
    unique (profile_a, profile_b)
);

create table if not exists messages (
    id                uuid primary key default gen_random_uuid(),
    conversation_id   uuid not null references conversations(id) on delete cascade,
    sender_profile    uuid not null references social_profiles(id),
    body              text,
    media_url         text,
    moderation_status text not null default 'pending', -- pending|approved|blocked
    created_at        timestamptz not null default now()
);
create index if not exists idx_messages_conversation on messages (conversation_id, created_at);

create table if not exists blocks (
    id             uuid primary key default gen_random_uuid(),
    blocker_device uuid not null references devices(id),
    blocked_device uuid not null references devices(id),
    created_at     timestamptz not null default now(),
    unique (blocker_device, blocked_device)
);

create table if not exists reports (
    id               uuid primary key default gen_random_uuid(),
    establishment_id uuid not null references establishments(id),
    reporter_device  uuid not null references devices(id),
    target_device    uuid not null references devices(id),
    category         text not null,                  -- harassment|spam|fake|offensive|other
    detail           text,
    evidence         jsonb,                          -- ids de mensagens, snapshot
    severity         smallint,                       -- atribuída pela IA (0-100)
    status           text not null default 'open',   -- open|auto_actioned|reviewed|dismissed
    created_at       timestamptz not null default now()
);

create table if not exists moderation_events (
    id           uuid primary key default gen_random_uuid(),
    subject_type text not null,                      -- message|photo|bio|nickname
    subject_id   uuid,
    device_id    uuid references devices(id),
    decision     text not null,                      -- approved|flagged|blocked
    categories   jsonb,                              -- {harassment:0.9, sexual:0.1,...}
    model        text,
    created_at   timestamptz not null default now()
);

-- ============================================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================================

-- mantém orders.total_cents consistente a cada mudança em order_items
create or replace function recalc_order_total() returns trigger
language plpgsql as $$
begin
    update orders o
       set total_cents = coalesce((
           select sum(line_total_cents) from order_items
           where order_id = o.id and status = 'active'
       ), 0)
     where o.id = coalesce(new.order_id, old.order_id);
    return null;
end; $$;

drop trigger if exists trg_recalc_total on order_items;
create trigger trg_recalc_total
    after insert or update or delete on order_items
    for each row execute function recalc_order_total();

-- updated_at automático
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_estab_updated on establishments;
create trigger trg_estab_updated before update on establishments
    for each row execute function set_updated_at();

drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products
    for each row execute function set_updated_at();

-- ============================================================================
-- ÍNDICES GEOESPACIAIS
-- ============================================================================
create index if not exists idx_establishments_geofence on establishments using gist (geofence);

-- ============================================================================
-- ROW LEVEL SECURITY (deny-by-default)
-- Habilita RLS em todas as tabelas. SEM políticas => somente a service_role
-- (server-side) acessa. Políticas granulares + Supabase Auth virão depois.
-- ============================================================================
alter table establishments     enable row level security;
alter table staff              enable row level security;
alter table tables             enable row level security;
alter table product_categories enable row level security;
alter table products           enable row level security;
alter table table_assignments  enable row level security;
alter table subscriptions      enable row level security;
alter table devices            enable row level security;
alter table qr_tokens          enable row level security;
alter table table_sessions     enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table disputes           enable row level security;
alter table waiter_calls       enable row level security;
alter table bill_splits        enable row level security;
alter table bill_split_shares  enable row level security;
alter table payments           enable row level security;
alter table social_profiles    enable row level security;
alter table conversations      enable row level security;
alter table messages           enable row level security;
alter table blocks             enable row level security;
alter table reports            enable row level security;
alter table moderation_events  enable row level security;

-- ============================================================================
-- FIM. 23 tabelas criadas. Próximo passo sugerido: políticas RLS + Supabase Auth.
-- ============================================================================
