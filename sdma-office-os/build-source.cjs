const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = __dirname;
const parts = [
  "source-00a.b64",
  "source-00b.b64",
  "source-00c.b64",
  "source-01.b64",
  "source-02.b64",
  "source-03.b64",
  "source-04.b64",
  "source-05a.b64",
  "source-05b.b64",
  "source-05c.b64",
];

const encoded = parts.map((name) => fs.readFileSync(path.join(root, name), "utf8").trim()).join("");
const archive = path.join(root, ".sdma-office-os-source.tar.xz");
fs.writeFileSync(archive, Buffer.from(encoded, "base64"));
execFileSync("tar", ["-xJf", archive, "-C", root], { stdio: "inherit" });

const debugFiles = [];
function walkDebug(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDebug(full);
    else if (full.includes(path.sep + "src" + path.sep)) debugFiles.push(path.relative(root, full));
  }
}
walkDebug(root);
console.log("SDMA_TREE:" + JSON.stringify(debugFiles));

fs.unlinkSync(archive);

function patchSource(relative, transform) {
  const file = path.join(root, relative);
  const before = fs.readFileSync(file, "utf8");
  const after = transform(before);
  if (after === before) throw new Error("Patch did not change " + relative);
  fs.writeFileSync(file, after);
}

fs.writeFileSync(path.join(root, "src/app/admin/staff/StaffManager.tsx"), "\"use client\";\nimport { useState } from \"react\";\nimport { Icon } from \"@/components/Icon\";\nimport { initials } from \"@/lib/attendance\";\nimport type { Location, Profile, Shift } from \"@/lib/types\";\n\ninterface Created {\n  name: string;\n  email: string;\n  password: string;\n}\n\ninterface Props {\n  initial: Profile[];\n  canAdd: boolean;\n  canEdit: boolean;\n  currentUserId: string;\n  locations: Location[];\n  shifts: Shift[];\n}\n\nexport function StaffManager({ initial, canAdd, canEdit, currentUserId, locations, shifts }: Props) {\n  const [staff, setStaff] = useState(initial);\n  const [open, setOpen] = useState(false);\n  const [editing, setEditing] = useState<Profile | null>(null);\n  const [busy, setBusy] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n  const [created, setCreated] = useState<Created | null>(null);\n  const [copied, setCopied] = useState(false);\n\n  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {\n    e.preventDefault();\n    const formEl = e.currentTarget;\n    setError(null);\n    setBusy(true);\n    const f = new FormData(formEl);\n    try {\n      const res = await fetch(\"/api/admin/staff\", {\n        method: \"POST\",\n        headers: { \"content-type\": \"application/json\" },\n        body: JSON.stringify({\n          fullName: f.get(\"fullName\"),\n          email: f.get(\"email\"),\n          phone: f.get(\"phone\"),\n          role: f.get(\"role\"),\n        }),\n      });\n      const data = await res.json().catch(() => ({}));\n      if (!res.ok) {\n        setError(data?.error?.message ?? \"Could not add this person. Try again.\");\n        return;\n      }\n      setStaff((s) => [...s, data.profile]);\n      setCreated({ name: data.profile.fullName, email: data.profile.email, password: data.tempPassword });\n      setCopied(false);\n      setOpen(false);\n      formEl.reset();\n    } catch {\n      setError(\"No connection. Nothing was saved. Try again.\");\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  async function onEditSubmit(e: React.FormEvent<HTMLFormElement>) {\n    e.preventDefault();\n    if (!editing) return;\n    const target = editing;\n    const f = new FormData(e.currentTarget);\n    setError(null);\n    setBusy(true);\n    try {\n      const res = await fetch(\"/api/admin/staff\", {\n        method: \"PATCH\",\n        headers: { \"content-type\": \"application/json\" },\n        body: JSON.stringify({\n          id: target.id,\n          fullName: f.get(\"fullName\"),\n          email: f.get(\"email\"),\n          phone: f.get(\"phone\"),\n          role: target.id === currentUserId ? target.role : f.get(\"role\"),\n          locationId: f.get(\"locationId\") || null,\n          shiftId: f.get(\"shiftId\") || null,\n          joinedOn: f.get(\"joinedOn\"),\n          active: target.id === currentUserId ? target.active : f.get(\"active\") === \"on\",\n        }),\n      });\n      const data = await res.json().catch(() => ({}));\n      if (!res.ok) {\n        setError(data?.error?.message ?? \"Could not update this staff profile.\");\n        return;\n      }\n      setStaff((items) => items.map((item) => item.id === target.id ? data.profile : item));\n      setEditing(null);\n    } catch {\n      setError(\"No connection. Nothing was saved. Try again.\");\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  return (\n    <>\n      {created && (\n        <div className=\"banner b-success\" role=\"status\">\n          <Icon name=\"check\" />\n          <div style={{ flex: 1 }}>\n            <b>{created.name} is added.</b> Share these sign-in details now. The password is shown only this once.\n            <div style={{ marginTop: \"var(--space-2)\", overflowWrap: \"anywhere\" }}>\n              Email: <b>{created.email}</b>\n              <br />\n              Temporary password: <b data-testid=\"temp-password\" style={{ fontFamily: \"var(--font-mono)\" }}>{created.password}</b>\n            </div>\n            <div style={{ marginTop: \"var(--space-2)\", display: \"flex\", gap: \"var(--space-2)\" }}>\n              <button\n                type=\"button\"\n                className=\"btn btn-secondary sm\"\n                onClick={async () => {\n                  try {\n                    await navigator.clipboard.writeText(\"Email: \" + created.email + \"\\nTemporary password: \" + created.password);\n                    setCopied(true);\n                  } catch {\n                    setCopied(false);\n                  }\n                }}\n              >\n                {copied ? \"Copied\" : \"Copy details\"}\n              </button>\n              <button type=\"button\" className=\"btn btn-ghost sm\" onClick={() => setCreated(null)}>Done</button>\n            </div>\n          </div>\n        </div>\n      )}\n\n      {canAdd && !open && !editing && (\n        <div>\n          <button type=\"button\" className=\"btn btn-primary\" onClick={() => { setError(null); setOpen(true); }}>Add a person</button>\n        </div>\n      )}\n\n      {open && (\n        <form onSubmit={onSubmit} noValidate className=\"card\" style={{ display: \"flex\", flexDirection: \"column\", gap: \"var(--space-4)\", maxWidth: 520 }}>\n          <h2 style={{ font: \"600 var(--text-lg-size)/var(--text-lg-line) var(--font-sans)\", margin: 0 }}>Add a person</h2>\n          {error && <div className=\"banner b-danger\" role=\"alert\"><Icon name=\"warn\" /><div>{error}</div></div>}\n          <div className=\"field\">\n            <label htmlFor=\"fullName\">Full name</label>\n            <input id=\"fullName\" name=\"fullName\" autoComplete=\"off\" required maxLength={120} />\n          </div>\n          <div className=\"field\">\n            <label htmlFor=\"email\">Email (used to sign in)</label>\n            <input id=\"email\" name=\"email\" type=\"email\" inputMode=\"email\" autoComplete=\"off\" required />\n          </div>\n          <div className=\"field\">\n            <label htmlFor=\"phone\">Phone (optional)</label>\n            <input id=\"phone\" name=\"phone\" type=\"tel\" inputMode=\"tel\" autoComplete=\"off\" />\n          </div>\n          <div className=\"field\">\n            <label htmlFor=\"role\">Role</label>\n            <select id=\"role\" name=\"role\" defaultValue=\"staff\">\n              <option value=\"staff\">Staff</option>\n              <option value=\"manager\">Manager</option>\n              <option value=\"admin\">Admin</option>\n            </select>\n            <span className=\"help\">Managers see everyone's attendance. Admins also manage pay and settings.</span>\n          </div>\n          <div style={{ display: \"flex\", gap: \"var(--space-2)\" }}>\n            <button className=\"btn btn-primary\" type=\"submit\" disabled={busy}>{busy ? \"Adding\" : \"Add person\"}</button>\n            <button className=\"btn btn-ghost\" type=\"button\" onClick={() => { setOpen(false); setError(null); }}>Cancel</button>\n          </div>\n        </form>\n      )}\n\n      {canEdit && editing && (\n        <form onSubmit={onEditSubmit} noValidate className=\"card\" style={{ display: \"flex\", flexDirection: \"column\", gap: \"var(--space-4)\", maxWidth: 760 }}>\n          <div>\n            <h2 style={{ font: \"600 var(--text-lg-size)/var(--text-lg-line) var(--font-sans)\", margin: 0 }}>Edit staff details</h2>\n            <span className=\"help\">Changes are saved to the staff profile. Email changes also update their sign-in email.</span>\n          </div>\n          {error && <div className=\"banner b-danger\" role=\"alert\"><Icon name=\"warn\" /><div>{error}</div></div>}\n          <div style={{ display: \"grid\", gridTemplateColumns: \"repeat(auto-fit, minmax(220px, 1fr))\", gap: \"var(--space-3)\" }}>\n            <div className=\"field\">\n              <label htmlFor=\"editFullName\">Full name</label>\n              <input id=\"editFullName\" name=\"fullName\" defaultValue={editing.fullName} required maxLength={120} />\n            </div>\n            <div className=\"field\">\n              <label htmlFor=\"editEmail\">Login email</label>\n              <input id=\"editEmail\" name=\"email\" type=\"email\" defaultValue={editing.email} required />\n            </div>\n            <div className=\"field\">\n              <label htmlFor=\"editPhone\">Phone</label>\n              <input id=\"editPhone\" name=\"phone\" type=\"tel\" defaultValue={editing.phone ?? \"\"} />\n            </div>\n            <div className=\"field\">\n              <label htmlFor=\"editRole\">Role</label>\n              <select id=\"editRole\" name=\"role\" defaultValue={editing.role} disabled={editing.id === currentUserId}>\n                <option value=\"staff\">Staff</option>\n                <option value=\"manager\">Manager</option>\n                <option value=\"admin\">Admin</option>\n              </select>\n              {editing.id === currentUserId && <span className=\"help\">Your own admin role cannot be changed here.</span>}\n            </div>\n            <div className=\"field\">\n              <label htmlFor=\"editLocation\">Office location</label>\n              <select id=\"editLocation\" name=\"locationId\" defaultValue={editing.locationId ?? \"\"}>\n                <option value=\"\">Unassigned</option>\n                {editing.locationId && !locations.some((item) => item.id === editing.locationId) && <option value={editing.locationId}>Current location</option>}\n                {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}\n              </select>\n            </div>\n            <div className=\"field\">\n              <label htmlFor=\"editShift\">Shift</label>\n              <select id=\"editShift\" name=\"shiftId\" defaultValue={editing.shiftId ?? \"\"}>\n                <option value=\"\">Unassigned</option>\n                {editing.shiftId && !shifts.some((item) => item.id === editing.shiftId) && <option value={editing.shiftId}>Current shift</option>}\n                {shifts.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.startTime}–{item.endTime})</option>)}\n              </select>\n            </div>\n            <div className=\"field\">\n              <label htmlFor=\"editJoinedOn\">Joining date</label>\n              <input id=\"editJoinedOn\" name=\"joinedOn\" type=\"date\" defaultValue={editing.joinedOn} required />\n            </div>\n          </div>\n          <label style={{ display: \"flex\", alignItems: \"center\", gap: \"var(--space-2)\" }}>\n            <input type=\"checkbox\" name=\"active\" defaultChecked={editing.active} disabled={editing.id === currentUserId} />\n            <span>Active staff member</span>\n          </label>\n          {editing.id === currentUserId && <span className=\"help\">Your own account cannot be deactivated from this screen.</span>}\n          <div style={{ display: \"flex\", gap: \"var(--space-2)\" }}>\n            <button className=\"btn btn-primary\" type=\"submit\" disabled={busy}>{busy ? \"Saving\" : \"Save changes\"}</button>\n            <button className=\"btn btn-ghost\" type=\"button\" disabled={busy} onClick={() => { setEditing(null); setError(null); }}>Cancel</button>\n          </div>\n        </form>\n      )}\n\n      {staff.length === 0 ? (\n        <div className=\"empty\"><b>No staff yet</b> Add your first person to get started.</div>\n      ) : (\n        <div>\n          {staff.map((p) => (\n            <div className=\"row\" key={p.id}>\n              <div className=\"avatar\" aria-hidden=\"true\">{initials(p.fullName)}</div>\n              <div className=\"grow\">\n                <div className=\"name\">{p.fullName}</div>\n                <div className=\"sub\" style={{ overflowWrap: \"anywhere\" }}>{p.email}{p.phone ? \" · \" + p.phone : \"\"}</div>\n              </div>\n              <span className={\"chip \" + (p.role === \"staff\" ? \"c-neutral\" : \"c-info\")}>{p.role}</span>\n              <span className={\"chip \" + (p.active ? \"c-info\" : \"c-neutral\")}>{p.active ? \"Active\" : \"Inactive\"}</span>\n              {canEdit && <button type=\"button\" className=\"btn btn-secondary sm\" onClick={() => { setOpen(false); setError(null); setEditing(p); }} aria-label={\"Edit \" + p.fullName}>Edit</button>}\n            </div>\n          ))}\n        </div>\n      )}\n    </>\n  );\n}\n");

