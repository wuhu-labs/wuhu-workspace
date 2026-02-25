---
title: "Multi-Repo Strategy"
kind: architecture
status: draft
---

# Multi-Repo Strategy

## Why Multi-Repo

Wuhu is splitting from a single monolithic Swift package into multiple
independent repositories. The motivations:

1. **Parallel agent development**: Multiple agents can work on different
   packages simultaneously without interfering with each other. Separate repos
   make interference physically impossible.

2. **Independent velocity**: The workspace query engine can iterate at 0.x
   speed with breaking changes, while the server stays stable. Each repo has
   its own version, its own release cadence.

3. **Testability**: Small packages are easier for agents to hold in context,
   test in isolation, and validate. An agent working on the workspace engine
   doesn't need to understand the server or the app.

4. **Selective integration**: The main Wuhu repo pins specific versions of
   each dependency. A package can "boil" with experimental changes without
   affecting downstream consumers until explicitly integrated.

5. **Experimentation**: Mini apps can be spun up from a subset of packages
   (e.g., PiAI + chat UI) to try ideas without booting the full system.

## Versioning

All packages use semantic versioning with a 0.x convention: during major
version 0, any minor bump may introduce breaking changes. This allows rapid
iteration while still providing pinnable version tags.

Packages graduate to 1.0 when their contracts stabilize.

## Repository Layout

### wuhu-pi-ai

**LLM client library.** Zero Wuhu-specific knowledge.

- Providers: OpenAI (Chat + Responses), Anthropic Messages, future providers
- Streaming support, tool call parsing, retry policies
- Request/response types, model catalogs
- **Dependencies**: None (Foundation only)
- **First to extract** — already self-contained in the current codebase

### wuhu-workspace

**Workspace engine + contracts.**

Contains two library products from a single repo:
- `WorkspaceContracts` — Thin, stable types and protocols
- `WorkspaceEngine` — Implementation (markdown parser, YAML frontmatter
  indexer, implicit rules engine, query executor, database views)

Consumers import only the product they need. The UI package imports
`WorkspaceContracts` and mocks the engine. The server imports both.

- **Dependencies**: None (Foundation only)
- Query language TBD (SQL-like, Datalog, or custom DSL)
- `wuhu.yml` rules engine for implicit metadata

### wuhu-core

**Agent runtime, session model, contracts.**

The heart of Wuhu:
- `AgentLoop` + `AgentBehavior` protocol
- Session model: append-only transcript, three-lane queues (system, steer,
  follow-up), compaction
- Subscription system: state + patch, gap-free reconnection, streaming deltas
- Session identity, settings, status
- Contracts for commanding and subscribing

- **Dependencies**: `wuhu-pi-ai`

### wuhu (main repo)

**Server, runner, CLI, integration.**

Wires everything together:
- HTTP server (Hummingbird/Vapor)
- Runner protocol (WebSocket, language-agnostic)
- QuickJS sandbox for agent tool execution
- CLI (`wuhu server`, `wuhu client`, `wuhu runner`)
- Environment management, skills, tool execution
- SQLite persistence (GRDB)

- **Dependencies**: `wuhu-pi-ai`, `wuhu-core`, `wuhu-workspace`

### wuhu-app

**Native apps: macOS, iOS, visionOS.**

Ultra-modularized with TCA (ComposableArchitecture):
- Each feature is its own module
- UI packages depend on contracts, not engines
- Previews work with fake data, no server needed
- Potentially explore Tuist for build management

Sub-packages (internal modules or separate products):
- `wuhu-workspace-ui` — Kanban, database views, doc viewer
- `wuhu-chat-ui` — Channel chat, session thread, streaming
- `wuhu-session-ui` — Session list, detail, model picker

- **Dependencies**: `WorkspaceContracts` (from wuhu-workspace),
  session/API contracts (from wuhu-core or a shared API types package)

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

### Folder Template Workspace

A folder template for agent development:

```
wuhu-dev/
  AGENTS.md            # Work patterns, quick intro to each repo
  pi-ai/               # clone of wuhu-pi-ai
  workspace/            # clone of wuhu-workspace
  core/                 # clone of wuhu-core
  wuhu/                 # clone of wuhu (main)
  app/                  # clone of wuhu-app
```

No `.build` folders in the template (fast copy). Each task gets a fresh copy
via Wuhu's folder-template environment feature.

Cross-package dependencies use `path: "../pi-ai"` during development, git
URLs + version pins in releases.

### CI

Each repo has its own CI. GitHub Actions with branch protection rules
(programmatically configured via GitHub API).

### Agent Ergonomics

Small packages = small context = agents can hold the whole thing in their
head. An agent working on the workspace query engine only needs to understand
that one repo. It runs tests locally, validates, ships a PR. No knowledge of
the server, the app, or the agent runtime required.

## Extraction Order

1. **wuhu-pi-ai** — Already self-contained. Extract first.
2. **wuhu-workspace** — New code, can start fresh in its own repo.
3. **wuhu-core** — Requires careful extraction from current WuhuCore.
4. **wuhu** (main) — Becomes the integration point.
5. **wuhu-app** — Already somewhat separate (WuhuMVPApp has its own project).

## Build Times and Caching

SPM resolves all transitive dependencies at the top level — no npm-style
duplication. `.build` contains compiled artifacts, not source copies.

For folder templates: nuke `.build` from template, accept cold build on first
use. Agents don't get bored waiting for `swift build`. LLM calls cost 100x
more than compute. Optimize for token efficiency, not build times.

A startup script can run `swift package resolve` to pre-fetch dependencies
if cold builds become a real bottleneck.
