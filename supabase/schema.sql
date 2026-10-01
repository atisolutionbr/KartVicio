create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  starts_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  rating smallint,
  weight_kg numeric(5,2),
  ballast_kg numeric(5,2) not null default 0,
  preferred_role text check (preferred_role in ('performance', 'balanced', 'safe')),
  preferred_stint text check (preferred_stint in ('opening', 'middle', 'closing', 'any')),
  pressure_ready boolean not null default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  number text not null,
  role text not null check (role in ('leader', 'attack', 'support', 'recovery')),
  created_at timestamptz not null default now(),
  unique (team_id, number)
);

create table if not exists stints (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references entries(id) on delete cascade,
  driver_id uuid not null references drivers(id) on delete restrict,
  started_at_ms integer not null,
  ended_at_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists pit_stops (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references entries(id) on delete cascade,
  started_at_ms integer not null,
  ended_at_ms integer,
  validity text check (validity in ('invalid', 'valid-with-penalty', 'valid')),
  penalty_laps smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists timing_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  captured_at_ms bigint not null,
  race_clock_ms bigint,
  flag text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists timing_snapshots_event_captured_idx
  on timing_snapshots(event_id, captured_at_ms);

create table if not exists monitoring_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  source text not null check (source in ('mock', 'mylaptime')),
  source_url text,
  status text not null default 'idle'
    check (status in ('idle', 'waiting-pairing', 'connecting', 'live', 'stale', 'error')),
  team_entry_numbers text[] not null default '{}',
  last_snapshot_at timestamptz,
  started_at timestamptz,
  stopped_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists monitoring_sessions_event_idx
  on monitoring_sessions(event_id);