patchSource("src/lib/types.ts", (source) => {
  const anchor = "export interface AttendanceRecord {";
  if (!source.includes(anchor)) throw new Error("Profile type insertion point missing");
  return source.replace(anchor, 'export type UpdateProfile = Pick<Profile, "fullName" | "phone" | "email" | "role" | "locationId" | "shiftId" | "joinedOn" | "active">;\n\n' + anchor);
});

patchSource("src/lib/data/contract.ts", (source) => {
  source = source.replace(
    'import type { AttendanceRecord, Location, NewProfile, Organization, Profile, Shift } from "../types";',
    'import type { AttendanceRecord, Location, NewProfile, Organization, Profile, Shift, UpdateProfile } from "../types";'
  );
  const anchor = '  createProfile(orgId: string, input: NewProfile): Promise<{ profile: Profile; tempPassword: string }>;\n';
  if (!source.includes(anchor)) throw new Error("DataLayer createProfile signature missing");
  return source.replace(anchor, anchor + '  updateProfile(id: string, orgId: string, input: UpdateProfile): Promise<Profile>;\n');
});

patchSource("src/lib/data/fake.ts", (source) => {
  source = source.replace(
    'import type { AttendanceRecord, Location, NewProfile, Organization, Profile, Shift } from "../types";',
    'import type { AttendanceRecord, Location, NewProfile, Organization, Profile, Shift, UpdateProfile } from "../types";'
  );
  const anchor = '    async createProfile(forOrg, input) {\n      if (forOrg !== orgId) throw new DataError("not_found", "Unknown organization.");\n      const password = tempPassword();\n      return { profile: addProfile(input, password), tempPassword: password };\n    },\n';
  if (!source.includes(anchor)) throw new Error("Fake createProfile implementation missing");
  const addition = anchor + "\n    async updateProfile(id, forOrg, input: UpdateProfile) {\n      const current = profiles.get(id);\n      if (!current || current.orgId !== forOrg || forOrg !== orgId) throw new DataError(\"not_found\", \"Staff profile not found.\");\n      const email = input.email.trim().toLowerCase();\n      const owner = byEmail.get(email);\n      if (owner && owner !== id) throw new DataError(\"email_taken\", \"That email is already used.\");\n      byEmail.delete(current.email);\n      const updated: Profile = {\n        ...current,\n        ...input,\n        fullName: input.fullName.trim(),\n        email,\n        phone: input.phone?.trim() || null,\n      };\n      profiles.set(id, updated);\n      byEmail.set(email, id);\n      return updated;\n    },\n";
  return source.replace(anchor, addition);
});

