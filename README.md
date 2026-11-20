# SDMA Office OS v2

New application foundation for Shah Digital Marketing Agency.

## Stack
- Next.js App Router + TypeScript
- Supabase Auth, Postgres, Storage and Realtime
- Installable PWA for iOS, Android and desktop
- Vercel preview deployment

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Add the new Supabase project URL and publishable key.
3. Run `npm install`.
4. Run `npm run dev`.

## Supabase project
Use project ref `uisyfzvytnmsydjkkrni` for v2 only. Never put the service-role key in a browser environment variable or commit secrets.

## Development branch
The v2 foundation is developed on `office-os-v2`. It is separate from the current production branch until preview QA is complete.

## Database
The first v2 additive migration introduced content calendar, content comments, ad reports, leads, notifications, announcements, office shifts and audit logs; it also added private attendance selfie object paths and private Storage buckets. Existing profile records are preserved.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for modules, roles, security and delivery phases.
