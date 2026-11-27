create table if not exists public.zoho_connections (
 id text primary key check (id='primary'),
 refresh_token text not null,
 api_domain text not null,
 accounts_domain text not null,
 updated_at timestamptz not null default now()
);
alter table public.zoho_connections enable row level security;
revoke all on public.zoho_connections from anon, authenticated;
