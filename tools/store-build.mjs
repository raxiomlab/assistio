#!/usr/bin/env node
/**
 * AssistIO Store builder.
 *
 * Source of truth: docs/store/items/<kind>/<slug>/manifest.json
 * Output:          docs/store/catalog.json  (the file both the website and the
 *                  AssistIO app read)
 *
 * Usage:
 *   node tools/store-build.mjs           # regenerate the catalog
 *   node tools/store-build.mjs --check   # fail if the catalog is stale or invalid
 *
 * Dependency-free on purpose: this repo has no build step and no node_modules.
 */
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORE = path.join(ROOT, "docs", "store");
const ITEMS = path.join(STORE, "items");
const TAXONOMY = path.join(STORE, "taxonomy.json");
const CATALOG = path.join(STORE, "catalog.json");

const KINDS = ["skill", "extension", "app", "forge"];
const PLATFORMS = ["desktop", "web", "android"];
const RISKS = ["low", "medium", "high"];
const CHANNELS = ["stable", "beta", "nightly"];
const PERMISSIONS = [
  "fs.read", "fs.write", "net.read", "shell.run", "git.read", "app.storage",
  "downloads.write", "clipboard.write", "secrets.read", "kanban.write",
  "ui.commands", "ui.theme", "agents.install", "prompts.install", "settings.write"
];
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const ID = /^[a-z0-9]+(?:\.[a-z0-9][a-z0-9-]*)+$/;
const SLUG = /^[a-z0-9][a-z0-9-]{1,40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ITEM_FILE_BYTES = 1_500_000;
const MAX_FILES = 30;

const checkMode = process.argv.includes("--check");
const errors = [];
const warnings = [];

const fail = (where, message) => errors.push(`${where}: ${message}`);
const warn = (where, message) => warnings.push(`${where}: ${message}`);
const rel = (p) => path.relative(ROOT, p).replaceAll("\\", "/");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function requireString(obj, key, where, { min = 1, max = 100000, pattern = null } = {}) {
  const value = obj?.[key];
  if (typeof value !== "string" || value.length < min || value.length > max) {
    fail(where, `"${key}" must be a string (min ${min}, max ${max})`);
    return null;
  }
  if (pattern && !pattern.test(value)) fail(where, `"${key}" has an invalid format: ${value}`);
  return value;
}

function checkL10n(value, where, keys) {
  if (!isObject(value)) { fail(where, "must be an object keyed by locale"); return; }
  if (typeof value.en !== "string" || !value.en.trim()) fail(where, 'must include a non-empty "en" string');
  for (const [key, text] of Object.entries(value)) {
    if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(key)) fail(where, `invalid locale key "${key}"`);
    if (typeof text !== "string" || !text.trim()) fail(where, `locale "${key}" must be a non-empty string`);
  }
}

async function listFiles(dir) {
  const out = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(full);
      else warn(rel(full), "ignored (not a regular file)");
    }
  }
  await walk(dir);
  return out.sort();
}

