-- Zoho Books OAuth tokens are server-only and cannot be read by client roles.
create table if not exists public.zoho_books_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  connected_by uuid references auth.users(id),
  organization_id text,
  organization_name text,
  region text not null default 'in',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.zoho_books_oauth_tokens enable row level security;
revoke all on public.zoho_books_oauth_tokens from anon, authenticated;
grant all on public.zoho_books_oauth_tokens to service_role;
