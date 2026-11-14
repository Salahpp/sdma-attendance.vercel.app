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

const presetB64 = fs.readFileSync(path.join(root, "tailwind-preset.b64"), "utf8").trim();
const presetPath = path.join(root, "replica", "design", "tailwind.preset.js");
fs.mkdirSync(path.dirname(presetPath), { recursive: true });
fs.writeFileSync(presetPath, Buffer.from(presetB64, "base64"));
fs.unlinkSync(path.join(root, "tailwind-preset.b64"));

execFileSync("npm", ["install", "--include=dev", "--no-audit", "--no-fund"], { cwd: root, stdio: "inherit" });
execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
