/**
 * AssistIO Store API — Cloudflare Worker + D1.
 *
 * Scope is deliberately small: the catalog is static (docs/store/catalog.json),
 * so this API only provides what a static file cannot:
 *
 *   GET  /v1/health
 *   GET  /v1/stats?ids=a,b,c        aggregated install counters
 *   POST /v1/events/install         count one install (privacy-preserving)
 *   POST /v1/submissions            submit a public manifest for review
 *   GET  /v1/submissions            admin: list submissions
 *   POST /v1/submissions/:id/review admin: approve or reject
 *
 * Deploy from this folder:
 *   wrangler d1 create assistio-store
 *   wrangler d1 execute assistio-store --file=schema.sql --remote
 *   wrangler secret put ADMIN_TOKEN
 *   wrangler secret put IP_SALT
 *   wrangler deploy
 */

const SCHEMA = 1;
const MAX_IDS = 50;
const MAX_BODY = 16 * 1024;
const KINDS = new Set(["skill", "extension", "app", "forge"]);
const PLATFORMS = new Set(["desktop", "web", "android"]);
const ID_RE = /^[a-z0-9]+(?:\.[a-z0-9][a-z0-9-]*)+$/;
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...cors, "access-control-max-age": "86400" } });
    }

    try {
      if (url.pathname === "/" && request.method === "GET") {
        return json({
          service: "assistio-store-api",
          schema: SCHEMA,
          catalog: "https://github.com/raxiomlab/assistio",
          docs: "docs/store/backend/README.md"
        }, 200, cors);
      }

      if (url.pathname === "/v1/health" && request.method === "GET") {
        return json({ ok: true, schema: SCHEMA, time: new Date().toISOString() }, 200, cors);
      }

      if (url.pathname === "/v1/stats" && request.method === "GET") {
        return await stats(url, env, cors);
      }

      if (url.pathname === "/v1/events/install" && request.method === "POST") {
        return await recordInstall(request, env, cors);
      }

      if (url.pathname === "/v1/submissions" && request.method === "POST") {
        return await createSubmission(request, env, cors);
      }

      if (url.pathname === "/v1/submissions" && request.method === "GET") {
        return await listSubmissions(request, env, cors);
      }

      const review = url.pathname.match(/^\/v1\/submissions\/([a-f0-9-]{20,40})\/review$/);
      if (review && request.method === "POST") {
        return await reviewSubmission(request, env, cors, review[1]);
      }

      return json({ error: "not_found" }, 404, cors);
    } catch (error) {
      console.error("store_api_error", error && error.message);
      return json({ error: "internal_error" }, 500, cors);
    }
  },

  async scheduled(_event, env) {
    const day = new Date().toISOString().slice(0, 10);
    const seenCutoff = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
    const dailyCutoff = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM install_seen WHERE day < ?").bind(seenCutoff),
      env.DB.prepare("DELETE FROM install_daily WHERE day < ?").bind(dailyCutoff),
      env.DB.prepare("DELETE FROM rate_limits WHERE day < ?").bind(day)
    ]);
  }
};

/* ------------------------------------------------------------------ routes */

async function stats(url, env, cors) {
  const ids = (url.searchParams.get("ids") || "")
    .split(",").map((id) => id.trim()).filter(Boolean).slice(0, MAX_IDS);

  if (ids.some((id) => !ID_RE.test(id))) {
    return json({ error: "invalid_ids" }, 400, cors);
  }

  let rows;
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    rows = await env.DB.prepare(
      `SELECT item_id AS id, installs FROM item_stats WHERE item_id IN (${placeholders})`
    ).bind(...ids).all();
  } else {
    rows = await env.DB.prepare(
      "SELECT item_id AS id, installs FROM item_stats ORDER BY installs DESC LIMIT 100"
    ).all();
  }

  return json(
    { items: (rows.results || []).map((row) => ({ id: row.id, installs: row.installs })) },
    200,
    { ...cors, "cache-control": "public, max-age=60" }
  );
}

