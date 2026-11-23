# Tool approvals

The agent can do powerful things. Tool approvals are what keep that power supervised:
**you decide which actions actually run.**

## How approval works

When the agent wants to take a **sensitive action** — running a command, editing a
file, calling an external tool — it does not just do it. It surfaces the action and
waits for you. You can:

- **Approve** it, so it runs once.
- **Reject** it, so the agent has to take a different path.

You always see *what* is about to happen before it happens.

## Approval is per tool

Each tool can have its own policy. A safe, read-only tool might run without prompting,
while a destructive one always asks. You tune the boundary rather than accepting a
single all-or-nothing setting.

## Visual diffs before edits

When the agent edits a file, you do not just see "file changed". You see a **diff** —
what was added and what was removed (`+12 −3`) — so you understand the change before
it is saved.

Combined with the **staleness guard** (the agent re-reads a file right before editing
it), this means it never overwrites work it has not seen.

## Tool governance

Beyond one-off approvals, you control the toolset itself:

- **Disable any tool permanently** if you never want it used.
- Inspect a **full audit trail** — who changed a tool's status, and when.

This is how you give an agent enough capability to be genuinely useful while keeping a
hard, auditable ceiling on what it can do.
