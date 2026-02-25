---
marp: true
theme: uncover
paginate: true
style: |
  section {
    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
    font-size: 1.6em;
  }
  section.lead h1 {
    font-size: 2.4em;
    color: #e67e22;
  }
  section.lead h2 {
    font-size: 1.2em;
    color: #888;
    font-weight: 400;
  }
  h1 { color: #e67e22; font-size: 1.6em; }
  h2 { color: #444; font-size: 1.2em; }
  strong { color: #e67e22; }
  code {
    font-size: 0.7em;
    background: #f8f4f0;
    color: #c06020;
  }
  pre code {
    font-size: 0.55em;
    line-height: 1.4;
  }
  table { font-size: 0.8em; }
  blockquote {
    border-left: 4px solid #e67e22;
    padding-left: 1em;
    color: #888;
    font-size: 0.9em;
  }
  img { display: block; margin: 0 auto; }
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

No vendor lock-in. Git-managed. Markdown files.

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

<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 720 420' font-family='-apple-system,Helvetica Neue,sans-serif'%3E%3Crect x='40' y='20' width='640' height='280' rx='16' fill='%23fdf6ef' stroke='%23e67e22' stroke-width='2'/%3E%3Ctext x='360' y='52' text-anchor='middle' font-size='16' font-weight='bold' fill='%23e67e22'%3EWuhu Server (single process)%3C/text%3E%3Crect x='80' y='75' width='170' height='65' rx='10' fill='%23fff' stroke='%23ddd' stroke-width='1.5'/%3E%3Ctext x='165' y='100' text-anchor='middle' font-size='12' font-weight='600' fill='%23333'%3ESession Runtime%3C/text%3E%3Ctext x='165' y='118' text-anchor='middle' font-size='11' fill='%23888'%3ESwift Actor%3C/text%3E%3Crect x='280' y='75' width='170' height='65' rx='10' fill='%23fff' stroke='%23ddd' stroke-width='1.5'/%3E%3Ctext x='365' y='100' text-anchor='middle' font-size='12' font-weight='600' fill='%23333'%3ESession Runtime%3C/text%3E%3Ctext x='365' y='118' text-anchor='middle' font-size='11' fill='%23888'%3ESwift Actor%3C/text%3E%3Crect x='480' y='75' width='170' height='65' rx='10' fill='%23fff' stroke='%23ddd' stroke-width='1.5'/%3E%3Ctext x='565' y='100' text-anchor='middle' font-size='12' font-weight='600' fill='%23333'%3ESession Runtime%3C/text%3E%3Ctext x='565' y='118' text-anchor='middle' font-size='11' fill='%23888'%3ESwift Actor%3C/text%3E%3Crect x='160' y='170' width='400' height='50' rx='10' fill='%23fff' stroke='%23e67e22' stroke-width='1.5'/%3E%3Ctext x='360' y='200' text-anchor='middle' font-size='13' font-weight='600' fill='%23c06020'%3ESQLite (GRDB / WAL) — single file, append-only%3C/text%3E%3Crect x='100' y='245' width='140' height='40' rx='8' fill='%23fff' stroke='%23ddd' stroke-width='1.5'/%3E%3Ctext x='170' y='270' text-anchor='middle' font-size='12' fill='%23333'%3EOpenAI API%3C/text%3E%3Crect x='290' y='245' width='140' height='40' rx='8' fill='%23fff' stroke='%23ddd' stroke-width='1.5'/%3E%3Ctext x='360' y='270' text-anchor='middle' font-size='12' fill='%23333'%3EAnthropic API%3C/text%3E%3Crect x='480' y='245' width='140' height='40' rx='8' fill='%23fff' stroke='%23ddd' stroke-width='1.5'/%3E%3Ctext x='550' y='270' text-anchor='middle' font-size='12' fill='%23333'%3EFuture LLMs%3C/text%3E%3Cline x1='360' y1='300' x2='360' y2='340' stroke='%23e67e22' stroke-width='2' stroke-dasharray='6,4'/%3E%3Ctext x='395' y='335' font-size='11' fill='%23888'%3EWebSocket%3C/text%3E%3Crect x='260' y='345' width='200' height='55' rx='12' fill='%23fdf6ef' stroke='%23e67e22' stroke-width='2'/%3E%3Ctext x='360' y='370' text-anchor='middle' font-size='13' font-weight='600' fill='%23e67e22'%3ERunner%3C/text%3E%3Ctext x='360' y='388' text-anchor='middle' font-size='11' fill='%23888'%3Ebash %2B files (any machine)%3C/text%3E%3C/svg%3E" width="680">

---

# Why This Architecture?

**Stateful actors > cloud-native.**

Cloud coding agents: read full transcript from DB on **every** tool result → reconstruct prompt → call LLM → discard everything. O(n) per iteration.

Wuhu: transcript in memory. DB for durability. Hot loop is **O(1)**.

No Kafka. No Redis. No Kubernetes.

---

# Crash Resilience

**Persist first, then update memory.**

If the process crashes mid-session:
1. Restart the process
2. Agent loop loads state from SQLite
3. Stale tool calls get auto-repaired
4. Execution resumes exactly where it left off

No special recovery code path. The normal startup sequence handles everything.

---

# Server + Runner: Brain vs Hands

The server is the **brain** — sessions, LLM calls, decisions.
Runners are the **hands** — execute commands on any machine.

<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 680 200' font-family='-apple-system,Helvetica Neue,sans-serif'%3E%3Crect x='220' y='10' width='240' height='55' rx='12' fill='%23fdf6ef' stroke='%23e67e22' stroke-width='2'/%3E%3Ctext x='340' y='35' text-anchor='middle' font-size='14' font-weight='bold' fill='%23e67e22'%3EAgent Loop (Server)%3C/text%3E%3Ctext x='340' y='52' text-anchor='middle' font-size='11' fill='%23888'%3ELLM calls %2B decisions%3C/text%3E%3Cline x1='260' y1='65' x2='110' y2='110' stroke='%23ddd' stroke-width='1.5'/%3E%3Cline x1='340' y1='65' x2='340' y2='110' stroke='%23ddd' stroke-width='1.5'/%3E%3Cline x1='420' y1='65' x2='570' y2='110' stroke='%23ddd' stroke-width='1.5'/%3E%3Crect x='30' y='110' width='160' height='70' rx='10' fill='%23fff' stroke='%23ddd' stroke-width='1.5'/%3E%3Ctext x='110' y='140' text-anchor='middle' font-size='12' font-weight='600' fill='%23333'%3ERunner A%3C/text%3E%3Ctext x='110' y='158' text-anchor='middle' font-size='10' fill='%23888'%3EMacBook%3C/text%3E%3Ctext x='110' y='172' text-anchor='middle' font-size='10' fill='%23888'%3E%22read frontend repo%22%3C/text%3E%3Crect x='260' y='110' width='160' height='70' rx='10' fill='%23fff' stroke='%23ddd' stroke-width='1.5'/%3E%3Ctext x='340' y='140' text-anchor='middle' font-size='12' font-weight='600' fill='%23333'%3ERunner B%3C/text%3E%3Ctext x='340' y='158' text-anchor='middle' font-size='10' fill='%23888'%3EVPS / Lambda%3C/text%3E%3Ctext x='340' y='172' text-anchor='middle' font-size='10' fill='%23888'%3E%22run backend tests%22%3C/text%3E%3Crect x='490' y='110' width='160' height='70' rx='10' fill='%23fff' stroke='%23ddd' stroke-width='1.5'/%3E%3Ctext x='570' y='140' text-anchor='middle' font-size='12' font-weight='600' fill='%23333'%3ERunner C%3C/text%3E%3Ctext x='570' y='158' text-anchor='middle' font-size='10' fill='%23888'%3ECloudflare / e2b%3C/text%3E%3Ctext x='570' y='172' text-anchor='middle' font-size='10' fill='%23888'%3E%22deploy to staging%22%3C/text%3E%3C/svg%3E" width="650">

Runner protocol is **language-agnostic** (JSON over WebSocket).
One agent can use multiple machines simultaneously.

---

# The Session Model

<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 660 280' font-family='-apple-system,Helvetica Neue,sans-serif'%3E%3Crect x='30' y='10' width='600' height='260' rx='14' fill='%23fdf6ef' stroke='%23e67e22' stroke-width='2'/%3E%3Ctext x='330' y='40' text-anchor='middle' font-size='15' font-weight='bold' fill='%23e67e22'%3EAgent Loop%3C/text%3E%3Crect x='60' y='60' width='180' height='50' rx='8' fill='%23e74c3c' fill-opacity='0.1' stroke='%23e74c3c' stroke-width='1.5'/%3E%3Ctext x='150' y='82' text-anchor='middle' font-size='12' font-weight='600' fill='%23e74c3c'%3ESystem Lane%3C/text%3E%3Ctext x='150' y='100' text-anchor='middle' font-size='10' fill='%23888'%3Easync_bash callbacks%3C/text%3E%3Crect x='60' y='120' width='180' height='50' rx='8' fill='%23e67e22' fill-opacity='0.1' stroke='%23e67e22' stroke-width='1.5'/%3E%3Ctext x='150' y='142' text-anchor='middle' font-size='12' font-weight='600' fill='%23e67e22'%3ESteer Lane%3C/text%3E%3Ctext x='150' y='160' text-anchor='middle' font-size='10' fill='%23888'%3E%22stop, do X instead%22%3C/text%3E%3Crect x='60' y='180' width='180' height='50' rx='8' fill='%233498db' fill-opacity='0.1' stroke='%233498db' stroke-width='1.5'/%3E%3Ctext x='150' y='202' text-anchor='middle' font-size='12' font-weight='600' fill='%233498db'%3EFollow-up Lane%3C/text%3E%3Ctext x='150' y='220' text-anchor='middle' font-size='10' fill='%23888'%3E%22now do Y%22%3C/text%3E%3Cline x1='260' y1='85' x2='320' y2='130' stroke='%23e74c3c' stroke-width='1' stroke-dasharray='4,3'/%3E%3Cline x1='260' y1='145' x2='320' y2='140' stroke='%23e67e22' stroke-width='1' stroke-dasharray='4,3'/%3E%3Cline x1='260' y1='205' x2='320' y2='160' stroke='%233498db' stroke-width='1' stroke-dasharray='4,3'/%3E%3Crect x='320' y='105' width='130' height='75' rx='8' fill='%23fff' stroke='%23ddd' stroke-width='1.5'/%3E%3Ctext x='385' y='132' text-anchor='middle' font-size='11' font-weight='600' fill='%23333'%3ECheckpoints%3C/text%3E%3Ctext x='385' y='148' text-anchor='middle' font-size='9' fill='%23888'%3EInterrupt (between%3C/text%3E%3Ctext x='385' y='160' text-anchor='middle' font-size='9' fill='%23888'%3Etool calls)%3C/text%3E%3Ctext x='385' y='174' text-anchor='middle' font-size='9' fill='%23888'%3ETurn boundary (idle)%3C/text%3E%3Cline x1='450' y1='145' x2='490' y2='145' stroke='%23ddd' stroke-width='1.5' marker-end='url(%23arrow)'/%3E%3Cdefs%3E%3Cmarker id='arrow' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'%3E%3Cpath d='M 0 0 L 10 5 L 0 10 z' fill='%23ddd'/%3E%3C/marker%3E%3C/defs%3E%3Crect x='490' y='70' width='120' height='145' rx='8' fill='%23fff' stroke='%23e67e22' stroke-width='1.5'/%3E%3Ctext x='550' y='95' text-anchor='middle' font-size='11' font-weight='600' fill='%23e67e22'%3ETranscript%3C/text%3E%3Ctext x='550' y='115' text-anchor='middle' font-size='9' fill='%23888'%3Eentry₁%3C/text%3E%3Ctext x='550' y='130' text-anchor='middle' font-size='9' fill='%23888'%3Eentry₂%3C/text%3E%3Ctext x='550' y='145' text-anchor='middle' font-size='9' fill='%23888'%3Eentry₃%3C/text%3E%3Ctext x='550' y='160' text-anchor='middle' font-size='9' fill='%23888'%3E...%3C/text%3E%3Ctext x='550' y='180' text-anchor='middle' font-size='9' fill='%23888'%3Eappend-only%3C/text%3E%3Ctext x='550' y='200' text-anchor='middle' font-size='9' fill='%23888'%3E%2B compaction%3C/text%3E%3C/svg%3E" width="630">

**Steer** = course-correct a running agent without waiting.
**Follow-up** = queue work for after it finishes.

---

# Self-Fork: Agents Spawning Agents

<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 660 300' font-family='-apple-system,Helvetica Neue,sans-serif'%3E%3Crect x='30' y='20' width='130' height='40' rx='20' fill='%233498db' fill-opacity='0.15' stroke='%233498db' stroke-width='1.5'/%3E%3Ctext x='95' y='45' text-anchor='middle' font-size='13' font-weight='600' fill='%233498db'%3EYou%3C/text%3E%3Cline x1='160' y1='40' x2='230' y2='40' stroke='%23bbb' stroke-width='1.5' marker-end='url(%23arr2)'/%3E%3Cdefs%3E%3Cmarker id='arr2' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'%3E%3Cpath d='M 0 0 L 10 5 L 0 10 z' fill='%23bbb'/%3E%3C/marker%3E%3C/defs%3E%3Ctext x='195' y='32' text-anchor='middle' font-size='9' fill='%23888'%3E%22Fix auth bug%22%3C/text%3E%3Crect x='230' y='10' width='200' height='260' rx='12' fill='%23fdf6ef' stroke='%23e67e22' stroke-width='2'/%3E%3Ctext x='330' y='40' text-anchor='middle' font-size='13' font-weight='bold' fill='%23e67e22'%3EChannel Agent%3C/text%3E%3Ctext x='330' y='58' text-anchor='middle' font-size='10' fill='%23888'%3E(parent — stays responsive)%3C/text%3E%3Ctext x='330' y='85' text-anchor='middle' font-size='10' fill='%23666'%3E%22On it! Starting a session.%22%3C/text%3E%3Ctext x='330' y='195' text-anchor='middle' font-size='10' fill='%23666'%3E%22Auth bug fixed. PR ready.%22%3C/text%3E%3Ctext x='330' y='230' text-anchor='middle' font-size='10' fill='%23666'%3EContinues chatting...%3C/text%3E%3Ctext x='330' y='255' text-anchor='middle' font-size='10' fill='%23666'%3EHandles other requests...%3C/text%3E%3Cline x1='430' y1='80' x2='490' y2='80' stroke='%23e67e22' stroke-width='1.5' marker-end='url(%23arr3)'/%3E%3Cdefs%3E%3Cmarker id='arr3' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'%3E%3Cpath d='M 0 0 L 10 5 L 0 10 z' fill='%23e67e22'/%3E%3C/marker%3E%3C/defs%3E%3Ctext x='460' y='72' text-anchor='middle' font-size='9' fill='%23e67e22'%3Efork%3C/text%3E%3Crect x='490' y='60' width='160' height='140' rx='12' fill='%23fff' stroke='%23ddd' stroke-width='1.5'/%3E%3Ctext x='570' y='88' text-anchor='middle' font-size='13' font-weight='600' fill='%23333'%3ECoding Agent%3C/text%3E%3Ctext x='570' y='106' text-anchor='middle' font-size='10' fill='%23888'%3E(child — full context)%3C/text%3E%3Ctext x='570' y='130' text-anchor='middle' font-size='10' fill='%23666'%3EReads issue%3C/text%3E%3Ctext x='570' y='148' text-anchor='middle' font-size='10' fill='%23666'%3EEdits files%3C/text%3E%3Ctext x='570' y='166' text-anchor='middle' font-size='10' fill='%23666'%3ERuns tests%3C/text%3E%3Ctext x='570' y='184' text-anchor='middle' font-size='10' fill='%232ecc71'%3E✓ Done%3C/text%3E%3Cline x1='490' y1='185' x2='430' y2='190' stroke='%232ecc71' stroke-width='1.5' stroke-dasharray='5,3' marker-end='url(%23arr4)'/%3E%3Cdefs%3E%3Cmarker id='arr4' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'%3E%3Cpath d='M 0 0 L 10 5 L 0 10 z' fill='%232ecc71'/%3E%3C/marker%3E%3C/defs%3E%3Ctext x='470' y='205' text-anchor='middle' font-size='9' fill='%232ecc71'%3Enotify%3C/text%3E%3C/svg%3E" width="640">

Parent stays **responsive**. Child works with **full context**.
Completion notification = async, like background tasks.

---

# The `wuhu` Tool

**Problem:** Rich environment = many tools = bloated LLM context.

**Solution:** Embed **QuickJS** in the server. One tool, takes JavaScript:

```javascript
wuhu(`
  const issues = workspace.query({
    kind: 'issue', status: 'open'
  });
  sessions.create({
    env: 'backend',
    title: 'Fix ' + issues[0].title
  });
  channels.post('eng', 'Starting work on ' + issues[0].title);
`)
```

One tool call. Multiple operations. **Zero round trips.**

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

The infrastructure supports this today. The experiment:
**does the model generalize?** Let's find out.

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
```
SELECT * FROM documents
WHERE kind = 'issue' AND status = 'open'
ORDER BY priority DESC
```

**Personalized dashboards** — your home page is a markdown file
with your own queries. Like Notion, but plain files.

---

# Channels: Where Humans Meet Agents

Not replacing Lark — **extending the concept**.

A channel where agents are participants:
- You say "fix that bug" → agent forks a session, reports back
- Agent posts intent before acting
- Multiple humans + agents in one channel

**Human-centric.** Agents join via tool calls + event notifications.

What Lark would be if it was built for human-AI collaboration.

---

# Native Apps: The Differentiator

In a sea of **Electron apps** — Codex, Claude Desktop, Cursor —
a native SwiftUI app **stands out**.

- **macOS** — already working ✅
- **iOS** — shared codebase via TCA (coming soon)
- **visionOS** — name one AI tool with a visionOS app. **Zero.**

CLI for every interaction. Fully headless-capable.
But you'll use the app — because it's that good.

> HN bait: "Native macOS/iOS/visionOS AI workspace"

---

# Observability

**Raw LLM logging** — every request and response.

**Cost tracking** — per session, per user, per issue.
*"How much did this feature cost in AI compute?"*

**Task reproduction** — replay tasks on new models.
*"Can DeepSeek 4 solve this? How much cheaper?"*

**Regression detection** — did a provider nerf their model?
Replay a batch of tasks. Statistical evidence, not vibes.

---

# The Roadmap

| Week | Milestone |
|------|-----------|
| **Week 1** | Extract PiAI to own repo. Multi-repo workflow. |
| **Week 2** | Workspace query engine v0.1. Basic queries. |
| **Week 3** | Integrate workspace. iOS app prototype. |

**The pattern:** Small repos → agents iterate → pin versions → integrate.

Each repo is a sub-team.
The team lead is me. The engineers are coding agents.

---

<!-- _class: lead -->

# Wuhu

## Your workspace. Your server. Your agents.

## 5 days → working product. Imagine 5 months.

