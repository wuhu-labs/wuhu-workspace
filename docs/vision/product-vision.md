---
title: "Wuhu Product Vision"
kind: vision
status: draft
---

# Wuhu Product Vision

## One-Liner

Wuhu is an AI-native, all-in-one team workspace: issue tracking, docs,
channels, coding agents, and observability — built for teams where humans and
AI agents collaborate as peers.

## The Big Picture

Wuhu is not a coding agent. It's the **workspace** that has agents as
first-class citizens.

The coding agent was the bootstrap path. We needed Wuhu to be able to build
itself — and it does. But the vision is much broader:

- **Notion/Obsidian** — Docs and knowledge base with a query engine
- **Linear** — Issue management with AI-native workflows
- **Slack/Discord** — Channels where humans and agents communicate
- **GitHub** — Merge queues, code review, CI — all managed by agents
- **Observability** — Cost tracking, productivity metrics, task reproduction

All of this on a single, vertically integrated platform.

## Core Beliefs

### Vertical Integration

Wuhu implements both the scheduler (assistant) and coder agents. One system,
one box, no glue. The server is the brain — it holds sessions, does LLM calls,
makes decisions. Runners are just hands — they execute commands on whatever
machine they're on.

### Async-First

Agents run in the background. Users steer them with messages injected at
interrupt checkpoints, not by watching tokens stream. The steer/follow-up
queue model means you can course-correct a running agent without waiting for
it to finish.

### Multiplayer-Native

Multiple users and agents share a workspace. Every session, message, and
action is visible to the team. Channels are shared spaces where agents post
their intent before acting, and humans direct work naturally.

### Persistence Matters

Sessions survive crashes. All metadata (steer vs follow-up, queue state, tool
call status) is persisted, not just chat history. The system can resume from
any committed state.

### AI-Native, Not AI-Bolted

This isn't "take Notion and add an AI sidebar." Every feature is designed from
the ground up assuming agents are participants. Docs are markdown files that
agents read and write. Issues have structured metadata that agents query.
Channels are communication surfaces for both humans and agents.

## Product Surfaces

### Workspace / Knowledge Base (Notion/Obsidian Killer)

Every doc is a markdown file with YAML frontmatter. A query engine indexes
metadata and supports database views — live queries embedded in docs, like
Notion's database views but backed by plain files.

A `wuhu.yml` at the workspace root defines implicit rules (e.g., "everything
under `issues/` gets `kind: issue`"), so you don't repeat metadata in every
file.

Database views are addressable by ID, so agents can materialize query results
via tool calls.

Git-managed, agent-readable/writable, no proprietary format, no lock-in.

### Issue Management (Linear)

Issues are just docs with `kind: issue` and structured frontmatter (`status`,
`priority`, `assignee`). The kanban board is a database view. Agents can
create, update, and query issues through the same workspace APIs.

### Channels (Slack/Discord)

Human-centric channels where agents participate via tool calls. Agents read
from and post to channels. Event-driven notifications alert agents to new
messages. Multiple channels, multiple participants, real-time async
communication.

### Coding Agent Sessions

The existing session infrastructure: append-only transcript, three-lane queue
(system, steer, follow-up), compaction, tools. Agents execute code, run tests,
produce commits. Sessions can be spawned by the assistant agent or created
directly by users.

### Observability & Analytics

- Raw LLM request/response logging
- Cost tracking per session, user, and issue
- User activity and productivity metrics
- Task reproduction: replay historical tasks on new models, compare cost and
  quality
- "Did the model get nerfed?" — regression detection via replay

### CLI as Universal Interface

Everything Wuhu can do, the CLI can do. Used by humans, by agents (as a tool
in their environment), and by automated tests. The CLI is both a product and a
test harness.

## The Natural Assistant

Beyond traditional chat sessions, Wuhu aims to experiment with a natural
human assistant that isn't bounded by chat session boundaries. Under the hood:

- Manual LLM input management (only preserve recent context)
- Post messages via tool calls + steer for a real-time async feeling
- User messages arrive as system notifications (like async bash callbacks)
- A single agent can handle multiple channels/conversations concurrently

This is experimental and requires prompt engineering validation, but the
infrastructure (steer queues, tool calls, session model) already supports it.

## Multi-Channel Agent Concept

A single agent session receives interleaved messages from multiple users and
channels, all delivered via the steer mechanism:

```
xxx <- tool result

Minsheng <DM> 15:34
Oh by the way create a PR after you are done!

Yihan <DM> 15:35
How are we on the current milestone
```

The agent responds by routing messages back via tool calls:

```
send_message(target: Minsheng, content: "Gotcha!")
send_message(target: Yihan, content: "We are almost done!")
```

This needs validation with frontier models and careful prompt engineering.
The ultra-modularized architecture enables rapid experimentation here.

## Scaling Story

### SQLite All the Way

Single process, in-memory actor state, SQLite for durability. No Kafka, no
Redis, no Kubernetes. Push as far as possible before distributing.

Progression:
1. **Now**: Single process, single SQLite file, WAL mode
2. **Soon**: Single process, sharded SQLite files (sessions are independent)
3. **Later**: Multi-process, WAL streaming to read replicas, distributed actors
4. **Future**: Shard placement across nodes, automatic rebalancing

Sessions are independent — they shard naturally. No cross-session transactions.

Turso (libSQL) may unlock multi-writer SQLite before we need custom sharding.

### Runners Scale Out

The server is the brain (stateful, single box). Runners are the hands
(stateless, horizontally scalable). Runner protocol is language-agnostic —
implement in TypeScript for Cloudflare Workers, Python for Lambda, backed by
e2b for sandboxed environments.

One agent can dispatch tool calls to multiple runners — different machines for
different tasks. LLM inference stays centralized on the server.

### Why Not Cloud-Native?

A cloud-native coding agent would read the full transcript from a database on
every tool result, reconstruct the prompt, call the LLM, then discard
everything. That's insane for sessions with hundreds of entries.

The stateful actor model (Swift actors on a single box) is the correct
abstraction for long-lived conversational sessions. The session *is* state.
Pretending it's stateless is fighting reality.

## Platform Vision

Wuhu is a platform where teams work with AI agents as peers:

1. **For developers**: Coding agents that understand your codebase, managed
   through a familiar workspace interface
2. **For teams**: Shared channels, issue tracking, docs — all AI-augmented
3. **For managers**: Observability into AI productivity, cost tracking, task
   reproduction for model evaluation
4. **For the AI ecosystem**: A stable runner protocol for compute providers,
   a workspace query API for tool builders, MCP integration via QuickJS
