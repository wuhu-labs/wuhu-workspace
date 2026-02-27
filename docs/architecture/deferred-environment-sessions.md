---
title: "Deferred Environment Commitment"
kind: architecture
status: draft
priority: high
related: [orchestrator-sessions, quickjs-tool-sandbox]
---

# Deferred Environment Commitment

## Problem

Today, a Wuhu session is born as a coding session. It starts with an
environment — a directory, a filesystem, bash tools. This is the Claude Code /
Codex model. But not every session needs that. A conversation about
architecture, a triage of issues, an orchestrator coordinating child
sessions — none of these need a filesystem at birth. Some never need one at
all.

The hard coupling between "session" and "environment" creates a false
dichotomy: chat products (ChatGPT) and coding agents (Claude Code) feel like
fundamentally different things. They aren't. They're the same primitive — a
session with an LLM — with different tool surfaces attached.

## Design

### Sessions start environment-free

A new session is a transcript + LLM + input lanes. No directory, no bash, no
filesystem tools. It works like ChatGPT: pure conversation.

The session contract (transcript, lanes, checkpoints, subscription,
compaction) is unchanged. Environments are not part of the session model —
they're a resource the session can acquire.

### Agents request environments on demand

When the agent decides it needs compute, it requests an environment:

```
request_environment(
  spec: "wuhu-umbrella",
  preference: "local"     // or "cloud", or "any"
)
```

This is an explicit, observable action in the transcript. The system resolves
the spec to a concrete environment (local directory, cloud sandbox, etc.) and
attaches it. New tools (bash, read, write) become available.

The agent **proposes**, the system (or human) **approves**. The agent says "I
need a Swift build environment, preferring local." The system resolves that to
a concrete environment and may prompt the human if it involves cost or
security decisions. Over time, policies can automate approval for trusted
patterns.

### Multiple environments per session

A session can attach more than one environment. Each environment is a named
resource with its own tool namespace:

- A local Mac shell for building Swift
- A cloud sandbox for running untrusted code
- A browser environment for testing

Tools are scoped by environment. This connects to the "universal bash with
env/path targeting" proposal from the orchestrator sessions doc.

### Environment attachment is a transcript event

When an environment is attached, it appears as an entry in the transcript:

```
[system] Environment "wuhu-umbrella" (local, macOS,
         /Users/minsheng/Developer/WuhuLabs/sessions/abc123/)
         attached.
         AGENTS.md found — loading context.
```

Observable by the user, by the agent, and by any subscriber. No magic.

## Baseline Tool Surface

A session without an environment is not toolless. It starts with a baseline
tool surface that enables useful work before any environment is attached.

### QuickJS programmatic environment

Every session has access to a lightweight QuickJS sandbox (see the QuickJS
Tool Sandbox doc). This provides:

- Basic scripting — loops, filtering, string manipulation
- `fetch()` — HTTP requests to external APIs
- Wuhu APIs — workspace queries, session management, channel posting

This means even a "chat" session can do real work: query issues, read
workspace docs, create sessions, post to channels. The QuickJS sandbox is
the universal tool that doesn't require an environment.

### Custom URL scheme for read/write

The `read` and `write` tools support a `wuhu://` URL scheme that resolves
to well-known locations without hardcoded paths:

| URL | Resolves to |
|-----|-------------|
| `wuhu://workspace/` | `~/.wuhu/workspace/` (the knowledge base root) |
| `wuhu://workspace/issues/0041.md` | `~/.wuhu/workspace/issues/0041.md` |
| `wuhu://workspace/docs/architecture/` | Architecture docs |
| `wuhu://config/server.yml` | `~/.wuhu/server.yml` |
| `wuhu://env/<name>/` | Named environment root (after attachment) |

Benefits:

- **No hardcoded paths in AGENTS.md.** The global context says "the workspace
  is at `wuhu://workspace/`" — portable across machines, users, and
  deployment modes.
- **Works before environment attachment.** The workspace is always
  addressable, even without a filesystem environment.
- **Extensible.** New schemes can map to cloud storage, remote machines, or
  MCP resources.

The `read` and `write` tools accept both `wuhu://` URLs and regular file
paths. When an environment is attached, relative paths resolve against that
environment's root (as today). The URL scheme is an addition, not a
replacement.

## Context Injection: AGENTS.md Without a Directory

