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
fs.unlinkSync(archive);
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
