# Install & first run

Get from zero to your first delegated task in four steps. No credit card, no
data migration, no hidden trial.

## 1. Install

Pick the platform you want. They all share the same engine and the same data.

- **Desktop** — install the app and run everything locally, with native windows and
  multiple instances.
- **Web** — open the same workspace in any browser, nothing to install.
- **Android** — install the app and pair it with your desktop by QR code.

> Downloads are published in the [Releases](https://github.com/raxiomlab/assistio/releases)
> page of this repository.

## 2. Connect a provider

On first launch, the **setup assistant** walks you through adding your first AI
provider and its key.

- Bring your own key from the provider you already use.
- Local CLI providers are supported if you prefer to run models on your own hardware.

> AssistIO does not bundle model access — it connects to the provider you choose.

## 3. Create a workspace

A workspace is the folder the agent is allowed to work in. It is the agent's boundary:
it will not touch files outside the workspaces you define.

## 4. Delegate

Start a conversation and describe what you want — or create a **task** for longer,
multi-step work. Tasks have objectives, steps, checkpoints and stop conditions, and
can run in the background while you do something else.

## What you'll see first

A typical first session looks like this:

1. You ask a question or describe an outcome.
2. The agent proposes the steps and starts using tools — reading files, running commands.
3. Before any sensitive action, it **asks for approval**.
4. When it edits a file, you see a **visual diff** (`+12 −3`) before anything is saved.
5. It reports back with the result and the full history of what it touched.

## Next

- See everything it can do in [Features overview](features.md).
- Understand the safety model in [Tool approvals](tool-approvals.md) and
  [Privacy & security](privacy-and-security.md).