### The problem

In the coding model, AGENTS.md discovery is automatic — walk up from pwd,
find context files, inject them. The directory *is* the context. In a chat
model, there's no pwd. So where does context come from?

### Global context (user profile)

Every user maintains a **global context document** — their Wuhu profile. This
is always injected at session start. It replaces the implicit filesystem walk
with an explicit, deliberately maintained document.

The global context is a **map, not an encyclopedia**. It tells the agent
where to look, not everything it needs to know:

```markdown
# Global Context

I'm Minsheng. I work on Wuhu.

## Workspace

The knowledge base is at wuhu://workspace/. Check there for issues, design
docs, and project plans.

## Repositories

- wuhu-swift: Main server, CLI, runner. See wuhu://workspace/docs/architecture/
  for design docs. Repo-level context: AGENTS.md in the repo root.
- wuhu-ai: PiAI — unified LLM client library.

## Preferences

- Swift 6.2 toolchain
- Formatting: swiftformat (run via swift package plugin)
- Issues use WUHU-#### format, stored at wuhu://workspace/issues/
```

The agent follows references on demand. When the user says "the doc about
orchestrator sessions," the agent knows to check `wuhu://workspace/docs/`
first.

### Why this is better than today

Today's AGENTS.md files are discovered implicitly. Nobody thinks carefully
about what's in them because the injection is automatic. Quality drifts.
Critical information (like "the workspace is at ~/.wuhu/workspace/") ends up
in one repo's AGENTS.md but not another's.

When the global context is the **only** thing the agent sees at session start,
the quality bar goes up. It's the difference between a `.bashrc` that
accumulates random exports over 10 years and a deliberately written config
file.

### Format

Freeform markdown with light conventions. It should feel like writing a note
to a colleague, not filling out a form. A few well-known headings
(`## Repositories`, `## Preferences`, `## Workspace`) let the system optimize
(e.g., pre-fetching referenced docs), but they're not required.

### Environment-level AGENTS.md: auto-load on attach

When an environment is attached, the system discovers and loads the
environment's AGENTS.md. This is:

- **Visible in the transcript** — an entry shows that context was loaded and
  what it contains.
- **Additive** — environment context layers on top of the global context.
- **Scoped** — for work within that environment, environment-level
  instructions take precedence over global ones. No explicit override
  mechanism needed; the LLM resolves conflicts naturally (just as a developer
  reads both a team style guide and a repo-specific CONTRIBUTING.md).

In a multi-environment session, each environment's AGENTS.md is loaded when
that environment is attached — not all at once upfront. This keeps context
focused.

### The full flow

1. **Session starts** → inject global context. Agent knows who you are, where
   things live, your preferences.
2. **Conversation happens.** Maybe it stays pure chat. Maybe the agent
   realizes it needs code access.
3. **Agent requests environment** → system attaches it, discovers and injects
   repo AGENTS.md as a visible transcript entry.
4. **Agent works** with both global and repo-level context, plus tools for
   that environment.

## Implications

### Orchestrator sessions become natural

An orchestrator session is just a session that never attaches its own
filesystem environment. It coordinates via QuickJS, workspace queries, and
session management tools. When it needs a child to do coding work, it
requests an environment for the child, not for itself. The awkward
"orchestrator needs an env just to exist" problem disappears.

### Chat and coding unify

There is one kind of session. Some acquire environments, some don't. The
product surface is one thing — not "Wuhu Chat" and "Wuhu Code" as separate
modes. Users start talking, and the conversation evolves into coding when
needed. This is how humans work.

### Environment lifecycle is a session concern

Environments can be attached, detached, and replaced during a session's
lifetime. A long-running session might start with a local env, detach it
when the work is done, and attach a different one for the next task. This is
a natural extension of deferred commitment.

## Open Questions

- **Environment selection UI.** When the agent proposes an environment, how
  does the human approve? Inline in the transcript? A modal? A notification?
- **Warm-start pools.** Deferred attachment means the environment might not
  be warm when needed. Pre-warmed pools help but add infrastructure
  complexity.
- **Global context editing UX.** Where does the user edit their global
  context? A file in `~/.wuhu/`? A settings page in the app? Both?
- **Policy engine.** Which environments can be auto-approved vs. require
  human confirmation? Cost thresholds? Security boundaries?