patchSource("src/lib/supabase/rest.ts", (source) => {
  const anchor = 'export async function authAdminDeleteUser(id: string): Promise<void> {';
  if (!source.includes(anchor)) throw new Error("Auth admin delete insertion point missing");
  return source.replace(anchor, "export async function authAdminUpdateUser(\n  id: string,\n  attributes: { email?: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> },\n): Promise<void> {\n  const response = await fetch(supabaseUrl() + \"/auth/v1/admin/users/\" + encodeURIComponent(id), {\n    method: \"PUT\",\n    headers: { ...headers(), \"Content-Type\": \"application/json\" },\n    body: JSON.stringify(attributes),\n    cache: \"no-store\",\n  });\n  await parseResponse<unknown>(response);\n}\n\n" + anchor);
});

patchSource("src/lib/data/supabase.ts", (source) => {
  source = source.replace(
    'import type { AttendanceRecord, Location, NewProfile, Organization, Profile, Shift } from "../types";',
    'import type { AttendanceRecord, Location, NewProfile, Organization, Profile, Shift, UpdateProfile } from "../types";'
  );
  source = source.replace(
    'import { authAdminCreateUser, authAdminDeleteUser, authPasswordLogin, dbInsert, dbPatch, dbSelect, type SupabaseError } from "../supabase/rest";',
    'import { authAdminCreateUser, authAdminDeleteUser, authAdminUpdateUser, authPasswordLogin, dbInsert, dbPatch, dbSelect, type SupabaseError } from "../supabase/rest";'
  );
  const anchor = '    async getOrg(id) {\n';
  if (!source.includes(anchor)) throw new Error("Supabase getOrg insertion point missing");
  return source.replace(anchor, "    async updateProfile(id, orgId, input: UpdateProfile) {\n      const currentRows = await dbSelect<Row>(\"profiles\", { select: \"*\", id: \"eq.\" + id, org_id: \"eq.\" + orgId, limit: \"1\" });\n      const current = profile(one(currentRows, \"Staff profile not found.\"));\n      const email = input.email.trim().toLowerCase();\n      const fullName = input.fullName.trim();\n\n      if (email !== current.email || fullName !== current.fullName) {\n        try {\n          await authAdminUpdateUser(id, {\n            ...(email !== current.email ? { email, email_confirm: true } : {}),\n            ...(fullName !== current.fullName ? { user_metadata: { full_name: fullName } } : {}),\n          });\n        } catch (error) {\n          const authError = error as SupabaseError;\n          if (authError.status === 422 || authError.code === \"email_exists\") {\n            throw new DataError(\"email_taken\", \"That email is already used.\");\n          }\n          throw error;\n        }\n      }\n\n      try {\n        const rows = await dbPatch<Row>(\"profiles\", { id: \"eq.\" + id, org_id: \"eq.\" + orgId }, {\n          full_name: fullName,\n          email,\n          phone: input.phone?.trim() || null,\n          role: input.role,\n          location_id: input.locationId,\n          shift_id: input.shiftId,\n          joined_on: input.joinedOn,\n          active: input.active,\n        });\n        return profile(one(rows, \"Staff profile not found.\"));\n      } catch (error) {\n        if (email !== current.email) {\n          await authAdminUpdateUser(id, { email: current.email, email_confirm: true }).catch(() => undefined);\n        }\n        const dbError = error as SupabaseError;\n        if (dbError?.code === \"23505\") throw new DataError(\"email_taken\", \"That email is already used.\");\n        if (dbError?.code === \"23503\" || dbError?.code === \"23514\") throw new DataError(\"not_found\", dbError.message);\n        throw error;\n      }\n    },\n" + anchor);
});

