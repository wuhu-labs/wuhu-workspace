---
title: "Competitive Landscape"
kind: vision
status: draft
---

# Competitive Landscape

## What Wuhu Replaces

| Tool | What it does | Wuhu equivalent |
|------|-------------|-----------------|
| Notion / Obsidian | Docs, knowledge base | Workspace engine (markdown + queries) |
| Linear | Issue tracking | Issues (markdown + frontmatter + kanban) |
| Slack / Discord | Team communication | Channels (human-centric, agent-participatory) |
| GitHub | Code hosting, PRs, CI | Merge queue + review (agent-managed, future) |
| Lark (ByteDance) | All-in-one workspace | The closest comp — Wuhu is AI-native Lark |

## What Wuhu Competes With (AI Coding)

| Tool | Approach | Limitation |
|------|----------|------------|
| Claude Code | Terminal agent | Single machine, no persistence across sessions |
| Cursor | IDE-integrated agent | Tied to the editor, no team collaboration |
| GitHub Copilot | Autocomplete + workspace | Feature bolted onto existing tools |
| Codex (OpenAI) | Cloud coding agent | Sandboxed, no local environment access |
| Devin | Autonomous agent | Black box, limited steerability |

## Wuhu's Differentiation

1. **Workspace-first, not agent-first.** Wuhu is the workspace. Agents are
   one capability, not the entire product.
2. **Async and steerable.** Users can course-correct running agents without
   restarting. Three-lane queue model (system, steer, follow-up).
3. **Multiplayer.** Multiple humans and agents in shared channels and
   sessions. Visibility by default.
4. **Persistent.** Sessions survive crashes. Full transcript with metadata.
   Replay and reproduce any task.
5. **Vertically integrated.** One system, one box. No glue between 5
   different SaaS products.
6. **Open architecture.** Runner protocol for compute providers. Workspace
   queries for tool builders. MCP integration. CLI for everything.
