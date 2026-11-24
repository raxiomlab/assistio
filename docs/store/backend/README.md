# Store API

The store works without a backend: `docs/store/catalog.json` is a static file and
installs happen through the `assistio://` deep link. This API exists for the three
things a static file cannot do:

1. **Install counters** — so "9 resources" is not the only number in the store.
2. **Privacy-safe install events** — no accounts, no cookies, no free-form data.
3. **Community submissions** — a reviewed queue instead of anonymous pull requests.

The catalog stays canonical. The API never decides what exists; it only counts and
collects proposals. That keeps the website, the app and the repository in sync even
if the API is down.

```
docs/store/catalog.json ──► website
        │
        ├───────────────► AssistIO app
        │
        └── GET /v1/stats ──► counters (optional overlay)
```

---

## Deploy

Requirements: a Cloudflare account and `wrangler` v3+.

```bash
cd docs/store/backend

wrangler d1 create assistio-store
# copy the database_id into wrangler.toml
cp wrangler.toml.example wrangler.toml

wrangler d1 execute assistio-store --file=schema.sql --remote

wrangler secret put ADMIN_TOKEN     # long random string
wrangler secret put IP_SALT         # long random string, rotate quarterly

wrangler deploy
```

Then point the storefront at it:

```json
// docs/store/config.json
{ "apiBase": "https://assistio-store-api.<account>.workers.dev" }
```

Add the site origin to `ALLOWED_ORIGINS` (exact scheme + host + port, no trailing
slash). Read endpoints are public; `POST` endpoints check the origin.

Local development:

```bash
wrangler dev --local
# http://127.0.0.1:8787/v1/health
```

---

## Endpoints

Full contract: [openapi.yaml](openapi.yaml).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/v1/health` | no | Liveness + schema version |
| `GET` | `/v1/stats?ids=…` | no | Aggregated install counters (max 50 ids) |
| `POST` | `/v1/events/install` | origin | Count one install |
| `POST` | `/v1/submissions` | origin | Submit a manifest URL for review |
| `GET` | `/v1/submissions?status=` | bearer | Admin queue |
| `POST` | `/v1/submissions/{id}/review` | bearer | Approve or reject |

### Count an install

```bash
curl -X POST "$API/v1/events/install" \
  -H 'content-type: application/json' \
  -d '{"id":"raxiomlab.skill.research-brief","version":"1.0.0","kind":"skill","platform":"web","ref":"store"}'
```

Response: `202 {"ok":true,"counted":true}`.

The endpoint accepts only the six fields above. Anything else is ignored, and
there is no field where a user identifier could accidentally be sent.

### Read counters

```bash
curl "$API/v1/stats?ids=raxiomlab.skill.research-brief,raxiomlab.forge.feed-digest"
```

```json
{ "items": [ { "id": "raxiomlab.skill.research-brief", "installs": 128 } ] }
```

### Submit a resource

```bash
curl -X POST "$API/v1/submissions" \
  -H 'content-type: application/json' \
  -d '{
    "manifestUrl": "https://example.com/store/items/skills/my-skill/manifest.json",
    "contact": "you@example.com",
    "kind": "skill",
    "notes": "First public release, Apache-2.0."
  }'
```

The submission is stored as `pending`. Approval does **not** publish it: a
maintainer still reviews the manifest, adds it to `docs/store/items/`, runs
`node tools/store-build.mjs`, and merges a pull request. The API is an inbox, not
a deployment pipeline.

---

## Privacy

The install endpoint is intentionally boring:

- The IP is hashed with `sha256(ip | day | IP_SALT)`, truncated to 16 bytes, and
  stored only inside the dedupe table (`install_seen`).
- Raw IPs are never logged or stored. There is no analytics vendor.
- One install counts per item, per IP hash, per day — reloading the page does not
  inflate the number.
- `install_seen` rows are deleted after 45 days. Daily aggregates are kept for
  400 days. Rate-limit rows are deleted daily.
- No cookies, accounts, device fingerprints, user agents, or free-form text.
- Submissions store the contact the person chose to provide; that is the only
  personal data in the system, and it is used only to answer the review.

If you self-host, you are the data controller. Document your own retention.

---

## Abuse and limits

| Action | Limit |
|---|---|
| Install events | 120 per IP hash per day |
| Submissions | 3 per IP hash per day |
| Request body | 16 KB |
| Stats ids | 50 per request |

Additional protections:

- `ALLOWED_ORIGINS` for browser `POST`s.
- Honeypot `website` field on submissions.
- Manifest URL must be `https://…/manifest.json`; no uploads.
- Admin endpoints require `Authorization: Bearer $ADMIN_TOKEN`, compared in
  constant time.
- No endpoint writes to the repository, so a compromised token cannot publish
  code. The worst case is a noisy queue.

Counts are approximate by design. Do not use them for billing or contractual
claims.

---

## Moderation flow

1. `GET /v1/submissions?status=pending` with the admin token.
2. Fetch the manifest, read its permissions, and check that every referenced file
   is public and inside the item folder.
3. Run the store build locally; it validates the schema, rejects private paths and
   secrets, and hashes every file.
4. Open a pull request with the item folder + regenerated catalog.
5. Mark the submission `approved` or `rejected` with a short review note.

---

## What is intentionally not here

- **Search** — the catalog is small enough to filter in the browser; adding a
  search index would add a second source of truth.
- **Ratings and reviews** — no accounts yet; anonymous ratings are not worth the
  moderation cost.
- **Payments** — everything is free to install.
- **Signed manifests** — SHA-256 integrity is in v1. Ed25519 publisher signatures
  belong in v2, with public keys in `docs/store/keys/` and a `signature` field in
  the catalog. Do not fake it in the meantime.
- **Bundle downloads** — the app fetches the manifest and files listed in the
  catalog and verifies each SHA-256. A server-side `.zip` can come later without
  changing the catalog contract.

---

## Operations checklist

- [ ] `wrangler secret put IP_SALT` and rotate it quarterly.
- [ ] `ALLOWED_ORIGINS` contains only the production origin (plus local dev).
- [ ] Cron trigger enabled (`17 4 * * *`) for pruning.
- [ ] `GET /v1/health` monitored.
- [ ] Admin token stored in a password manager, never in the repo.
- [ ] `docs/store/config.json` uses an `https://` API base.
- [ ] Counters backed up with `wrangler d1 export` before schema changes.
