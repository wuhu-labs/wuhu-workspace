---
marp: true
paginate: true
---

<style>
@import "default";

:root {
    --base: #191724;
    --surface: #1f1d2e;
    --overlay: #26233a;
    --muted: #6e6a86;
    --subtle: #908caa;
    --text: #e0def4;
    --love: #eb6f92;
    --gold: #f6c177;
    --rose: #ebbcba;
    --pine: #31748f;
    --foam: #9ccfd8;
    --iris: #c4a7e7;
    --highlight-low: #21202e;
    --highlight-muted: #403d52;
    --highlight-high: #524f67;
}

section {
    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
    font-weight: initial;
    background-color: var(--base);
    color: var(--text);
    letter-spacing: normal;
}
h1 { color: var(--rose); padding-bottom: 2mm; }
h2 { color: var(--rose); }
h3 { color: var(--rose); }
p { color: var(--text); font-weight: 500; }
strong { color: var(--gold); font-weight: 800; }
a { color: var(--iris); }
code { color: var(--text); background-color: var(--highlight-muted); font-size: 0.7em; }
pre code { font-size: 0.55em; line-height: 1.4; }
marp-pre { background-color: var(--overlay); border-color: var(--highlight-high); }
ul, li { color: var(--subtle); }
table { font-size: 0.8em; color: var(--subtle); background-color: var(--surface); }
th { color: var(--rose); background-color: var(--overlay); }
td { color: var(--text); background-color: var(--surface); }
blockquote { border-left: 4px solid var(--gold); padding-left: 1em; color: var(--muted); font-size: 0.9em; }
img { background-color: transparent; }
em { color: var(--iris); }
s { color: var(--muted); text-decoration: line-through; }

.hljs-comment { color: var(--muted); }
.hljs-attr { color: var(--foam); }
.hljs-string { color: var(--gold); }
.hljs-keyword { color: var(--pine); }
.hljs-number { color: var(--gold); }
.hljs-built_in { color: var(--love); }
.hljs-params { color: var(--iris); }
.hljs-title { color: var(--foam); }
.hljs-punctuation { color: var(--subtle); }
</style>

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
| Notion / Obsidian | Markdown workspace + live queries |
| Linear | Issues with frontmatter + kanban |
| Slack / Lark | Channels with agent participants |
| GitHub (someday) | Agent-managed merge queue |

---

# Self-Hostable. Your Data.

The **ultimate Obsidian** — but for your whole team.

- Personal workspace → your second brain + your own agent
- Team workspace → shared docs, channels, coding sessions
- Company workspace → multiple teams, observability, cost tracking

Runs on a **$10 VPS**. Or we host it for you.

Your agent can **visit other workspaces** — drop into a team shell, do work on your behalf, come back. Your personal AI that roams.

---

# What Exists Today

Built in **5 working days** (the other 5 were holiday 🧧):

- ✅ Full coding agent with tools, compaction, async tasks
- ✅ Server + CLI + **native macOS app**
- ✅ Real-time streaming (SSE subscriptions)
- ✅ Channels with agent participation
- ✅ Issues kanban from markdown files
- ✅ Workspace docs with YAML frontmatter
- ✅ Self-fork: agents spawning sub-agents
- ✅ Crash-resilient: restart → agents resume

---

# And It Accelerates

We shipped **7 features in 2 days** using Wuhu to build Wuhu.

Not even pushing hard.

The product is the proof of concept:
**one person + AI agents = absurd shipping velocity.**

---

# Architecture Overview

