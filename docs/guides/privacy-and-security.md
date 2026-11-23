# Privacy & security

AssistIO was built so your history, your secrets and your files stay under your
control. Privacy here is a design decision, not a promise in a policy page.

## Everything is local

Conversations, files and memory live **on your machine** — not on someone else's
server. The agent's access is limited to the workspaces you explicitly define; it will
not touch anything outside them.

## Automatic redaction

Before anything is sent to an AI provider, **sensitive patterns are automatically
masked**: keys, card numbers, documents and personal IDs are redacted so they never
leave your machine in the clear.

## Encrypted secret vault

Credentials live in an **encrypted vault**. When the agent needs one, it references the
secret **by name, without ever exposing its value** in a prompt or transcript.

## Full, searchable trail

Every action the agent takes is recorded and visible to you:

- Every file it read or changed.
- Every command it ran.
- Every tool it used, with the approval decision that allowed it.

Nothing happens behind your back. You can audit the whole history at any time.

## Human approval by default

Sensitive actions **wait for your say-so**. See [Tool approvals](tool-approvals.md) for
how the approval flow works and how to make it stricter or looser to your taste.

## What AssistIO does not do

- It does **not** keep your data in a cloud you do not control.
- It does **not** include or sell model access — you connect your own provider, so the
  relationship with that provider is yours.
- It does **not** take risky actions silently. If an action is sensitive, it asks.
