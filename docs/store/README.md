# AssistIO Store — public contract

One catalog, two surfaces:

- **`docs/store.html`** — the browsable storefront (search, filters, permalinks).
- **The AssistIO app** — reads the same `catalog.json`, shows the same resources,
  and receives installs through the same `assistio://` permalink.

The website never installs anything. It hands the resource to the operating
system; AssistIO verifies the definition and asks the user to confirm.

> **This repository is public.** Every file under `docs/store/` is published.
> Never add internal URLs, customer data, tokens, private keys, local paths,
> unreleased roadmap or anything that is not meant to be read by anyone.

---

## Layout

```
docs/
  store.html                    storefront (single file, no dependencies)
  store/
    catalog.json                generated index — the contract both surfaces read
    schema/
      catalog.schema.json       JSON Schema for the catalog
      item.schema.json          JSON Schema for one manifest
    taxonomy.json               kinds + tag vocabulary (source of truth)
    config.json                 optional apiBase / links
    README.md                   this file
    items/
      skills/<slug>/manifest.json + assets
      extensions/<slug>/manifest.json
      apps/<slug>/manifest.json + app/index.html
      forge/<slug>/manifest.json
    backend/
      openapi.yaml              Store API contract
      schema.sql                D1 schema
      worker.js                 Cloudflare Worker
      README.md                 deploy + privacy + moderation
tools/
  store-build.mjs               validates items and regenerates catalog.json
```

Source of truth = `items/**/manifest.json` + `taxonomy.json`.
`catalog.json` is generated; never edit it by hand.

---

## Quick start

```bash
# any static server works (the store uses fetch, so file:// will not work)
npx serve docs            # or: python -m http.server -d docs 8000

# open http://localhost:8000/store.html
```

Rebuild the catalog after any manifest change:

```bash
node tools/store-build.mjs          # validates + writes docs/store/catalog.json
node tools/store-build.mjs --check  # CI: fails if catalog is stale or invalid
```

The build rejects unknown tags, duplicate ids, missing entry files, absolute
paths, obvious secrets, oversized files, and any `id` that does not follow
`<publisher>.<kind>.<slug>`.

---

## Manifest anatomy

One folder per resource. The manifest is the complete, public definition.

```json
{
  "schemaVersion": 1,
  "id": "acme.skill.meeting-notes",
  "kind": "skill",
  "slug": "meeting-notes",
  "version": "1.0.0",
  "channel": "stable",
  "publisher": {
    "id": "acme",
    "name": "Acme",
    "url": "https://example.com",
    "verified": false
  },
  "license": "MIT",
  "createdAt": "2026-11-23",
  "updatedAt": "2026-11-23",
  "featured": false,
  "icon": "users",
  "locales": {
    "en": {
      "name": "Meeting notes",
      "summary": "Turns a transcript into decisions, owners and deadlines.",
      "readme": "## What it does\n\n…markdown…"
    },
    "pt": { "name": "Notas de reunião", "summary": "…", "readme": "…" }
  },
  "tags": ["productivity", "team"],
  "platforms": ["desktop", "web"],
  "requires": {
    "assistio": ">=0.9.0",
    "network": false,
    "runtime": "declarative",
    "tools": ["read_file"],
    "credentials": []
  },
  "permissions": [
    {
      "id": "fs.read",
      "risk": "medium",
      "label": { "en": "Read workspace files", "pt": "Ler arquivos do workspace" },
      "reason": { "en": "Reads the transcript you select.", "pt": "Lê a transcrição que você selecionar." }
    }
  ],
  "entry": { "type": "skill", "path": "SKILL.md" },
  "changelog": [
    { "version": "1.0.0", "date": "2026-11-23", "notes": { "en": "First release.", "pt": "Primeira versão." } }
  ]
}
```

Full rules: [`schema/item.schema.json`](schema/item.schema.json).

### Per kind

| Kind | Entry | Extra | Notes |
|---|---|---|---|
| `skill` | `entry.path` → `SKILL.md` | — | Instructions + optional resources. |
| `extension` | `entry.type: "extension"` | `contributes` | Declarative only: commands, agents, prompts, settings, theme. |
| `app` | `entry.path` → `app/index.html` | `entry.width/height/sandbox` | Static HTML/CSS/JS. No Node, no bundler. |
| `forge` | `entry.type: "forge"` | `definition` | Declarative tool: `http`, `file.read`, `csv.parse`, `dataset.profile`, `prompt`, `template`. |

### Permissions vocabulary

`fs.read`, `fs.write`, `net.read`, `shell.run`, `git.read`, `app.storage`,
`downloads.write`, `clipboard.write`, `secrets.read`, `kanban.write`,
`ui.commands`, `ui.theme`, `agents.install`, `prompts.install`, `settings.write`.

Every permission needs a localized **label** and **reason**. The app shows both
at install time. A definition that asks for more than its `reason` explains is
rejected in review.

### Credentials

Credentials are references, never values:

```json
"credentials": [
  {
    "id": "github_token",
    "label": { "en": "GitHub token", "pt": "Token do GitHub" },
    "kind": "api-key",
    "required": true,
    "secretRef": "github.token"
  }
]
```

`secretRef` points into the local vault. The build fails if a credential object
contains a `value` field.

---

## Catalog

Generated by `tools/store-build.mjs`. A trimmed item:

```json
{
  "id": "raxiomlab.skill.research-brief",
  "kind": "skill",
  "slug": "research-brief",
  "version": "1.0.0",
  "channel": "stable",
  "name": { "en": "Deep research brief", "pt": "Briefing de pesquisa profunda" },
  "summary": { "en": "…", "pt": "…" },
  "tags": ["research", "writing", "web"],
  "platforms": ["desktop", "web", "android"],
  "publisher": { "id": "raxiomlab", "name": "RaxiomLab", "verified": true },
  "license": "Proprietary-Free-Use",
  "icon": "search",
  "verified": true,
  "featured": true,
  "path": "items/skills/research-brief/manifest.json",
  "sha256": "<sha256 of manifest.json>",
  "size": 4689,
  "files": [
    { "path": "SKILL.md", "sha256": "<sha256>", "size": 1834 }
  ],
  "updatedAt": "2026-11-23"
}
```

- `path` is relative to the catalog file.
- `sha256` covers the exact bytes of the manifest.
- `files` covers every other file in the item folder.
- `verified` means the publisher identity was checked by maintainers. It is not a
  security audit.
- `featured` is editorial, set only by maintainers.

The app should verify **the manifest hash before parsing** and every downloaded
file hash before writing it to disk.

---

## Permalinks and deep links

### Stable web permalinks

| Link | Behavior |
|---|---|
| `…/store.html?r=<id>` | Opens the resource page. |
| `…/store.html?r=<id>&install=1` | Opens the page **and** hands the install to AssistIO. |
| `…/store/items/<kind>/<slug>/manifest.json` | Raw public definition. |

`<id>` is `publisher.kind.slug`. The readable slug is also accepted
(`?r=research-brief`) and canonicalized to the full id.

Permalinks are permanent. Never reuse an id for a different resource; publish a
new id and mark the old one as superseded in its changelog.

### Install deep link

```
assistio://install
  ?id=raxiomlab.skill.research-brief
  &type=skill
  &v=1.0.0
  &src=https%3A%2F%2F…%2Fmanifest.json
  &catalog=https%3A%2F%2F…%2Fcatalog.json
  &sha256=<64 hex>
  &ref=store
```

| Param | Required | Meaning |
|---|---|---|
| `id` | yes | Catalog id. Must match the fetched manifest. |
| `type` | yes | `skill` \| `extension` \| `app` \| `forge`. Must match. |
| `v` | yes | Expected version. Must match. |
| `src` | yes | HTTPS URL of the manifest (`http://localhost` is allowed in dev builds). |
| `catalog` | no | Canonical catalog, for context and future verification. |
| `sha256` | yes | Expected hash of the manifest bytes. |
| `ref` | no | Coarse source tag, max 32 chars. |

Optional navigation link:

```
assistio://open?route=store&item=raxiomlab.skill.research-brief
```

### What the app must do

1. Register `assistio://` with the operating system (desktop and Android).
2. Parse the link; reject anything that is not `https` for `src` (allow
   `http://localhost` only in development builds). Pin `src` to the catalog
   origin, or to an explicit allowlist of publishers you trust.
3. Download the manifest, hash the **raw bytes**, compare with `sha256`.
4. Parse; require `schemaVersion === 1` (refuse unknown versions), then require
   `manifest.id === id`, `manifest.kind === type`, `manifest.version === v`.
5. Show a confirmation sheet: name, publisher + verified badge, version, source
   host, size, requested permissions, credentials, runtime.
6. On confirm: download every file in the catalog `files` list, verify each hash,
   write into a per-resource directory, register the capability.
7. Record an audit entry: source URL, hash, permissions, timestamp.
8. Never auto-install, never install silently on update, never reuse permissions
   from a previous version. On update, show the permission diff.

If any check fails, install nothing and explain which check failed.

### Browser fallback

Browsers may block the custom scheme or show a one-time confirmation. The
storefront therefore:

1. Navigates to `assistio://install?…` immediately.
2. If the page is still visible after ~1.8 s, shows a sheet with:
   - copy install link,
   - download manifest,
   - a link to this document.

The website must never claim the install succeeded; only the app can know that.

### OS registration

The app installer registers the scheme once, then every permalink works:

| Platform | Registration |
|---|---|
| **Windows** | `HKEY_CLASSES_ROOT\assistio` with `"URL Protocol"=""` and a `shell\open\command` of `"<install path>\AssistIO.exe" "%1"`. |
| **macOS** | `CFBundleURLTypes` → `CFBundleURLSchemes = ["assistio"]` in `Info.plist`. The app receives the URL in `application(_:open:)`. |
| **Linux** | A `.desktop` entry with `MimeType=x-scheme-handler/assistio`. |
| **Android** | An intent filter for `android.intent.action.VIEW` with `<data android:scheme="assistio"/>`. |