function publicSafetyScan(text, where) {
  const banned = [
    [/C:\\Users\\/i, "Windows user path"],
    [/\/(?:Users|home)\/[A-Za-z0-9._-]+\//, "absolute user path"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
    [/\bgh[pousr]_[A-Za-z0-9]{20,}/, "GitHub token"],
    [/\bsk-[A-Za-z0-9]{20,}/, "API key"],
    [/localhost:\d{2,5}/i, "localhost address"]
  ];
  for (const [re, label] of banned) {
    if (re.test(text)) fail(where, `possible non-public data detected (${label})`);
  }
}

function validateManifest(m, where, taxonomy) {
  if (!isObject(m)) { fail(where, "manifest must be a JSON object"); return null; }
  if (m.schemaVersion !== 1) fail(where, 'schemaVersion must be 1');
  const id = requireString(m, "id", where, { pattern: ID });
  const slug = requireString(m, "slug", where, { pattern: SLUG });
  const kind = m.kind;
  if (!KINDS.includes(kind)) fail(where, `kind must be one of ${KINDS.join(", ")}`);
  const version = requireString(m, "version", where, { pattern: SEMVER });
  if (m.channel && !CHANNELS.includes(m.channel)) fail(where, "invalid channel");

  if (!isObject(m.publisher)) fail(where, "publisher is required");
  else {
    requireString(m.publisher, "id", where + ".publisher", { pattern: SLUG });
    requireString(m.publisher, "name", where + ".publisher", { max: 80 });
    if (m.publisher.url && !/^https?:\/\//.test(m.publisher.url)) fail(where, "publisher.url must be http(s)");
    if (m.publisher.verified !== undefined && typeof m.publisher.verified !== "boolean") fail(where, "publisher.verified must be boolean");
    if (id && m.publisher.id && kind && slug && id !== `${m.publisher.id}.${kind}.${slug}`) {
      fail(where, `id convention is <publisher>.<kind>.<slug> — expected "${m.publisher.id}.${kind}.${slug}"`);
    }
  }

  requireString(m, "license", where, { min: 2, max: 80 });
  if (m.createdAt && !DATE.test(m.createdAt)) fail(where, "createdAt must be YYYY-MM-DD");
  if (m.updatedAt && !DATE.test(m.updatedAt)) fail(where, "updatedAt must be YYYY-MM-DD");

  if (!isObject(m.locales) || !m.locales.en) fail(where, "locales.en is required");
  else {
    for (const [locale, data] of Object.entries(m.locales)) {
      const lw = `${where}.locales.${locale}`;
      if (!isObject(data)) { fail(lw, "must be an object"); continue; }
      requireString(data, "name", lw, { min: 2, max: 80 });
      requireString(data, "summary", lw, { min: 10, max: 220 });
      requireString(data, "readme", lw, { min: 10, max: 12000 });
    }
  }

  if (!Array.isArray(m.tags) || m.tags.length < 1 || m.tags.length > 8) fail(where, "tags must contain 1–8 entries");
  else {
    if (new Set(m.tags).size !== m.tags.length) fail(where, "tags must be unique");
    for (const tag of m.tags) {
      if (!taxonomy.tags.some((t) => t.id === tag)) fail(where, `unknown tag "${tag}" (add it to taxonomy.json)`);
    }
  }

  if (!Array.isArray(m.platforms) || !m.platforms.length) fail(where, "platforms must be a non-empty array");
  else for (const p of m.platforms) if (!PLATFORMS.includes(p)) fail(where, `unknown platform "${p}"`);

  if (!isObject(m.requires)) fail(where, "requires is required");
  else {
    if (m.requires.network !== undefined && typeof m.requires.network !== "boolean") fail(where, "requires.network must be boolean");
    if (m.requires.tools !== undefined && !Array.isArray(m.requires.tools)) fail(where, "requires.tools must be an array");
    if (m.requires.credentials !== undefined) {
      if (!Array.isArray(m.requires.credentials)) fail(where, "requires.credentials must be an array");
      else for (const c of m.requires.credentials) {
        if (!isObject(c)) { fail(where, "credential entries must be objects"); continue; }
        requireString(c, "id", where + ".requires.credentials", { pattern: /^[a-z0-9][a-z0-9._-]*$/ });
        requireString(c, "kind", where + ".requires.credentials");
        if (!isObject(c.label)) fail(where, `credential "${c.id}" needs a localized label`);
        if (c.secretRef && !/^[a-z0-9][a-z0-9._-]*$/i.test(c.secretRef)) fail(where, `credential "${c.id}" secretRef must be a reference, not a value`);
        if (c.value !== undefined) fail(where, `credential "${c.id}" must never contain a value`);
      }
    }
  }

  if (!Array.isArray(m.permissions)) fail(where, "permissions must be an array");
  else {
    const seen = new Set();
    for (const p of m.permissions) {
      if (!isObject(p)) { fail(where, "permission entries must be objects"); continue; }
      if (!PERMISSIONS.includes(p.id)) fail(where, `unknown permission "${p.id}"`);
      if (seen.has(p.id)) fail(where, `duplicate permission "${p.id}"`);
      seen.add(p.id);
      if (!RISKS.includes(p.risk)) fail(where, `permission "${p.id}" has invalid risk`);
      if (!isObject(p.label) || typeof p.label.en !== "string") fail(where, `permission "${p.id}" needs label.en`);
      if (!isObject(p.reason) || typeof p.reason.en !== "string") fail(where, `permission "${p.id}" needs reason.en`);
    }
  }

  if (!isObject(m.entry)) fail(where, "entry is required");
  else {
    if (m.entry.type !== kind) fail(where, `entry.type must match kind (${kind})`);
    if (kind === "skill" || kind === "app") {
      requireString(m.entry, "path", where + ".entry");
      if (m.entry.path && (path.isAbsolute(m.entry.path) || m.entry.path.includes(".."))) fail(where, "entry.path must be a relative path inside the item folder");
    }
  }

  if (kind === "extension" && !isObject(m.contributes)) fail(where, "extensions require a contributes object");
  if (kind === "forge") {
    if (!isObject(m.definition)) fail(where, "forge items require a definition object");
    else {
      if (!isObject(m.definition.tool)) fail(where, "definition.tool is required");
      else requireString(m.definition.tool, "name", where + ".definition.tool", { pattern: /^[a-z][a-z0-9_]{2,40}$/ });
      if (!Array.isArray(m.definition.steps) || !m.definition.steps.length) fail(where, "definition.steps must be a non-empty array");
      if (m.definition.output === undefined) fail(where, "definition.output is required");
    }
  }

  if (!Array.isArray(m.changelog) || !m.changelog.length) fail(where, "changelog must be a non-empty array");
  else {
    for (const c of m.changelog) {
      if (!isObject(c)) { fail(where, "changelog entries must be objects"); continue; }
      if (!SEMVER.test(c.version || "")) fail(where, "changelog.version must be semver");
      if (!DATE.test(c.date || "")) fail(where, "changelog.date must be YYYY-MM-DD");
      if (c.notes !== undefined) checkL10n(c.notes, where + ".changelog.notes");
    }
    if (version && m.changelog[0]?.version !== version) fail(where, `changelog[0].version must equal the current version (${version})`);
  }

  return { id, slug, kind, version };
}

async function main() {
  let taxonomy;
  try {
    taxonomy = JSON.parse(await readFile(TAXONOMY, "utf8"));
  } catch (err) {
    console.error(`Cannot read taxonomy.json: ${err.message}`);
    process.exit(1);
  }
  if (taxonomy.schemaVersion !== 1) fail("taxonomy.json", "schemaVersion must be 1");
  if (!Array.isArray(taxonomy.kinds) || taxonomy.kinds.map((k) => k.id).join() !== KINDS.join()) {
    fail("taxonomy.json", `kinds must be exactly: ${KINDS.join(", ")}`);
  }
  if (!Array.isArray(taxonomy.tags) || !taxonomy.tags.length) fail("taxonomy.json", "tags must be a non-empty array");

  const manifestPaths = (await listFiles(ITEMS)).filter((p) => path.basename(p) === "manifest.json");
  if (!manifestPaths.length) fail("docs/store/items", "no manifests found");

  const seenIds = new Map();
  const seenSlugs = new Map();
  const catalogItems = [];

  for (const manifestPath of manifestPaths) {
    const itemDir = path.dirname(manifestPath);
    const where = rel(manifestPath);
    const raw = await readFile(manifestPath);
    let manifest;
    try {
      manifest = JSON.parse(raw.toString("utf8"));
    } catch (err) {
      fail(where, `invalid JSON: ${err.message}`);
      continue;
    }
    publicSafetyScan(raw.toString("utf8"), where);
    const meta = validateManifest(manifest, where, taxonomy);
    if (!meta) continue;

    if (seenIds.has(meta.id)) fail(where, `duplicate id "${meta.id}" (also in ${seenIds.get(meta.id)})`);
    seenIds.set(meta.id, where);
    if (seenSlugs.has(meta.slug)) fail(where, `duplicate slug "${meta.slug}" (also in ${seenSlugs.get(meta.slug)})`);
    seenSlugs.set(meta.slug, where);

    if (meta.kind === "skill" || meta.kind === "app") {
      const entryPath = path.resolve(itemDir, manifest.entry.path);
      if (!entryPath.startsWith(itemDir + path.sep)) {
        fail(where, "entry.path escapes the item folder");
      } else {
        try {
          const info = await stat(entryPath);
          if (!info.isFile()) fail(where, `entry.path is not a file: ${manifest.entry.path}`);
        } catch {
          fail(where, `entry.path does not exist: ${manifest.entry.path}`);
        }
      }
    }

    const files = [];
    for (const file of await listFiles(itemDir)) {
      if (file === manifestPath) continue;
      const info = await stat(file);
      if (info.size > MAX_ITEM_FILE_BYTES) {
        fail(rel(file), `file is too large (${info.size} bytes, max ${MAX_ITEM_FILE_BYTES})`);
        continue;
      }
      const bytes = await readFile(file);
      if (/\.(md|txt|html|css|js|mjs|json|ya?ml)$/i.test(file)) {
        publicSafetyScan(bytes.toString("utf8"), rel(file));
      }
      files.push({ path: path.relative(itemDir, file).replaceAll("\\", "/"), sha256: sha256(bytes), size: info.size });
    }
    if (files.length > MAX_FILES) fail(where, `too many files (${files.length}, max ${MAX_FILES})`);

    const updatedAt = manifest.updatedAt || manifest.changelog[0]?.date || manifest.createdAt;
    if (!updatedAt || !DATE.test(updatedAt)) fail(where, "updatedAt (or changelog date) is required");

    catalogItems.push({
      id: manifest.id,
      kind: manifest.kind,
      slug: manifest.slug,
      version: manifest.version,
      channel: manifest.channel || "stable",
      name: Object.fromEntries(Object.entries(manifest.locales).map(([locale, data]) => [locale, data.name])),
      summary: Object.fromEntries(Object.entries(manifest.locales).map(([locale, data]) => [locale, data.summary])),
      tags: manifest.tags,
      platforms: manifest.platforms,
      publisher: {
        id: manifest.publisher.id,
        name: manifest.publisher.name,
        ...(manifest.publisher.url ? { url: manifest.publisher.url } : {}),
        verified: manifest.publisher.verified === true
      },
      license: manifest.license,
      ...(manifest.icon ? { icon: manifest.icon } : {}),
      verified: manifest.publisher.verified === true,
      featured: manifest.featured === true,
      path: path.relative(STORE, manifestPath).replaceAll("\\", "/"),
      sha256: sha256(raw),
      size: raw.length,
      files,
      updatedAt
    });
  }

  const kindOrder = Object.fromEntries(KINDS.map((k, i) => [k, i]));
  catalogItems.sort((a, b) =>
    Number(b.featured) - Number(a.featured) ||
    kindOrder[a.kind] - kindOrder[b.kind] ||
    a.name.en.localeCompare(b.name.en, "en")
  );

  const catalog = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    channel: "stable",
    kinds: taxonomy.kinds,
    tags: taxonomy.tags,
    items: catalogItems
  };

  if (errors.length) {
    console.error(`\nStore build failed with ${errors.length} error(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    if (warnings.length) {
      console.error(`\nWarnings:`);
      for (const w of warnings) console.error(`  ! ${w}`);
    }
    process.exit(1);
  }

  const serialized = JSON.stringify(catalog, null, 2) + "\n";
  let previous = null;
  try { previous = await readFile(CATALOG, "utf8"); } catch { /* first build */ }

  if (checkMode) {
    let prevCatalog = null;
    try { prevCatalog = JSON.parse(previous); } catch { /* missing */ }
    const normalize = (c) => c && JSON.stringify({ ...c, generatedAt: "x" });
    if (!prevCatalog || normalize(prevCatalog) !== normalize(catalog)) {
      console.error("✗ docs/store/catalog.json is out of date. Run: node tools/store-build.mjs");
      process.exit(1);
    }
    console.log(`✓ Store OK — ${catalogItems.length} items, catalog is up to date.`);
    return;
  }

  await writeFile(CATALOG, serialized, "utf8");
  const verified = catalogItems.filter((i) => i.verified).length;
  const featured = catalogItems.filter((i) => i.featured).length;
  console.log(`✓ docs/store/catalog.json written`);
  console.log(`  ${catalogItems.length} items · ${verified} verified · ${featured} featured · ${KINDS.length} kinds`);
  for (const i of catalogItems) console.log(`  - ${i.kind.padEnd(9)} ${i.id} @ ${i.version}`);
  if (warnings.length) {
    console.log(`\nWarnings:`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
