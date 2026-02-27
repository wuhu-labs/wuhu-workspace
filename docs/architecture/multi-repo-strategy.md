---
title: "Multi-Repo Strategy"
kind: architecture
status: active
---

# Multi-Repo Strategy

## Why Multi-Repo

Wuhu is split across multiple independent repositories. The motivations:

1. **Parallel agent development**: Multiple agents can work on different
   packages simultaneously without interfering with each other. Separate repos
   make interference physically impossible.

2. **Independent velocity**: The workspace query engine can iterate at 0.x
   speed with breaking changes, while the server stays stable. Each repo has
   its own version, its own release cadence.

3. **Testability**: Small packages are easier for agents to hold in context,
   test in isolation, and validate. An agent working on the workspace engine
   doesn't need to understand the server or the app.

4. **Selective integration**: Downstream repos pin specific version tags.
   A package can "boil" with experimental changes on main without affecting
   consumers until explicitly integrated via a new tag.

5. **Experimentation**: Mini apps can be spun up from a subset of packages
   (e.g., PiAI + chat UI) to try ideas without booting the full system.

## Versioning

All packages use semantic versioning with a 0.x convention: during major
version 0, any minor bump may introduce breaking changes. This allows rapid
iteration while still providing pinnable version tags.

Packages graduate to 1.0 when their contracts stabilize.

### Why version tags, not branches

Downstream repos depend on version tags (e.g., `from: "0.1.0"`), not
branches. The reason is simple: **tags are commitment, branches are not.**

You want the freedom to experiment and break things on `main` without forcing
downstream consumers to deal with it. Only when you're happy do you tag a
release, and that tag is the signal: "this is ready for others to consume."

A branch like `main` is a moving target. A tag like `0.1.0` is immutable.
This lets each repo iterate independently without accidental coupling.

## Repository Layout (Current)

### wuhu-ai

**LLM client library.** Zero Wuhu-specific knowledge.

- Providers: OpenAI (Chat + Responses), Anthropic Messages, future providers
- Streaming support, tool call parsing, retry policies
- Request/response types, model catalogs
- **Dependencies**: None (Foundation only)
- **Status**: Extracted. Tagged at 0.1.0.

### wuhu-workspace-engine

**Workspace scanning and querying.**

- Markdown parser, YAML frontmatter indexer, directory scanner
- Query engine for workspace docs and issues
- **Dependencies**: None (Foundation only)
- **Status**: Extracted. Tagged at 0.1.0.

### wuhu-core

**Agent runtime, session model, server, runner, CLI.**

The heart of Wuhu — everything except the native apps:
- `WuhuAPI` — Shared types: models, enums, HTTP types, provider definitions
- `WuhuCoreClient` — Client-safe session contracts, queue types, SSE transport
- `WuhuCore` — Agent loop, session store, SQLite persistence, tools, compaction
- `WuhuClient` — HTTP client library
- `WuhuServer` — Hummingbird HTTP server, runner registry
- `WuhuRunner` — Remote tool execution daemon
- `WuhuCLIKit` — CLI output formatting
- `wuhu` CLI executable — Wires everything together
- All tests

The CLI lives here intentionally: it gives coding agents working on core the
ability to test features end-to-end (spin up a server, send prompts, verify
behavior) without needing a separate repo.

- **Dependencies**: `wuhu-ai`, `wuhu-workspace-engine`, GRDB, Hummingbird, Yams
- **Status**: Extracted from `wuhu` monorepo. Tagged at 0.1.0.

### wuhu-app

**Native apps: macOS and iOS.**

SwiftUI + TCA (ComposableArchitecture):
- iOS app (`WuhuApp`)
- macOS app (`WuhuAppMac`)
- XcodeGen-based project (`project.yml` is source of truth)
- TestFlight build/upload scripts

- **Dependencies**: `wuhu-core` (for `WuhuAPI`, `WuhuClient`, `WuhuCoreClient`),
  ComposableArchitecture, MarkdownUI
- **Status**: Extracted from `wuhu` monorepo.

### wuhu (archived)

The original monorepo. Frozen after the split into `wuhu-core` and `wuhu-app`.
May be repurposed for marketing materials in the future.

## Contracts Philosophy

Contracts are defined in Swift (or TypeScript for web), not OpenAPI. The
transport layer (HTTP, WebSocket) is an implementation detail hidden behind
protocols.

For each domain:
- **Protocol** defines the contract (`WorkspaceQuerying`, `SessionCommanding`)
- **Engine** implements it locally (direct function calls)
- **Client** implements it remotely (HTTP under the hood)
- **Mock** implements it for testing (in-memory fake)

From the consumer's perspective, they talk to the protocol. Transport is
invisible. Unit tests verify that the real client and server agree by
round-tripping calls.

For TypeScript (future web app): equivalent interfaces, a TS client, tested
against the same server. Contracts are duplicated across languages but small
and stable.

## Development Workflow

### Umbrella Workspace

The [wuhu-umbrella](https://github.com/wuhu-labs/wuhu-umbrella) repo ties
all repos together as a folder-template for agent development:

```
wuhu-umbrella/
  AGENTS.md            # Cross-repo concerns
  repos.yml            # Repo definitions for sync.ts
  wuhu-ai/             # clone of wuhu-ai
  wuhu-workspace-engine/  # clone of wuhu-workspace-engine
  wuhu-core/           # clone of wuhu-core
  wuhu-app/            # clone of wuhu-app
  wuhu/                # clone of wuhu (archived)
```

Each task gets a fresh copy via Wuhu's folder-template environment feature.
Run `bun sync.ts` to pull latest on all child repos.

### CI

Each repo has its own CI. GitHub Actions with branch protection rules.

### Agent Ergonomics

Small packages = small context = agents can hold the whole thing in their
head. An agent working on the workspace query engine only needs to understand
that one repo. It runs tests locally, validates, ships a PR. No knowledge of
the server, the app, or the agent runtime required.

## Dependency Graph

```
wuhu-ai (PiAI)              wuhu-workspace-engine (WorkspaceEngine, WorkspaceScanner)
     ↑                                    ↑
     └─────────── wuhu-core ─────────────┘
                     ↑
                  wuhu-app
```

## Future Considerations

- **wuhu-core could split further**: The doc's original vision had a separate
  `wuhu-core` (pure runtime/contracts) and `wuhu` (server/integration). If
  the repo grows large enough that agents struggle with context, this split
  can be revisited. For now, keeping them together gives end-to-end
  testability.

- **Ultra-modular app**: `wuhu-app` could eventually have internal modules
  per feature (workspace UI, chat UI, session UI) built with Tuist or SPM
  local packages.

## Build Times and Caching

SPM resolves all transitive dependencies at the top level — no npm-style
duplication. `.build` contains compiled artifacts, not source copies.

For folder templates: nuke `.build` from template, accept cold build on first
use. Agents don't get bored waiting for `swift build`. LLM calls cost 100x
more than compute. Optimize for token efficiency, not build times.

A startup script can run `swift package resolve` to pre-fetch dependencies
if cold builds become a real bottleneck.