Register the scheme; never register a second one. If the user uninstalls AssistIO,
the OS should remove the handler.

### Web app limitation

A browser tab cannot open an OS-registered scheme without user interaction in
some browsers, and an HTTPS page cannot receive the app's result. The permalink is
still useful on web: it copies the install link and lets the user paste it into
AssistIO → Store. Desktop and Android get the one-click flow.

---

## Publishing

1. **Create the folder**
   `docs/store/items/<kind>/<slug>/` with `manifest.json` and its assets.
2. **Fill the manifest** (bilingual `en` + `pt` is strongly preferred).
3. **Validate + generate**
   ```bash
   node tools/store-build.mjs
   node tools/store-build.mjs --check
   ```
4. **Open a pull request** with the folder and the regenerated `catalog.json`.
5. **Review.** Maintainers check schema, permissions, hashes, licensing, and that
   every claim in the readme is accurate. First-party items may receive
   `publisher.verified: true` and `featured: true`; community items do not, unless
   the publisher completes verification.

Community submissions can also be sent through the Store API
(`POST /v1/submissions`) or by email — see [backend/README.md](backend/README.md).

### Review checklist

- [ ] Id follows `<publisher>.<kind>.<slug>` and is unique.
- [ ] Entry file exists and is inside the item folder.
- [ ] No absolute paths, no localhost, no tokens, no private keys.
- [ ] Every permission has a reason that matches the implementation.
- [ ] Credentials are references only.
- [ ] Apps are static and declare a strict sandbox; no remote scripts.
- [ ] Forge definitions use declarative steps; no executable code.
- [ ] Changelog version equals the manifest version.
- [ ] Readme explains limits and does not promise what the resource cannot do.
- [ ] `node tools/store-build.mjs --check` passes.

---

## Security model

- **HTTPS only** for `src`; the app should also pin the expected host if the
  catalog is served from a known domain.
- **SHA-256** is mandatory in v1. It protects against a truncated or swapped
  manifest, not against a compromised catalog.
- **No silent execution.** Skills are instructions; extensions are declarative;
  Forge plugins are declarative; apps run in a sandboxed view. The only executable
  content is app HTML/JS, and it gets no Node, shell or network by default.
- **No secrets in manifests.** Values are rejected by the build and by review.
- **Permissions are shown, not inferred.** A resource that needs the network says
  so; one that reads files says which permission and why.
- **Verified ≠ safe.** The badge means the publisher identity is known. Read the
  permissions.
- **Removal is local.** Uninstalling removes the files and its stored data; the
  audit log keeps the record.

### Signatures (roadmap, not v1)

The catalog format leaves room for:

```json
"signature": { "alg": "ed25519", "keyId": "raxiomlab-2026", "value": "base64…" }
```

Do not publish a `signature` field until the app actually verifies it and public
keys live in `docs/store/keys/`. A decorative signature is worse than none.

---

## Versioning

- Semver: `MAJOR.MINOR.PATCH`.
- `changelog[0].version` must equal `version`.
- `breaking: true` when an update changes permissions, inputs or stored data in a
  way that can break an existing install.
- `channel`: `stable` (default), `beta`, `nightly`. The public catalog is stable;
  beta items can be added later with an app opt-in.
- The app should keep the previous version until the new one is verified, so a
  failed update never leaves a broken install.

---

## App parity checklist

The in-app store is not a different product; it is the same contract with a native
shell.

- [ ] Read the catalog from a configurable base URL (default: the public one).
- [ ] Use the same search/filter semantics and the same kind labels.
- [ ] Build the deep link with the exact parameter names above.
- [ ] Verify manifest and file hashes before installing.
- [ ] Show publisher, version, source host, permissions and credentials.
- [ ] Require an explicit confirmation, including on updates.
- [ ] Keep an audit log and a one-click uninstall.
- [ ] Work offline with the last known catalog; mark data as cached.
- [ ] Post install events only if the user has telemetry enabled (off by default
  is a valid choice).
- [ ] Never trust the catalog for execution; validate the manifest again.

---

## FAQ

**Why JSON instead of a database?**
The catalog is small, reviewable in a pull request, cacheable on a CDN, and works
offline. A database would add a second source of truth for the same facts.

**Why both a web permalink and a deep link?**
The web permalink is shareable and indexable. The deep link is what the OS hands
to the app. The install permalink (`&install=1`) does both in one click.

**Can a resource phone home?**
Only if it declares `net.read` and the app shows it. Skills have no runtime;
extensions and Forge plugins are declarative; apps are sandboxed. A resource that
needs network access must say why.

**How are installs counted?**
Optionally, through the Store API: one count per item, per hashed IP, per day. No
cookies, accounts or raw IPs. See [backend/README.md](backend/README.md).

**What happens if the API is down?**
The storefront still browses, filters and installs. Counters disappear; nothing
else changes.