<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 720 440' font-family='-apple-system,Helvetica Neue,sans-serif'%3E%3Crect x='40' y='20' width='640' height='240' rx='16' fill='%231f1d2e' stroke='%23ebbcba' stroke-width='2'/%3E%3Ctext x='360' y='50' text-anchor='middle' font-size='16' font-weight='bold' fill='%23ebbcba'%3EWuhu Server (single process)%3C/text%3E%3Crect x='80' y='70' width='170' height='55' rx='10' fill='%2326233a' stroke='%23403d52' stroke-width='1.5'/%3E%3Ctext x='165' y='93' text-anchor='middle' font-size='12' font-weight='600' fill='%23e0def4'%3ESession Runtime%3C/text%3E%3Ctext x='165' y='111' text-anchor='middle' font-size='11' fill='%23908caa'%3ESwift Actor%3C/text%3E%3Crect x='275' y='70' width='170' height='55' rx='10' fill='%2326233a' stroke='%23403d52' stroke-width='1.5'/%3E%3Ctext x='360' y='93' text-anchor='middle' font-size='12' font-weight='600' fill='%23e0def4'%3ESession Runtime%3C/text%3E%3Ctext x='360' y='111' text-anchor='middle' font-size='11' fill='%23908caa'%3ESwift Actor%3C/text%3E%3Crect x='470' y='70' width='170' height='55' rx='10' fill='%2326233a' stroke='%23403d52' stroke-width='1.5'/%3E%3Ctext x='555' y='93' text-anchor='middle' font-size='12' font-weight='600' fill='%23e0def4'%3ESession Runtime%3C/text%3E%3Ctext x='555' y='111' text-anchor='middle' font-size='11' fill='%23908caa'%3ESwift Actor%3C/text%3E%3Crect x='160' y='145' width='400' height='40' rx='10' fill='%2326233a' stroke='%23f6c177' stroke-width='1.5'/%3E%3Ctext x='360' y='170' text-anchor='middle' font-size='13' font-weight='600' fill='%23f6c177'%3ESQLite (GRDB / WAL)%3C/text%3E%3Crect x='100' y='205' width='140' height='35' rx='8' fill='%2326233a' stroke='%23403d52' stroke-width='1.5'/%3E%3Ctext x='170' y='227' text-anchor='middle' font-size='11' fill='%23e0def4'%3EOpenAI API%3C/text%3E%3Crect x='290' y='205' width='140' height='35' rx='8' fill='%2326233a' stroke='%23403d52' stroke-width='1.5'/%3E%3Ctext x='360' y='227' text-anchor='middle' font-size='11' fill='%23e0def4'%3EAnthropic API%3C/text%3E%3Crect x='480' y='205' width='140' height='35' rx='8' fill='%2326233a' stroke='%23403d52' stroke-width='1.5'/%3E%3Ctext x='550' y='227' text-anchor='middle' font-size='11' fill='%23e0def4'%3EFuture LLMs%3C/text%3E%3Cline x1='180' y1='260' x2='180' y2='310' stroke='%23ebbcba' stroke-width='1.5' stroke-dasharray='6,4'/%3E%3Cline x1='360' y1='260' x2='360' y2='310' stroke='%23ebbcba' stroke-width='1.5' stroke-dasharray='6,4'/%3E%3Cline x1='540' y1='260' x2='540' y2='310' stroke='%23ebbcba' stroke-width='1.5' stroke-dasharray='6,4'/%3E%3Ctext x='270' y='295' text-anchor='middle' font-size='10' fill='%23908caa'%3EWebSocket%3C/text%3E%3Crect x='80' y='315' width='190' height='50' rx='12' fill='%231f1d2e' stroke='%23ebbcba' stroke-width='1.5'/%3E%3Ctext x='175' y='340' text-anchor='middle' font-size='12' font-weight='600' fill='%23ebbcba'%3ERunner A%3C/text%3E%3Ctext x='175' y='356' text-anchor='middle' font-size='10' fill='%23908caa'%3EMacBook (local)%3C/text%3E%3Crect x='290' y='315' width='190' height='50' rx='12' fill='%231f1d2e' stroke='%23ebbcba' stroke-width='1.5'/%3E%3Ctext x='385' y='340' text-anchor='middle' font-size='12' font-weight='600' fill='%23ebbcba'%3ERunner B%3C/text%3E%3Ctext x='385' y='356' text-anchor='middle' font-size='10' fill='%23908caa'%3EVPS / Lambda%3C/text%3E%3Crect x='500' y='315' width='190' height='50' rx='12' fill='%231f1d2e' stroke='%23ebbcba' stroke-width='1.5'/%3E%3Ctext x='595' y='340' text-anchor='middle' font-size='12' font-weight='600' fill='%23ebbcba'%3ERunner C%3C/text%3E%3Ctext x='595' y='356' text-anchor='middle' font-size='10' fill='%23908caa'%3ECloudflare / e2b%3C/text%3E%3Ctext x='360' y='410' text-anchor='middle' font-size='11' fill='%236e6a86'%3ERunners are stateless. Any language. Any machine.%3C/text%3E%3C/svg%3E" width="700">

