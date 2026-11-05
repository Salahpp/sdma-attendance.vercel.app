# Deploy Shah Agency TaskPro PWA on Hostinger

## Important prerequisite

Hostinger's managed Node.js Web App deployment supports Business/Unlimited Web Hosting and Cloud plans. Premium/Single shared hosting does not provide the managed Next.js Node.js Web App option. VPS hosting can run Node.js but requires manual server setup.

Check your exact plan in hPanel before proceeding.

## Recommended subdomain

`taskpro.shahdigitalmarketing.com`

Create/deploy it as a separate website / Node.js Web App. Do not replace your main `shahdigitalmarketing.com` website and do not upload this Next.js project into the main website's `public_html` folder.

## Deploy from a ZIP in hPanel

1. Sign in to Hostinger hPanel.
2. Open **Websites** and choose **Create site**.
3. Choose **Web App** / **Node.js Web App**.
4. Choose **Upload your website files**.
5. Upload the Hostinger ZIP package. The ZIP root must contain `package.json`, `next.config.ts`, `app/`, `lib/`, `components/`, `public/`, and `supabase/`.
6. Select/detect **Next.js** as the framework.
7. Use the build command `npm run build`.
8. Use the start command `npm run start` if Hostinger asks for it. The project's `start` script runs `next start`.
9. Select a supported Node.js version (Node.js 20 or 22 is a sensible choice where offered).
10. Set the app's environment variables before/after deployment:
    - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase publishable/anon key
    - `NEXT_PUBLIC_APP_URL` = `https://taskpro.shahdigitalmarketing.com`
11. Deploy and wait for the build to finish.
12. If the app requires a restart after changing environment variables, use the Restart option in the Node.js app dashboard.

Do not put a Supabase service-role key in any `NEXT_PUBLIC_` variable or in this browser-facing app.

## Connect the subdomain

If Hostinger lets you choose the subdomain during app creation, choose `taskpro.shahdigitalmarketing.com`.

If it needs to be connected afterward:
1. In hPanel, create/connect `taskpro.shahdigitalmarketing.com` as a separate website for the Node.js app.
2. Follow the exact DNS target/record values shown by Hostinger.
3. Do not change the main domain's A/AAAA records or email MX records unless Hostinger explicitly instructs you for this subdomain.
4. Enable/verify SSL for the subdomain and wait until HTTPS works.

## Supabase Auth configuration

In Supabase Dashboard → Authentication → URL Configuration:
- Set Site URL to `https://taskpro.shahdigitalmarketing.com`.
- Add the exact app callback/redirect URLs used by the project to the Redirect URLs allow list. Keep existing valid URLs if they are still needed.

The app relies on Supabase Auth and database Row Level Security. Verify that the existing TaskPro schema and Kanban migration are already installed. Do not run the SQL again if they are already installed.

## After deployment: install on phones

### iPhone
1. Open Safari.
2. Visit `https://taskpro.shahdigitalmarketing.com`.
3. Sign in using the staff account.
4. Tap Share → Add to Home Screen.
5. Enable Open as Web App if iOS shows that option, then tap Add.

### Android
1. Open the URL in Chrome.
2. Sign in.
3. Open the three-dot menu → Install app / Add to Home screen.

## Before inviting staff

Test with separate accounts:
- CEO: can view and manage all tasks.
- Team Lead: can assign and review tasks.
- Staff: can view all tasks but update only their own assigned tasks.

Keep public sign-ups disabled if accounts should only be created by an administrator. Check Supabase RLS and test permissions before entering real client data.

## Limitations

- A PWA is not a native App Store or TestFlight app.
- It requires HTTPS for installability.
- Private pages are intentionally not cached for offline access.
- This project is an MVP starter. Verify production build, permissions, login, task workflows, file handling and backups before agency-wide rollout.
