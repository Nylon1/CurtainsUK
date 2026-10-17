import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const base = join(root, "shopify-theme", "curtainsuk-dawn-16");
const overlay = join(root, "shopify-theme", "production-main-overlay");
const manifestPath = join(overlay, "manifest.json");
const folders = ["assets", "config", "layout", "locales", "sections", "snippets", "templates"];
const args = process.argv.slice(2);
const liveIndex = args.indexOf("--live");
const live = liveIndex >= 0 ? resolve(args[liveIndex + 1] ?? "") : null;
const outputIndex = args.indexOf("--output");
const output = outputIndex >= 0 ? resolve(args[outputIndex + 1] ?? "") : null;
const record = args.includes("--record");

if (record && !live) throw new Error("--record requires --live <pulled MAIN theme path>");
if (liveIndex >= 0 && (!args[liveIndex + 1] || !existsSync(live)))
  throw new Error("The pulled MAIN theme path does not exist");
if (outputIndex >= 0 && !args[outputIndex + 1]) throw new Error("--output requires a path");
if (output && (output === base || output === overlay || output === root || output.startsWith(`${root}${sep}`)))
  throw new Error("Choose an output directory outside the source repository");
if (output && existsSync(output) && readdirSync(output).length)
  throw new Error("The output directory must be empty");

function files(directory) {
  const found = new Map();
  function visit(path) {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) found.set(relative(directory, child).split(sep).join("/"), child);
    }
  }
  for (const folder of folders) visit(join(directory, folder));
  return found;
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableJson(value[key])]));
  return value;
}

function digest(path, name) {
  const bytes = readFileSync(path);
  let data = bytes;
  if (name.endsWith(".json")) {
    const content = bytes.toString("utf8").replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "");
    data = Buffer.from(JSON.stringify(stableJson(JSON.parse(content))));
  } else if (/\.(?:css|js|mjs|liquid|svg|txt|html)$/.test(name)) {
    data = Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trimEnd());
  }
  return createHash("sha256").update(data).digest("hex");
}

const merged = files(base);
for (const [name, path] of files(overlay)) merged.set(name, path);
const expected = Object.fromEntries([...merged].sort(([a], [b]) => a.localeCompare(b))
  .map(([name, path]) => [name, digest(path, name)]));

if (live) {
  const actualFiles = files(live);
  const missing = Object.keys(expected).filter((name) => !actualFiles.has(name));
  const extra = [...actualFiles.keys()].filter((name) => !(name in expected));
  const changed = Object.keys(expected).filter((name) => actualFiles.has(name)
    && digest(actualFiles.get(name), name) !== expected[name]);
  if (missing.length || extra.length || changed.length)
    throw new Error(JSON.stringify({ missing, extra, changed }));
}

if (record) {
  writeFileSync(manifestPath, `${JSON.stringify({
    format: 1,
    themeId: 182339731835,
    sourceBase: "shopify-theme/curtainsuk-dawn-16",
    sourceOverlay: "shopify-theme/production-main-overlay",
    fileDigests: expected,
  }, null, 2)}\n`);
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const recorded = manifest.fileDigests;
  const missing = Object.keys(recorded).filter((name) => !(name in expected));
  const extra = Object.keys(expected).filter((name) => !(name in recorded));
  const changed = Object.keys(expected).filter((name) => recorded[name] && recorded[name] !== expected[name]);
  if (missing.length || extra.length || changed.length)
    throw new Error(JSON.stringify({ missing, extra, changed }));
}

if (output) {
  for (const [name, path] of merged) {
    const destination = join(output, name);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(path, destination);
  }
}

console.log(`Production MAIN theme source verified: ${Object.keys(expected).length} files${live ? " against live readback" : " against the recorded manifest"}.`);
