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
for (const [encodedName, outputName] of [
  ["tailwind-preset.b64", "tailwind.preset.js"],
  ["tokens-css.b64", "tokens.css"],
]) {
  const source = fs.readFileSync(path.join(root, encodedName), "utf8").trim();
  fs.writeFileSync(path.join(designDir, outputName), Buffer.from(source, "base64"));
  fs.unlinkSync(path.join(root, encodedName));
}

execFileSync("npm", ["install", "--include=dev", "--no-audit", "--no-fund"], { cwd: root, stdio: "inherit" });
execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
