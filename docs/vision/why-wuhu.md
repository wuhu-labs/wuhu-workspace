---
title: "Why Wuhu"
kind: vision
status: draft
---

# Why Wuhu

## The Problem

Today's AI coding tools are bolted onto existing workflows:
- GitHub Copilot adds AI to VS Code
- Cursor adds AI to an IDE fork
- Claude Code adds AI to the terminal

But the workspace itself — issues, docs, communication, CI, deployment —
remains unchanged. AI is a feature, not a foundation.

## The Opportunity

What if you built the entire workspace assuming AI agents are first-class
participants from day one?

- **Issues** aren't just for humans to read — agents query them, pick up
  work, update status, and close them
- **Docs** aren't static pages — they contain live queries, and agents
  read/write them as part of their workflow
- **Channels** aren't just for humans to chat — agents post their intent,
  ask for clarification, and report results
- **Sessions** aren't hidden implementation details — they're visible,
  steerable, persistent records of what agents did and why

## Why Not Just Use Existing Tools + AI?

You can integrate AI into Notion + Linear + Slack + GitHub. Many companies
are trying. But:

1. **Data is siloed.** The AI can see your Slack messages OR your GitHub
   PRs, not both in the same context.
2. **Workflows are human-shaped.** Linear's UI assumes a human is dragging
   cards. An agent needs an API, not a drag-and-drop interface.
3. **No shared context.** When an agent creates a PR, it can't reference
   the Slack conversation that motivated it.
4. **Observability is afterthought.** You can't answer "how much did this
   feature cost in AI compute?" or "can a cheaper model do this task?"

## Why Swift

- **Structured concurrency**: Actors and async/await are perfect for
  session management, agent loops, and real-time streaming
- **Performance**: Low memory footprint, fast startup, no GC pauses
- **Native apps**: First-class macOS, iOS, visionOS support
- **Single language**: Server, CLI, and apps in one language
- **Type safety**: The compiler catches entire classes of bugs
- **Point-Free ecosystem**: TCA for ultra-modularized app architecture

## Why Monolithic

- **Simplicity**: One process, one database, in-memory actors. No
  distributed systems overhead.
- **Testability**: Boot the server in-process, run tests against it.
  No containers, no network mocking.
- **Latency**: In-process fanout for real-time events. No message broker.
- **Cost**: Runs on a single VPS. No Kubernetes cluster.

We scale vertically first. When (if) we outgrow a single box, the
architecture supports sharding and distribution — but we don't pay that
complexity tax until we need it.

## The Bet

AI agents are going from "autocomplete" to "teammate" in 2025-2026. The
teams that win will be the ones with infrastructure purpose-built for
human-AI collaboration. Wuhu is that infrastructure.
