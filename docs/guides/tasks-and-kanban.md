# Tasks & Kanban

AssistIO separates two related ideas: a **task** is a piece of work with an objective;
a **board** is how you organize and track many pieces of work. They work together.

## Tasks

A task is more than a prompt. Each one carries:

- An **objective** — the outcome you want.
- **Steps** and **checkpoints** it works through.
- **Stop conditions** so it knows when it is done (or when to ask).

Tasks can run **in the background**: start one, switch to something else, and come
back later. While running you can **pause, resume or cancel** at any moment, and track
tokens, time and cost live.

For larger work, an agent can **delegate to specialized sub-agents** and the agents can
coordinate with each other to reach a shared outcome.

## Kanban boards

Boards give the work structure:

- Custom **columns**, **WIP limits**, **priorities**, **labels** and **due dates**.
- A card can be **assigned to an agent**. It then takes over: it uses tools, respects
  the board's limits, and **comments the outcome on the card itself**.
- A completion report is written automatically on the card when the work finishes.

## GitHub integration

Boards connect to your repositories:

- **Sync issues and pull requests** so the board reflects the real state of the code.
- Let **CI report back to a card** — a build or test run can update the card it belongs
  to, so the board stays honest without manual status updates.

## How to use them together

A common flow:

1. Create a task with a clear objective.
2. Put it on a board card so you can see where it stands.
3. Let the agent execute it; it moves the card and reports back.
4. Review the diff and the report before anything is committed.