patchSource("src/app/api/admin/staff/route.ts", (source) => {
  if (source.includes("export async function PATCH")) throw new Error("Staff PATCH route already exists");
  return source.trimEnd() + "\n\nexport async function PATCH(req: Request) {\n  const user = await requireUser([\"admin\"]);\n  if (user instanceof Response) return user;\n  const parsed = await readJson(req);\n  if (!parsed.ok) return parsed.res;\n  const b = parsed.body;\n  const id = typeof b.id === \"string\" ? b.id.trim() : \"\";\n  if (!id) return fail(400, \"staff_id_required\", \"Choose a staff member.\");\n\n  const data = getData();\n  const current = await data.getProfile(id);\n  if (!current || current.orgId !== user.orgId) return fail(404, \"staff_not_found\", \"Staff profile not found.\");\n\n  const fullName = typeof b.fullName === \"string\" ? b.fullName.trim() : \"\";\n  const email = typeof b.email === \"string\" ? b.email.trim().toLowerCase() : \"\";\n  const phone = typeof b.phone === \"string\" ? b.phone.trim() : \"\";\n  const role = (typeof b.role === \"string\" ? b.role : current.role) as Role;\n  const joinedOn = typeof b.joinedOn === \"string\" ? b.joinedOn : current.joinedOn;\n  const active = typeof b.active === \"boolean\" ? b.active : current.active;\n  const locationId = b.locationId === null || b.locationId === \"\" ? null : typeof b.locationId === \"string\" ? b.locationId : current.locationId;\n  const shiftId = b.shiftId === null || b.shiftId === \"\" ? null : typeof b.shiftId === \"string\" ? b.shiftId : current.shiftId;\n\n  if (!fullName) return fail(400, \"name_required\", \"Enter the person's name.\");\n  if (fullName.length > 120) return fail(400, \"name_long\", \"That name is too long.\");\n  if (!EMAIL.test(email)) return fail(400, \"email_invalid\", \"Enter a valid email address.\");\n  if (!ROLES.includes(role)) return fail(400, \"role_invalid\", \"Choose admin, manager or staff.\");\n  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(joinedOn) || Number.isNaN(Date.parse(joinedOn + \"T00:00:00.000Z\")) || new Date(joinedOn + \"T00:00:00.000Z\").toISOString().slice(0, 10) !== joinedOn) {\n    return fail(400, \"joined_date_invalid\", \"Enter a valid joining date.\");\n  }\n  if (id === user.id && (role !== \"admin\" || !active)) {\n    return fail(400, \"self_protected\", \"You cannot remove or deactivate your own admin access.\");\n  }\n\n  if (locationId) {\n    const location = await data.getLocation(locationId);\n    if (!location || location.orgId !== user.orgId) return fail(400, \"location_invalid\", \"Choose a valid office location.\");\n  }\n  if (shiftId) {\n    const shift = await data.getShift(shiftId);\n    if (!shift || shift.orgId !== user.orgId) return fail(400, \"shift_invalid\", \"Choose a valid shift.\");\n  }\n\n  try {\n    const profile = await data.updateProfile(id, user.orgId, {\n      fullName,\n      email,\n      phone: phone || null,\n      role,\n      locationId,\n      shiftId,\n      joinedOn,\n      active,\n    });\n    return json({ profile });\n  } catch (error) {\n    if (error instanceof DataError && error.code === \"email_taken\") return fail(409, \"email_taken\", \"Someone already uses that email.\");\n    if (error instanceof DataError && error.code === \"not_found\") return fail(404, \"staff_not_found\", \"Staff profile not found.\");\n    throw error;\n  }\n}\n";
});

