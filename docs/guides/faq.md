# FAQ

Quick answers to the questions people ask most.

## Does AssistIO include the AI model?

No. You **bring your own provider** account and key. AssistIO connects to the provider
you already use — including local providers if you want to run models on your own
hardware. You pay your provider directly.

## Where is my data stored?

On **your own machine**. Conversations, files and memory are local. The agent only
accesses the workspaces you explicitly allow.

## Is it free?

Yes. AssistIO is **free to use**. It is licensed, not sold — see [License](license.md)
for the exact terms.

## What platforms are supported?

**Desktop, Web and Android.** They all run the same engine and stay in sync. See
[Desktop, Web & Android](platforms.md).

## Where do I download it?

From the [Releases](https://github.com/raxiomlab/assistio/releases) page of this
repository.

## Can it edit my files without me noticing?

No. Sensitive actions **ask for approval first**, and file edits show a **visual diff**
before anything is saved. You can also disable any tool permanently. See
[Tool approvals](tool-approvals.md).

## Will it send my secrets to the AI provider?

It is built not to. **Sensitive patterns are redacted automatically** before anything
is sent, and credentials live in an **encrypted vault** referenced by name only. See
[Privacy & security](privacy-and-security.md).

## Can I extend what it can do?

Yes — connect **MCP servers**, or **create custom plugins** at runtime with no coding.
See [Tools, MCP & plugins](tools-and-plugins.md).

## Does it remember things between conversations?

Yes — scoped, searchable **memory** and a **knowledge graph**, stored locally. See
[Memory & knowledge](memory.md).

## What is this repository for?

This is the **public repository** for AssistIO: product information, documentation and
**releases**. It intentionally contains no application source code.
