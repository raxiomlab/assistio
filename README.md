# AssistIO

**Your own AI team, running on your own machine.**
Chat with agents that read your files, run commands, search the web, manage projects, and keep working in the background — while you do something else.

By **RaxiomLab** · Copyright (c) 2026 Rodrigo — RaxiomLab. All rights reserved.

---

## What is AssistIO?

AssistIO is a private AI workspace. You talk to an assistant that has real access to your computer and your project — not a chatbot that only types text back.

Give it an objective and it plans the work, uses tools, checks the result, and reports back. You stay in control: every sensitive action asks for your approval first.

## Where you can use it

| Platform | How |
|---|---|
| **Desktop** | Install the app and run everything locally on your machine |
| **Web** | Open your workspace in any browser |
| **Mobile (Android)** | Install the APK and pair it with your desktop by QR code |

Your conversations stay in sync across every device you connect.

## What you can do

### Talk and iterate
- Real-time streaming answers, word by word
- Edit, regenerate, branch, and rewind any message
- Queue messages while the agent is still working, instead of interrupting it
- Automatic conversation titles, so your history stays readable
- Crash-safe recovery: if the app closes mid-answer, it picks up where it left off

### Work with your files
- Read, write, move, rename, and delete files and folders
- Targeted edits with a visual diff (`+12 −3`) before anything changes
- Built-in file browser and code editor
- **Staleness guard**: the agent always re-reads a file right before editing it, so it never overwrites changes it hasn't seen
- Attach files to any message — text files go into the context, images are understood visually

### Run real work in the background
- Create tasks with objectives, steps, checkpoints, and stop conditions
- Run them in the background, then pause, resume, or cancel
- Agents can delegate to specialized sub-agents and coordinate with each other

### Manage projects
- Kanban boards with custom columns, priorities, labels, and due dates
- Assign a card to an agent and it executes the work, then reports back on the card
- Automatic GitHub integration: sync issues and pull requests, or let CI report back to a card

### Build your own tools
- Connect external **MCP servers** to give agents new capabilities
- Create custom plugins at runtime, no coding required
- Import your setup from other tools (agents, prompts, and conversations)

### Remember and understand
- Persistent memory with semantic, episodic, and procedural facts — scoped per conversation, per user, or global
- Knowledge graph built automatically from your conversations
- Attach local folders as a knowledge base, kept up to date automatically

### Stay in control
- **Tool approval**: you decide which actions run
- **Tool governance**: disable any tool, with a full audit trail of who changed what and when
- **Privacy by default**: sensitive data (keys, cards, documents, personal IDs) is automatically redacted before it ever leaves your machine
- **Secret vault**: store credentials encrypted and reference them without exposing them
- **Full history**: every file and command the agent touched is recorded and searchable
- **Live monitoring**: watch tokens, time, and cost as the work happens

### Make it yours
- Multiple AI providers and models, including local CLI providers
- Custom agents with their own personality, instructions, and tool permissions
- Voice input and narration
- Command palette, keyboard shortcuts, themes, and a full appearance system
- Your phone doubles as a remote companion for the desktop app

## Getting started

1. **Install** AssistIO on your computer.
2. **Run the setup assistant** — it walks you through adding your first AI provider (an API key from the provider of your choice).
3. **Create a workspace** — a folder where the agent is allowed to work.
4. **Start a conversation** and describe what you want, or create a task for longer work.

> You need your own AI provider account. AssistIO does not include model access — it connects to the provider you choose.

## Who it's for

- Developers who want an assistant that actually touches the codebase
- Researchers and analysts who need long-running work done in the background
- Anyone who wants their AI tools, memory, and history to stay on their own machine

## Privacy

- Your conversations, files, and memory are stored **on your machine**, not on someone else's cloud.
- Sensitive patterns are automatically redacted before anything is sent to an AI provider.
- The agent's access is limited to the workspaces you define.
- Every action the agent takes is logged and visible to you.

## License

AssistIO is **proprietary and free to use**. It is licensed, not sold.

You may install and use it free of charge. You may **not** share, sell, redistribute, modify, or reverse engineer it — see [LICENSE](LICENSE) for the full terms.

© 2026 Rodrigo — RaxiomLab. All rights reserved.