async function recordInstall(request, env, cors) {
  if (!originAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403, cors);
  const body = await readJson(request);
  if (!body) return json({ error: "invalid_body" }, 400, cors);

  const id = String(body.id || "");
  const version = String(body.version || "");
  const kind = String(body.kind || "");
  const platform = String(body.platform || "web");
  const ref = String(body.ref || "store").slice(0, 32);

  if (!ID_RE.test(id) || !VERSION_RE.test(version) || !KINDS.has(kind) || !PLATFORMS.has(platform)) {
    return json({ error: "invalid_event" }, 400, cors);
  }

  const day = new Date().toISOString().slice(0, 10);
  const ipHash = await hashIp(request, env, day);
  if (!(await allow(env, `install:${ipHash}`, day, 120))) {
    return json({ error: "rate_limited" }, 429, cors);
  }

  const seen = await env.DB.prepare(
    "INSERT OR IGNORE INTO install_seen (day, item_id, ip_hash) VALUES (?, ?, ?)"
  ).bind(day, id, ipHash).run();

  const counted = !seen.meta || seen.meta.changes !== 0;
  if (counted) {
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO item_stats (item_id, installs, updated_at) VALUES (?, 1, ?)
         ON CONFLICT(item_id) DO UPDATE SET installs = installs + 1, updated_at = excluded.updated_at`
      ).bind(id, now),
      env.DB.prepare(
        `INSERT INTO install_daily (day, item_id, version, kind, platform, ref, count)
         VALUES (?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(day, item_id, version, platform, ref) DO UPDATE SET count = count + 1`
      ).bind(day, id, version, kind, platform, ref)
    ]);
  }

  return json({ ok: true, counted }, 202, cors);
}

async function createSubmission(request, env, cors) {
  if (!originAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403, cors);
  const body = await readJson(request);
  if (!body) return json({ error: "invalid_body" }, 400, cors);

  // Honeypot: real users never fill this hidden field.
  if (body.website) return json({ ok: true }, 201, cors);

  const manifestUrl = String(body.manifestUrl || "");
  const contact = String(body.contact || "").trim();
  const notes = String(body.notes || "").trim();
  const kind = body.kind ? String(body.kind) : null;

  let parsed;
  try { parsed = new URL(manifestUrl); } catch { parsed = null; }
  if (!parsed || parsed.protocol !== "https:" || !/\/manifest\.json$/i.test(parsed.pathname)) {
    return json({ error: "manifest_url_must_be_https_manifest_json" }, 400, cors);
  }
  if (contact.length < 3 || contact.length > 200) return json({ error: "invalid_contact" }, 400, cors);
  if (notes.length > 2000) return json({ error: "notes_too_long" }, 400, cors);
  if (kind && !KINDS.has(kind)) return json({ error: "invalid_kind" }, 400, cors);

  const day = new Date().toISOString().slice(0, 10);
  const ipHash = await hashIp(request, env, day);
  if (!(await allow(env, `submit:${ipHash}`, day, 3))) {
    return json({ error: "rate_limited" }, 429, cors);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO submissions (id, manifest_url, kind, contact, notes, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(id, parsed.href, kind, contact, notes, now).run();

  return json({ id, status: "pending", review: "A human reviews every submission before it is listed." }, 201, cors);
}

async function listSubmissions(request, env, cors) {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401, cors);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";
  if (!["pending", "approved", "rejected", "all"].includes(status)) {
    return json({ error: "invalid_status" }, 400, cors);
  }
  const rows = status === "all"
    ? await env.DB.prepare("SELECT * FROM submissions ORDER BY created_at DESC LIMIT 100").all()
    : await env.DB.prepare("SELECT * FROM submissions WHERE status = ? ORDER BY created_at DESC LIMIT 100").bind(status).all();
  return json({ items: rows.results || [] }, 200, cors);
}

async function reviewSubmission(request, env, cors, id) {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401, cors);
  const body = await readJson(request);
  if (!body) return json({ error: "invalid_body" }, 400, cors);
  const status = String(body.status || "");
  const note = String(body.note || "").slice(0, 1000);
  if (status !== "approved" && status !== "rejected") {
    return json({ error: "status_must_be_approved_or_rejected" }, 400, cors);
  }
  const result = await env.DB.prepare(
    "UPDATE submissions SET status = ?, review_note = ?, reviewed_at = ? WHERE id = ?"
  ).bind(status, note, new Date().toISOString(), id).run();
  if (!result.meta || result.meta.changes === 0) return json({ error: "not_found" }, 404, cors);
  return json({ ok: true, id, status }, 200, cors);
}

/* ---------------------------------------------------------------- helpers */

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...headers
    }
  });
}

function corsHeaders(origin, env) {
  const allowed = allowedOrigins(env);
  if (!origin) return { vary: "Origin" };
  if (allowed.includes("*")) {
    return {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-max-age": "86400",
      vary: "Origin"
    };
  }
  if (!allowed.includes(origin)) return { vary: "Origin" };
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    vary: "Origin"
  };
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "")
    .split(",").map((value) => value.trim()).filter(Boolean);
}

function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // non-browser clients (assistio itself) are fine
  const allowed = allowedOrigins(env);
  return allowed.includes("*") || allowed.includes(origin);
}

async function readJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY) return null;
  const text = await request.text();
  if (!text || text.length > MAX_BODY) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

async function hashIp(request, env, day) {
  const ip = request.headers.get("CF-Connecting-IP")
    || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || "unknown";
  const salt = env.IP_SALT || "assistio-store-local-salt";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${day}|${salt}`));
  return Array.from(new Uint8Array(digest)).slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function allow(env, key, day, limit) {
  await env.DB.prepare(
    `INSERT INTO rate_limits (bucket, day, count) VALUES (?, ?, 1)
     ON CONFLICT(bucket) DO UPDATE SET count = count + 1`
  ).bind(key, day).run();
  const row = await env.DB.prepare("SELECT count FROM rate_limits WHERE bucket = ?").bind(key).first();
  return !row || row.count <= limit;
}

function isAdmin(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token) return false;
  const header = request.headers.get("authorization") || "";
  const value = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (value.length !== token.length) return false;
  // Constant-time comparison for the shared secret.
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= value.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