---

# Why This Architecture?

**Stateful actors > cloud-native.**

Cloud coding agents: read full transcript from DB on **every** tool result → reconstruct prompt → call LLM → discard everything.

Wuhu: transcript in memory. DB for durability. Hot loop is **O(1)**.

Persist first, then update memory. Process crashes mid-session? Restart → agent resumes exactly where it left off. No special recovery path.

No Kafka. No Redis. No Kubernetes.

---

# Server + Runner: Brain vs Hands

The server is the **brain** — sessions, LLM calls, decisions.
Runners are the **hands** — execute commands on any machine.

<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 680 200' font-family='-apple-system,Helvetica Neue,sans-serif'%3E%3Crect x='220' y='10' width='240' height='55' rx='12' fill='%231f1d2e' stroke='%23ebbcba' stroke-width='2'/%3E%3Ctext x='340' y='35' text-anchor='middle' font-size='14' font-weight='bold' fill='%23ebbcba'%3EAgent Loop (Server)%3C/text%3E%3Ctext x='340' y='52' text-anchor='middle' font-size='11' fill='%23908caa'%3ELLM calls %2B decisions%3C/text%3E%3Cline x1='260' y1='65' x2='110' y2='110' stroke='%23403d52' stroke-width='1.5'/%3E%3Cline x1='340' y1='65' x2='340' y2='110' stroke='%23403d52' stroke-width='1.5'/%3E%3Cline x1='420' y1='65' x2='570' y2='110' stroke='%23403d52' stroke-width='1.5'/%3E%3Crect x='30' y='110' width='160' height='70' rx='10' fill='%2326233a' stroke='%23403d52' stroke-width='1.5'/%3E%3Ctext x='110' y='140' text-anchor='middle' font-size='12' font-weight='600' fill='%23e0def4'%3ERunner A%3C/text%3E%3Ctext x='110' y='158' text-anchor='middle' font-size='10' fill='%23908caa'%3EMacBook%3C/text%3E%3Ctext x='110' y='172' text-anchor='middle' font-size='10' fill='%236e6a86'%3E%22read frontend repo%22%3C/text%3E%3Crect x='260' y='110' width='160' height='70' rx='10' fill='%2326233a' stroke='%23403d52' stroke-width='1.5'/%3E%3Ctext x='340' y='140' text-anchor='middle' font-size='12' font-weight='600' fill='%23e0def4'%3ERunner B%3C/text%3E%3Ctext x='340' y='158' text-anchor='middle' font-size='10' fill='%23908caa'%3EVPS / Lambda%3C/text%3E%3Ctext x='340' y='172' text-anchor='middle' font-size='10' fill='%236e6a86'%3E%22run backend tests%22%3C/text%3E%3Crect x='490' y='110' width='160' height='70' rx='10' fill='%2326233a' stroke='%23403d52' stroke-width='1.5'/%3E%3Ctext x='570' y='140' text-anchor='middle' font-size='12' font-weight='600' fill='%23e0def4'%3ERunner C%3C/text%3E%3Ctext x='570' y='158' text-anchor='middle' font-size='10' fill='%23908caa'%3ECloudflare / e2b%3C/text%3E%3Ctext x='570' y='172' text-anchor='middle' font-size='10' fill='%236e6a86'%3E%22deploy to staging%22%3C/text%3E%3C/svg%3E" width="650">

Runner protocol is **language-agnostic** (JSON over WebSocket).
One agent can use multiple machines simultaneously.

---

# Event-Driven Async Agents

What if an agent is a **chat bot**? Messages arrive as steer events:

```
Minsheng <DM> 15:34
Create a PR after you are done!

Yihan <DM> 15:35
How are we on the current milestone?
```

Agent responds with tool calls:

```
send_message(target: "Minsheng", content: "Gotcha!")
send_message(target: "Yihan", content: "Almost done!")
```