patchSource("src/app/admin/staff/page.tsx", (source) => {
  const before = "export default async function StaffPage() {\n  const user = await requirePageUser([\"admin\", \"manager\"]);\n  const staff = await getData().listProfiles(user.orgId);\n  return (\n    <>\n      <h1 className=\"page-title\">Staff</h1>\n      <StaffManager initial={staff} canAdd={user.role === \"admin\"} />\n    </>\n  );\n}";
  const after = "export default async function StaffPage() {\n  const user = await requirePageUser([\"admin\", \"manager\"]);\n  const data = getData();\n  const [staff, locations, shifts] = await Promise.all([\n    data.listProfiles(user.orgId),\n    data.listLocations(user.orgId),\n    data.listShifts(user.orgId),\n  ]);\n  return (\n    <>\n      <h1 className=\"page-title\">Staff</h1>\n      <StaffManager\n        initial={staff}\n        canAdd={user.role === \"admin\"}\n        canEdit={user.role === \"admin\"}\n        currentUserId={user.id}\n        locations={locations}\n        shifts={shifts}\n      />\n    </>\n  );\n}";
  if (!source.includes(before)) throw new Error("Staff page component not found");
  return source.replace(before, after);
});

for (const name of parts) fs.unlinkSync(path.join(root, name));

