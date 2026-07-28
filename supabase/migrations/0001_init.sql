-- FleetView — Supabase / Postgres schema.
-- Mirrors the local demo (server/db.js) and adds full multi-tenancy + RLS.
-- Apply with:  supabase db push

create extension if not exists "pgcrypto";

-- ---------- Tenancy ----------
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table memberships (
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ---------- Sites & dishes ----------
create table sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  type text not null default 'office' check (type in ('vessel','mine','office','tower')),
  region text,
  lat double precision,
  lon double precision,
  enroll_token_hash text not null,          -- sha256(agent token); plaintext never stored
  created_at timestamptz not null default now()
);
create index on sites(org_id);
create unique index on sites(enroll_token_hash);

create table dishes (
  id text primary key,                      -- dish device id
  site_id uuid not null references sites(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  hardware_version text,
  software_version text,
  first_seen timestamptz default now(),
  last_seen timestamptz
);
create index on dishes(site_id);

-- ---------- Telemetry ----------
create table telemetry_samples (
  id bigint generated always as identity primary key,
  site_id uuid not null references sites(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  ts timestamptz not null,
  state text,
  reachable boolean default true,
  downlink_bps double precision,
  uplink_bps double precision,
  ping_latency_ms double precision,
  ping_drop_rate double precision,
  latency_p95_ms double precision,
  fraction_obstructed double precision,
  currently_obstructed boolean,
  uptime_s bigint,
  snr_above_noise boolean,
  azimuth double precision,
  elevation double precision,
  gps_sats int,
  alerts jsonb default '[]'
);
create index on telemetry_samples(site_id, ts desc);
create index on telemetry_samples(org_id, ts desc);
-- Large fleets: make this a TimescaleDB hypertable for partitioning + retention:
--   select create_hypertable('telemetry_samples', 'ts', chunk_time_interval => interval '1 day');

create table telemetry_rollups_1m (
  site_id uuid not null references sites(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  bucket timestamptz not null,
  avg_latency_ms double precision,
  p95_latency_ms double precision,
  avg_drop_rate double precision,
  max_downlink_bps double precision,
  obstruction_seconds int,
  uptime_ratio double precision,
  primary key (site_id, bucket)
);

create table obstruction_maps (
  site_id uuid primary key references sites(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  ts timestamptz not null,
  num_rows int,
  num_cols int,
  snr jsonb
);

-- ---------- Events & alerts ----------
create table events (
  id bigint generated always as identity primary key,
  org_id uuid not null references orgs(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  type text not null,
  severity text not null default 'warning',
  message text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  active boolean not null default true
);
create index on events(org_id, active);
create index on events(site_id, started_at desc);

create table alert_rules (
  id bigint generated always as identity primary key,
  org_id uuid not null references orgs(id) on delete cascade,
  scope text not null default 'org',
  site_id uuid references sites(id) on delete cascade,
  type text not null check (type in ('site_down','high_latency','high_drop','obstruction')),
  threshold double precision default 0,
  window_s int default 120,
  channels jsonb default '["slack"]',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index on alert_rules(org_id);

create table alerts (
  id bigint generated always as identity primary key,
  org_id uuid not null references orgs(id) on delete cascade,
  rule_id bigint references alert_rules(id) on delete set null,
  site_id uuid not null references sites(id) on delete cascade,
  type text not null,
  severity text not null,
  message text,
  fired_at timestamptz not null default now(),
  resolved_at timestamptz,
  status text not null default 'active' check (status in ('active','resolved'))
);
create index on alerts(org_id, status);

create table integrations (
  org_id uuid primary key references orgs(id) on delete cascade,
  slack_webhook_url text,
  email_to text,
  email_from text default 'alerts@fleetview.app',
  resend_api_key text
);

-- ---------- Row-level security ----------
alter table orgs enable row level security;
alter table memberships enable row level security;
alter table sites enable row level security;
alter table dishes enable row level security;
alter table telemetry_samples enable row level security;
alter table telemetry_rollups_1m enable row level security;
alter table obstruction_maps enable row level security;
alter table events enable row level security;
alter table alert_rules enable row level security;
alter table alerts enable row level security;
alter table integrations enable row level security;

-- orgs the signed-in user belongs to
create or replace function current_user_orgs() returns setof uuid
language sql stable security definer set search_path = public as $$
  select org_id from memberships where user_id = auth.uid()
$$;

-- Read: members see their org's rows
create policy org_read on sites              for select using (org_id in (select current_user_orgs()));
create policy org_read on dishes             for select using (org_id in (select current_user_orgs()));
create policy org_read on telemetry_samples  for select using (org_id in (select current_user_orgs()));
create policy org_read on telemetry_rollups_1m for select using (org_id in (select current_user_orgs()));
create policy org_read on obstruction_maps   for select using (org_id in (select current_user_orgs()));
create policy org_read on events             for select using (org_id in (select current_user_orgs()));
create policy org_read on alert_rules        for select using (org_id in (select current_user_orgs()));
create policy org_read on alerts             for select using (org_id in (select current_user_orgs()));
create policy org_read on integrations       for select using (org_id in (select current_user_orgs()));
create policy self_read on memberships       for select using (user_id = auth.uid());
create policy org_self on orgs               for select using (id in (select current_user_orgs()));

-- Write: app users manage rules / sites / integrations.
-- Telemetry is written only by the ingest Edge Function (service role bypasses RLS).
create policy org_write on alert_rules   for all using (org_id in (select current_user_orgs())) with check (org_id in (select current_user_orgs()));
create policy org_write on sites         for all using (org_id in (select current_user_orgs())) with check (org_id in (select current_user_orgs()));
create policy org_write on integrations  for all using (org_id in (select current_user_orgs())) with check (org_id in (select current_user_orgs()));
