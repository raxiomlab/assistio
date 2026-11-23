# Tools, MCP & plugins

An agent is only as useful as what it is allowed to do. AssistIO gives you three
layers of capability — and you stay in charge of all of them.

## Tools

Tools are the built-in actions the agent can take: read a file, run a command, search
the web, move things around, and so on. Every tool is governed:

- **Approval** — sensitive actions ask before they run. See
  [Tool approvals](tool-approvals.md).
- **Governance** — you can **disable any tool permanently**, and there is a full audit
  trail of who changed what, and when.

You decide the boundary. The agent works inside it.

## MCP servers

**MCP (Model Context Protocol)** is an open way to plug new capabilities into the
agent. Connect an MCP server and the agent gains new tools — for example, a database,
a design tool, or a company API — without AssistIO changing.

This means AssistIO is **extensible without being modified**: the capabilities come
from servers you choose to connect.

## Custom plugins

You can build your own tools **at runtime, with no coding**. A plugin is a small,
declared capability — it can call an API, run a prompt, or compose other capabilities —
that then appears to the agent as a normal, governable tool.

- Create plugins from a guided flow, not from a code editor.
- Reference stored credentials by name, never by value, so secrets stay hidden.

## Bring your own setup

You can **import your configuration from other tools** — agents, prompts and even
conversations — so switching to AssistIO does not mean rebuilding everything by hand.

## Custom agents

A **custom agent** bundles a personality, its own instructions and its own set of
permitted tools. Create a specialist that only ever uses the tools it genuinely needs,
and keep the risky ones off the table for it.