**One agent. Multiple conversations. Real-time async.**

Everything is event-driven. `send_message` + **steer** = natural async feel.

---

# Self-Fork: Agents Spawning Agents

<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 660 260' font-family='-apple-system,Helvetica Neue,sans-serif'%3E%3Crect x='30' y='20' width='130' height='40' rx='20' fill='%2331748f' fill-opacity='0.2' stroke='%239ccfd8' stroke-width='1.5'/%3E%3Ctext x='95' y='45' text-anchor='middle' font-size='13' font-weight='600' fill='%239ccfd8'%3EYou%3C/text%3E%3Cline x1='160' y1='40' x2='230' y2='40' stroke='%23403d52' stroke-width='1.5' marker-end='url(%23arr2)'/%3E%3Cdefs%3E%3Cmarker id='arr2' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'%3E%3Cpath d='M 0 0 L 10 5 L 0 10 z' fill='%23403d52'/%3E%3C/marker%3E%3C/defs%3E%3Ctext x='195' y='32' text-anchor='middle' font-size='9' fill='%23908caa'%3E%22Fix auth bug%22%3C/text%3E%3Crect x='230' y='10' width='200' height='240' rx='12' fill='%231f1d2e' stroke='%23ebbcba' stroke-width='2'/%3E%3Ctext x='330' y='40' text-anchor='middle' font-size='13' font-weight='bold' fill='%23ebbcba'%3EChannel Agent%3C/text%3E%3Ctext x='330' y='58' text-anchor='middle' font-size='10' fill='%23908caa'%3Eparent — stays responsive%3C/text%3E%3Ctext x='330' y='85' text-anchor='middle' font-size='10' fill='%23e0def4'%3E%22On it!%22%3C/text%3E%3Ctext x='330' y='105' text-anchor='middle' font-size='10' fill='%236e6a86'%3E(keeps chatting with you)%3C/text%3E%3Ctext x='330' y='125' text-anchor='middle' font-size='10' fill='%23908caa'%3E%22Sure, I can also check the logs.%22%3C/text%3E%3Ctext x='330' y='175' text-anchor='middle' font-size='10' fill='%23e0def4'%3E%22Auth bug fixed. PR ready.%22%3C/text%3E%3Ctext x='330' y='210' text-anchor='middle' font-size='10' fill='%236e6a86'%3EContinues chatting...%3C/text%3E%3Ctext x='330' y='235' text-anchor='middle' font-size='10' fill='%236e6a86'%3EHandles other requests...%3C/text%3E%3Cline x1='430' y1='80' x2='490' y2='80' stroke='%23f6c177' stroke-width='1.5' marker-end='url(%23arr3)'/%3E%3Cdefs%3E%3Cmarker id='arr3' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'%3E%3Cpath d='M 0 0 L 10 5 L 0 10 z' fill='%23f6c177'/%3E%3C/marker%3E%3C/defs%3E%3Ctext x='460' y='72' text-anchor='middle' font-size='9' fill='%23f6c177'%3Efork%3C/text%3E%3Crect x='490' y='60' width='160' height='130' rx='12' fill='%2326233a' stroke='%23403d52' stroke-width='1.5'/%3E%3Ctext x='570' y='88' text-anchor='middle' font-size='13' font-weight='600' fill='%23e0def4'%3ECoding Agent%3C/text%3E%3Ctext x='570' y='106' text-anchor='middle' font-size='10' fill='%23908caa'%3Echild — full context%3C/text%3E%3Ctext x='570' y='130' text-anchor='middle' font-size='10' fill='%23908caa'%3EReads issue%3C/text%3E%3Ctext x='570' y='148' text-anchor='middle' font-size='10' fill='%23908caa'%3EEdits files / runs tests%3C/text%3E%3Ctext x='570' y='174' text-anchor='middle' font-size='10' fill='%239ccfd8'%3E%E2%9C%93 Done%3C/text%3E%3Cline x1='490' y1='170' x2='430' y2='172' stroke='%239ccfd8' stroke-width='1.5' stroke-dasharray='5,3' marker-end='url(%23arr4)'/%3E%3Cdefs%3E%3Cmarker id='arr4' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'%3E%3Cpath d='M 0 0 L 10 5 L 0 10 z' fill='%239ccfd8'/%3E%3C/marker%3E%3C/defs%3E%3Ctext x='470' y='188' text-anchor='middle' font-size='9' fill='%239ccfd8'%3Enotify%3C/text%3E%3C/svg%3E" width="640">

