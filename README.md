# Shah Agency TaskPro — Private Installable PWA

A private, mobile-first Progressive Web App for Shah Digital Marketing Agency. It runs on iPhone, iPad, Android and desktop browsers and can be added to a phone's Home Screen. It uses the existing TaskPro Next.js + Supabase application and database schema.

## Included PWA features

- Web app manifest with Shah TaskPro name, icons, theme and standalone display mode.
- iOS Apple touch icon and Android install icons.
- Service worker registration in production.
- Install instructions for iPhone Safari and Android Chrome.
- Offline fallback page.
- Security-conscious caching: authenticated pages, login pages, Next.js data and API/Supabase responses are not cached by the service worker.
- `noindex` metadata to discourage search engine indexing.

## Important: PWA is not an App Store / TestFlight app

No Apple Developer membership is required. Users install it from the secure HTTPS website using Add to Home Screen / Install App. It remains a web app running in Safari/WebKit or Chrome. Native-only features and some background/push capabilities are not equivalent to a native app.

## 1. Supabase setup

This PWA uses the same Supabase schema and RLS model as the existing Shah Agency TaskPro project.

- If the existing Supabase project already has the TaskPro schema and `002_kanban_workflow.sql` migration, do not run them again.
- For a new Supabase project, run `supabase/schema.sql` once in Supabase SQL Editor.
- If the original schema is already installed but the Kanban migration is not, run `supabase/migrations/002_kanban_workflow.sql`.
- Create individual users in Supabase Authentication.
- Confirm each user has an active `profiles` row and the correct role (`ceo`, `team_lead`, `staff`).
- Turn off public sign-ups in Supabase Auth if only administrator-created accounts should access the private agency app.
- Verify Row Level Security policies with CEO, Team Lead and Staff test accounts before using real client data.

## 2. Environment variables

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or the Supabase publishable key accepted by your project)
- `NEXT_PUBLIC_APP_URL`

Use only the Supabase publishable/anon key in the browser. Never put the service-role key in a `NEXT_PUBLIC_` variable or in the mobile browser app.

## 3. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for development. Service worker registration is intentionally disabled in development; test PWA installation on a production HTTPS deployment.

## 4. Deploy to HTTPS

Recommended simple deployment: Vercel.

1. Push this project to a private Git repository.
2. Import it into Vercel as a Next.js project.
3. Add the environment variables from `.env.local` in Vercel Project Settings.
4. Deploy.
5. Add the custom domain `taskpro.shahdigitalmarketing.com` in Vercel.
6. In Hostinger DNS, add the DNS records Vercel provides. Keep existing main-domain website and mail/MX records unchanged.
7. Set the Supabase Auth Site URL to `https://taskpro.shahdigitalmarketing.com`.
8. Add `https://taskpro.shahdigitalmarketing.com/**` (or the exact callback URLs used by the app) to Supabase Auth redirect allow list.
9. Test login, logout, task access and roles over HTTPS.

Hostinger classic PHP-only shared hosting cannot run this Next.js server application as-is. If your Hostinger plan supports Node.js web apps, it may be deployed there; otherwise use Vercel or a Node.js host and point the subdomain DNS to it.

## 5. Install on iPhone

1. Deploy the app to a working HTTPS domain first.
2. Open **Safari** on the iPhone.
3. Visit `https://taskpro.shahdigitalmarketing.com`.
4. Sign in with the staff account.
5. Tap the Safari **Share** button.
6. Choose **Add to Home Screen**.
7. If shown, enable **Open as Web App**.
8. Tap **Add**. Launch Shah TaskPro from the new Home Screen icon.

The install menu may differ slightly by iOS version. Use Safari, not an embedded browser inside WhatsApp or Instagram.

## 6. Install on Android

1. Open the HTTPS app URL in Chrome.
2. Sign in.
3. Open the three-dot menu.
4. Choose **Install app** or **Add to Home screen**.
5. Confirm.

## 7. Private access and security

- Share the app URL only with agency staff.
- Each staff member must use their own Supabase Auth account.
- The app is not made private merely by hiding the URL. Private access is enforced by Supabase authentication, application route protection and database RLS.
- Do not enable public sign-up unless intentionally required.
- The service worker deliberately does not cache private task pages or Supabase data. Offline use displays an offline message rather than exposing stale private records.
- HTTPS is required for service workers and installability.
- Review all RLS policies and test permissions before production use.

## 8. Current application scope

The underlying project is an MVP starter with login, dashboard, Kanban tasks, team and client views, task assignment and review actions. The PWA layer adds installation and app-like launch behavior; it does not automatically add native push notifications, offline task editing, file uploads or new business modules. Those require separate implementation and testing.

## 9. Verification checklist before staff rollout

- [ ] Production build succeeds.
- [ ] HTTPS domain and manifest load.
- [ ] Service worker registers in production.
- [ ] iPhone Safari offers Add to Home Screen.
- [ ] Android Chrome offers Install App.
- [ ] CEO can manage and monitor tasks.
- [ ] Razal can assign and review tasks.
- [ ] Staff can view all tasks but update only their own.
- [ ] Supabase RLS denies unauthorized updates.
- [ ] Logout clears the authenticated session.
- [ ] Offline fallback does not expose private task data.