const designDir = path.join(root, "replica", "design");
fs.mkdirSync(designDir, { recursive: true });
const presetB64 = fs.readFileSync(path.join(root, "tailwind-preset.b64"), "utf8").trim();
fs.writeFileSync(path.join(designDir, "tailwind.preset.js"), Buffer.from(presetB64, "base64"));
fs.unlinkSync(path.join(root, "tailwind-preset.b64"));

const tokensCss = `:root {
  --color-bg:#fff; --color-surface:#f5f5f6; --color-border:#e4e4e7; --color-border-input:#85858f;
  --color-text:#111; --color-text-muted:#5a5a64; --color-accent:#e31e24; --color-accent-hover:#c4161c;
  --color-accent-text:#c4161c; --color-on-accent:#fff; --color-danger:#b42318; --color-danger-bg:#fdecea;
  --color-success:#1a7342; --color-success-bg:#e6f4ec; --color-warning:#8a4b00; --color-warning-bg:#fff2d6;
  --color-info:#1d4ed8; --color-info-bg:#e8eeff;
  --font-sans:Inter,'Noto Sans Malayalam',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --font-mono:ui-monospace,SFMono-Regular,Menlo,monospace;
  --text-xs-size:12px; --text-xs-line:20px; --text-sm-size:14px; --text-sm-line:22px;
  --text-base-size:16px; --text-base-line:26px; --text-lg-size:20px; --text-lg-line:30px;
  --text-xl-size:28px; --text-xl-line:38px;
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:24px; --space-6:32px; --space-7:48px;
  --radius-md:10px; --radius-lg:16px; --radius-pill:999px;
  --shadow-card:0 1px 2px rgba(17,17,17,.06),0 1px 3px rgba(17,17,17,.10);
  --motion-fast:120ms; --layout-touch-min:48px; --layout-content-max:1120px;
  --layout-sidebar:248px; --layout-header:56px; --layout-tabbar:64px;
  color-scheme:light;
}
@media (prefers-color-scheme:dark) {
  :root:not([data-theme="light"]) {
    --color-bg:#111; --color-surface:#1b1b1e; --color-border:#2d2d33; --color-border-input:#8b8b96;
    --color-text:#f5f5f6; --color-text-muted:#a8a8b2; --color-accent:#e31e24;
    --color-accent-hover:#f0383d; --color-accent-text:#ff6b6f; --color-on-accent:#fff;
    --color-danger:#ff8f88; --color-danger-bg:#3b1614; --color-success:#5fd29a;
    --color-success-bg:#12301f; --color-warning:#f5c451; --color-warning-bg:#3a2d0a;
    --color-info:#8fb3ff; --color-info-bg:#14233f; color-scheme:dark;
  }
}
:root[data-theme="dark"] {
  --color-bg:#111; --color-surface:#1b1b1e; --color-border:#2d2d33; --color-border-input:#8b8b96;
  --color-text:#f5f5f6; --color-text-muted:#a8a8b2; --color-accent:#e31e24;
  --color-accent-hover:#f0383d; --color-accent-text:#ff6b6f; --color-on-accent:#fff;
  --color-danger:#ff8f88; --color-danger-bg:#3b1614; --color-success:#5fd29a;
  --color-success-bg:#12301f; --color-warning:#f5c451; --color-warning-bg:#3a2d0a;
  --color-info:#8fb3ff; --color-info-bg:#14233f; color-scheme:dark;
}
html { font-family:var(--font-sans); color:var(--color-text); background:var(--color-bg); }
:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px; }
@media (prefers-reduced-motion:reduce) { * { transition-duration:0ms !important; animation-duration:0ms !important; } }`;
fs.writeFileSync(path.join(designDir, "tokens.css"), tokensCss);

execFileSync("npm", ["install", "--include=dev", "--no-audit", "--no-fund"], { cwd: root, stdio: "inherit" });
execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