Parent stays **responsive**. Child works with **full context**.
Completion notification = async, like background tasks.
This already works in Wuhu today.

---

# The `wuhu` Tool

**Problem:** Rich environment = many tools = bloated LLM context.

**Solution:** One **`wuhu`** tool. Agent calls it like a CLI:

```
wuhu("session list --status running")
wuhu("workspace query --view open-issues")
wuhu("session set-title 'Fix the auth bug'")
wuhu("channel post engineering 'Starting work'")
```

One tool in the schema. Discoverable via `wuhu("help")`.
Agents on remote runners can talk back to the mothership — no SSH, no env vars.

---

# QuickJS Code Sandbox

For **multi-step orchestration**, embed QuickJS. Agent writes JS:

```javascript
code(`
  const issues = workspace.query({
    kind: 'issue', status: 'open'
  });
  sessions.create({
    env: 'backend',
    title: 'Fix ' + issues[0].title
  });
  channels.post('eng', 'Started on ' + issues[0].title);
`)
```

One tool call. Multiple operations. **Zero round trips.**

All tools exposed as JS functions — `bash()`, `read()`, `write()`, MCP tools.
Sandboxed, fast startup (~1ms), no state leaks.

---

# Workspace: Git-Native Knowledge Base

Every doc is **markdown + YAML frontmatter**. Git-managed.

Implicit rules (`wuhu.yml`) — no repetition:
```yaml
rules:
  - path: "issues/**"
    metadata: { kind: issue }
```

**Database views** — live queries embedded in docs:
```sql
SELECT * FROM documents
WHERE kind = 'issue' AND status = 'open'
ORDER BY priority DESC
```

**Personalized dashboards** — your home page is a markdown file with your own queries.

---

# Channels: Let's Experiment

We use Lark for IM and it works fine. I'm not proposing to replace it.

But — what if a channel had an AI agent as a real participant?
Not a bot you @ — an agent that **listens, responds, takes action**.

The session infrastructure already supports this. Steer queues, tool calls, event-driven notifications — the building blocks are there.

**I want permission to experiment.** Try it for a few weeks. If multi-channel async agents work, it changes how a small team operates. If they don't, we've lost nothing — it's the same infrastructure powering coding sessions.

---

# Native Apps

In a sea of **Electron apps** — Codex, Claude Desktop, Cursor —
a native SwiftUI app **stands out**.

- **macOS** — already working ✅
- **iOS** — shared codebase via TCA (coming soon)
- **visionOS** — name one AI tool with a visionOS app. **Zero.**

CLI for every interaction. Fully headless-capable.

> HN bait: *"Native macOS/iOS/visionOS AI workspace"*

---

# Observability

**Raw LLM logging** — every request and response.

**Cost tracking** — per session, per user, per issue.

**Task reproduction** — replay tasks on new models.
*"Can DeepSeek 4 solve this? How much cheaper?"*

**Regression detection** — did a provider nerf their model?
Replay a batch of tasks. Statistical evidence, not vibes.

---

# The Roadmap

Half of my effort. Solo, for maximal efficiency.
Weekly checkpoints with the team.

| Week | Milestone |
|------|-----------|
| **Week 1** | A team workspace for everyone |
| **Week 2+** | Choose from: |

- **Async agent** — event-driven multi-channel assistant
- **Memory layer** — workspace query engine, database views, personalized dashboards
- **Cross-workspace agent** — your agent visits other shells, works on your behalf

**The pattern:** Small repos → agents iterate → pin versions → integrate.
Each repo is a sub-team. Team lead is me. Engineers are coding agents.

---

<!-- _class: lead -->

# Wuhu

## Your workspace. Your server. Your agents.

## 5 days → working product. Imagine 5 ~~months~~ weeks.
