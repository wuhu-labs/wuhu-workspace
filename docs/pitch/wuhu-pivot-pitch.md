---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
  }
  section.lead h1 {
    font-size: 2.8em;
    color: #e67e22;
  }
  section.lead h2 {
    font-size: 1.4em;
    color: #666;
    font-weight: 400;
  }
  h1 { color: #e67e22; }
  h2 { color: #333; }
  strong { color: #e67e22; }
  code { background: #f5f0eb; color: #e67e22; }
  table { font-size: 0.85em; }
  blockquote { border-left: 4px solid #e67e22; padding-left: 1em; color: #666; }
---

<!-- _class: lead -->

# 🦞 Wuhu

## AI-Native Team Workspace
## Built in 5 Days. By One Person. With AI Agents.

---

# What is Wuhu?

An **all-in-one workspace** where humans and AI agents collaborate as peers.

Not another coding agent — the **workspace itself**.

| Replace | With Wuhu |
|---------|-----------|
| Notion / Obsidian | Workspace engine (markdown + live queries) |
| Linear | Issues (frontmatter + kanban) |
| Slack / Lark | Channels (humans + agents together) |
| GitHub (someday) | Agent-managed merge queue |

**Self-hostable.** Your data, your server, your agents.

---

# What Exists Today

Built in **5 working days** (the other 5 were 春节 🧧):

- ✅ Full coding agent: bash, file ops, async tasks, compaction
- ✅ Server + CLI + native macOS app
- ✅ Real-time streaming (SSE subscriptions)
- ✅ Channels with agent participation
- ✅ Issues kanban from markdown files
- ✅ Workspace docs with YAML frontmatter
- ✅ Self-fork: agents spawning sub-agents
- ✅ Crash-resilient: restart process → agents resume

> Yesterday I shipped 4-5 features **using Wuhu to build Wuhu**.

---

# Architecture: Swift + Actors + SQLite

```
┌──────────────────────────────────┐
│         Wuhu Server              │
│  ┌─────────┐  ┌──────────────┐  │
│  │ Session  │  │   Session    │  │
│  │ Runtime  │  │   Runtime    │  │  ← Swift actors (in-memory state)
│  │ (actor)  │  │   (actor)    │  │
│  └────┬─────┘  └──────┬───────┘  │
│       │               │          │
│  ┌────┴───────────────┴───────┐  │
│  │      SQLite (GRDB/WAL)     │  │  ← Single file, append-only
│  └────────────────────────────┘  │
│       │               │          │
│  ┌────┴────┐    ┌─────┴──────┐  │
│  │ OpenAI  │    │ Anthropic  │  │  ← LLM APIs
│  └─────────┘    └────────────┘  │
└──────────┬───────────────────────┘
           │ WebSocket
    ┌──────┴──────┐
    │   Runner    │  ← Stateless, any machine
    │ (bash/files)│
    └─────────────┘
```

---

# Why This Architecture?

**Single process. Single database. In-memory actors.**

- Cloud-native coding agents read full transcript from DB on **every** tool result → reconstruct prompt → call LLM → discard. That's insane.
- Wuhu: transcript lives in memory. DB is for durability. Hot loop is **O(1)**.
- No Kafka, no Redis, no Kubernetes. Runs on a **$10 VPS**.

**Crash resilience** — persist first, then update memory.
If the process crashes mid-session, restart → agent loop picks up exactly where it left off. Stale tool calls get auto-repaired.

**Scaling path** — SQLite shards (sessions are independent), WAL streaming to replicas. Turso/libSQL may solve multi-writer before we need it.

---

# Server + Runner: Brain vs Hands

The server is the **brain** — sessions, LLM calls, decisions.
Runners are the **hands** — execute bash, read/write files.

**One agent, multiple computers:**

```
Agent Loop (server)
  ├── "read frontend repo"    → Runner A (MacBook)
  ├── "run backend tests"     → Runner B (VPS)
  └── "deploy to staging"     → Runner C (Lambda)
```

Runner protocol is language-agnostic (JSON over WebSocket).
Implement in **Swift, TypeScript, Python** — whatever fits the infra.

Scale out compute. Keep decisions centralized.

---

# The Session Model

**Append-only transcript** + **three input lanes**:

```
┌─────────────────────────────────────┐
│              Agent Loop              │
│                                      │
│  ┌──────────┐                        │
│  │ System   │ ← async_bash callback  │  Interrupt
│  │ Lane     │   task notifications   │  checkpoint
│  ├──────────┤                        │  (between
│  │ Steer    │ ← "stop, do X instead" │   tool calls)
│  │ Lane     │   urgent corrections   │
│  ├──────────┤                        │
│  │ Follow-up│ ← "now do Y"           │  Turn
│  │ Lane     │   next-turn input      │  boundary
│  └──────────┘                        │
│                                      │
│  Transcript: [entry₁, entry₂, ...]  │
│  Compaction: sum₁ → sum₂ → kept     │
└─────────────────────────────────────┘
```

**Steer** = course-correct a running agent without waiting.
**Follow-up** = queue work for when it finishes.

---

# Self-Fork: Agents Spawning Agents

A channel agent chats with you. You say "fix that bug."

```
You:        "Fix the auth bug in issue #0031"
                    │
            Channel Agent (parent)
            ├── fork("Fix auth bug", env: backend)
            ├── "On it! I've started a coding session."
            │        │
            │   Coding Agent (child)
            │   ├── reads issue
            │   ├── edits files
            │   ├── runs tests
            │   └── ✅ done → notifies parent
            │        │
            ├── "Auth bug is fixed. PR ready."
            │
You:        "Great, how about the frontend?"
```

Parent stays **responsive**. Child works with **full context**.
Async notification on completion (like `async_bash`).

---

# The `wuhu` Tool: One Tool to Rule Them All

**Problem:** Rich environment = many tools = bloated LLM context.

**Solution:** Embed **QuickJS** in the server. One tool, takes JS:

```javascript
wuhu(`
  const issues = workspace.query({
    kind: 'issue', status: 'open', assignee: 'minsheng'
  });
  const urgent = issues.filter(i => i.priority === 'critical');
  sessions.create({
    env: 'backend',
    title: 'Fix ' + urgent[0].title
  });
  channels.post('engineering',
    'Starting work on ' + urgent[0].title);
`)
```

**One tool call. Multiple operations. Zero round trips.**

MCP tools auto-discovered as JS functions. `wuhu('help')` for docs.

---

# Event-Driven Async Agents

What if an agent is a **Telegram bot**? User messages = steer notifications:

```
xxx ← tool result

Minsheng <DM> 15:34
Oh by the way create a PR after you are done!

Yihan <DM> 15:35
How are we on the current milestone?
```

Agent responds with tool calls:

```
send_message(target: "Minsheng", content: "Gotcha!")
send_message(target: "Yihan", content: "Almost done!")
```

**One agent. Multiple conversations. Real-time async feel.**

The infrastructure already supports this (steer queue + tool calls).
The experiment: does the model generalize? **Let's find out.**

---

# Workspace: The Git-Native Knowledge Base

Every doc is a **markdown file** with YAML frontmatter. Git-managed.

**Implicit rules** (`wuhu.yml`):
```yaml
rules:
  - path: "issues/**"
    metadata: { kind: issue }
```

**Database views** (live queries in docs):
~~~
```database-view
id: my-open-issues
---
SELECT * FROM documents
WHERE kind = 'issue' AND status = 'open'
ORDER BY priority DESC
```
~~~

**Personalized home pages** — your dashboard is a markdown file with your queries.

Agents read, write, and query the same docs. No vendor lock-in.

---

# Channels: Where Humans Meet Agents

Not replacing Lark — **extending** it.

A channel where the agent is a participant:
- You say "fix that bug" → agent responds, forks a session, reports back
- Agent posts intent before acting: "I'll update the schema"
- Multiple humans + agents in one channel

**Human-centric.** Agents read from and post to channels via tool calls.
Event-driven notifications keep agents informed.

What Lark would be if it was built for human-AI collaboration.

---

# Native Apps: The Differentiator

In a sea of **Electron apps** — Codex, Claude Desktop, Cursor —
a native SwiftUI app **stands out**.

- **macOS** — already working, real-time streaming, kanban, channels
- **iOS** — shared TCA reducers, adaptive UI (coming soon)
- **visionOS** — name one AI coding tool with a visionOS app. Zero.

Shared codebase thanks to **TCA** (ComposableArchitecture by Point-Free).
Ultra-modularized: each feature is its own module, independently testable.

CLI for every interaction. You can use Wuhu entirely headless.
But you won't — because the app is that good.

> HackerNews bait: "Native macOS/iOS/visionOS AI workspace"

---

# Observability: Know Everything

**Raw LLM logging** — every request and response. Debug anything in seconds.

**Cost tracking:**
- Per session, per user, per issue resolved
- "How much did this feature cost in AI compute?"

**Task reproduction:**
- Replay historical tasks on new models
- "Can DeepSeek 4 solve this? How much cheaper?"
- Regression detection: "Did Anthropic nerf Claude?"

**Team metrics:**
- Who's productive with AI? Who's struggling? Why?
- Is it a setup issue? A prompting skill issue? Micro-managing?

---

# The Roadmap

| Week | Milestone |
|------|-----------|
| **Week 1** | Extract PiAI to own repo. Set up multi-repo workflow. |
| **Week 2** | Workspace query engine v0.1. Implicit rules + basic queries. |
| **Week 3** | Integrate workspace engine into Wuhu. iOS app prototype. |

**Ongoing:** Agent experimentation (multi-channel bot, async assistant).

**The pattern:** Small repos → agents iterate fast → pin stable versions → integrate.

Each repo is a sub-team. The team lead is me. The engineers are coding agents.

---

<!-- _class: lead -->

# Wuhu

## Your workspace. Your server. Your agents.

## Built with AI. For teams that work with AI.

**5 days → working product. Imagine 5 months.**

