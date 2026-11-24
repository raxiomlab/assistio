# Store: skills, extensions, apps & Forge

The Store is how you add capabilities to AssistIO without editing the app. It
holds four kinds of resources:

| Kind | What it is | Runtime |
|---|---|---|
| **Skill** | Instructions that teach the agent a repeatable method. | None — it is guidance. |
| **Extension** | Declarative pack: commands, agent presets, prompts, settings, theme. | Declarative. |
| **Internal app** | A small local-first HTML app that opens inside AssistIO. | Sandboxed browser view. |
| **Forge plugin** | A tool built with declarative Forge steps. | Declarative steps. |

Open the [Store](store.html).

## Find and filter

- Search matches names, descriptions, tags, publishers and ids, in every published
  language.
- **Kind tabs** narrow the list to skills, extensions, apps or Forge plugins.
- **Tags** are multi-select; selecting two shows resources that match either tag.
- **Verified only** hides community resources whose publisher identity has not
  been checked.
- **Sort** by featured, newest or A–Z. "Most installed" appears only when install
  counters are available.
- Filters live in the URL (`?q=git&kind=skill`), so a filtered view can be shared
  or bookmarked.

## Install

Every resource has a permalink. The install flow is deliberately explicit:

1. You click **Install** (or open an install permalink).
2. The browser asks the operating system to open AssistIO.
3. AssistIO downloads the manifest, verifies its SHA-256, and shows the publisher,
   version, source, permissions and credentials.
4. You confirm. Only then are files written and the capability registered.
5. You can uninstall it later, and every install is recorded in the audit log.

The website cannot install anything by itself. If the browser blocks the app
link, the store shows a sheet with **Copy install link** and **Download
manifest**; paste the link into **AssistIO → Store** or install the manifest
manually.

> **Verified** means the publisher identity was checked by the maintainers. It is
> not a security audit. Read the permissions before you confirm.

## Permissions

Resources declare what they need, with a reason for each item. Common ones:

| Permission | What it allows |
|---|---|
| `net.read` | Read pages or API responses from the network. |
| `fs.read` | Read files in the workspaces you choose. |
| `fs.write` | Create or modify files. |
| `app.storage` | Keep data in the app's local sandbox. |
| `clipboard.write` | Copy text to your clipboard. |
| `agents.install` | Add an agent preset. |
| `ui.theme` | Add a theme you can preview and remove. |

Credentials are **references** into the secret vault, never values in the
manifest. An API key is stored encrypted on your machine and referenced by name.

## Permalinks and deep links

| Link | Opens |
|---|---|
| `?r=<id>` | The resource page. |
| `?r=<id>&install=1` | The page and the AssistIO install sheet. |
| `assistio://install?id=…&type=…&v=…&src=…&sha256=…` | The app directly. |

The id format is `publisher.kind.slug`, for example
`raxiomlab.skill.research-brief`. Ids are permanent; a new major version keeps the
same id, a different resource gets a new one.

The same catalog file powers the website and the in-app store, so a resource only
has to be published once.

## Publish

Resources are public JSON manifests in the repository — not uploads.

1. Create `docs/store/items/<kind>/<slug>/` with `manifest.json` and its assets.
2. Fill both `en` and `pt` locales when you can.
3. Run `node tools/store-build.mjs` to validate and regenerate
   `docs/store/catalog.json`.
4. Open a pull request. Maintainers review the schema, permissions, hashes,
   licensing and the accuracy of the description.
5. First-party resources can be marked **verified** and **featured**.

The full contract, including the manifest schema, deep-link parameters and the
security model, is in
[`docs/store/README.md`](https://github.com/raxiomlab/assistio/blob/main/docs/store/README.md).

### What is not accepted

- Secrets, tokens, private keys or internal URLs.
- Absolute local paths or data from a private repository.
- Executable code in a skill, extension or Forge plugin. Those are declarative.
- Remote scripts, trackers or network calls in an app that did not declare
  `net.read`.
- A description that promises more than the resource does.

## Why this design

- **Reviewable:** a resource is a small diff, not an opaque package.
- **Cacheable:** the catalog is static and works offline.
- **Verifiable:** every manifest and file has a SHA-256 in the catalog.
- **Explicit:** nothing installs without a confirmation in the app.
- **Local-first:** resources are stored on your machine; the catalog is the only
  thing fetched from the web.

## Troubleshooting

**The browser says it cannot open the link.**
AssistIO may not be installed, or the OS has not registered `assistio://` yet.
Install or reopen the app, then allow the browser to open it. In the meantime, use
**Copy install link** and paste it into AssistIO → Store.

**The integrity check failed.**
The manifest bytes do not match the catalog hash. Do not install. Reload the page;
if it persists, report the resource.

**A resource is missing after I filtered.**
Clear the tags and the verified toggle; the empty state has a **Clear filters**
button. Filters are kept in the URL.

**I want a resource removed.**
Uninstall it from AssistIO. If it is published by someone else and you believe it
is unsafe, report it through the contact link in the site footer.
