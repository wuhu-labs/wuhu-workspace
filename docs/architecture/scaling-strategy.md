---
title: "Scaling Strategy"
kind: architecture
status: draft
---

# Scaling Strategy

## Philosophy

Stay monolithic as long as possible. SQLite + Swift actors on a single box.
No distributed systems until we absolutely need them.

The cloud-native alternative is untenable for coding agents: reading the full
transcript from a database on every tool result, reconstructing the prompt,
calling the LLM, discarding state. That's O(n) per loop iteration for a
session with n entries. The stateful actor model is O(1) — the transcript
lives in memory, appends are cheap, the database is for durability.

## SQLite Scaling Path

### Stage 1: Single File (Now)

- `DatabasePool` with WAL mode (concurrent reads, single writer)
- Single writer can sustain ~1000 writes/second
- Adequate for dozens of concurrent active sessions

### Stage 2: Sharded Files

- Sessions are independent — zero cross-session transactions needed
- Shard by session ID hash into N SQLite files (8, 16, 128)
- Each shard has its own write lock — N× write throughput
- Trivial to implement: route `sessionID → shard_index → db_file`
- Workspace engine uses a separate SQLite file (read-heavy, different
  access pattern)

### Stage 3: Read Replicas

- WAL streaming from primary to standby nodes
- Standbys serve read queries (session list, workspace queries, analytics)
- Primary handles all writes
- Two standbys for HA

### Stage 4: Distributed (Future)

- Shard placement across multiple nodes
- Raft consensus for primary election per shard group
- Swift distributed actors for cross-node session access
- Automatic rebalancing

This enters FoundationDB territory. Unlikely to be needed soon, but the
architecture doesn't preclude it.

### Wild Card: Turso / libSQL

Turso is rewriting SQLite in Rust with built-in replication and multi-writer
support. If they deliver, it could replace stages 2-4 with a drop-in library
swap. Worth monitoring but not depending on.

## Runner Scaling

Runners are stateless and horizontally scalable. The server is the brain
(LLM inference, session state, decision-making). Runners are the hands
(bash, file operations).

### Runner Protocol

Language-agnostic WebSocket protocol. Current implementation is in Swift,
but the protocol is simple enough to implement in any language:

- JSON messages with correlation IDs
- `sessionID` + `toolCallId` for multiplexing
- One WebSocket per runner, many sessions multiplexed

### Deployment Options

- **Self-hosted**: Runner on a VPS, connects to server
- **Cloudflare Workers**: TypeScript runner, edge-deployed
- **AWS Lambda**: Python/TS runner, on-demand
- **e2b**: Sandboxed environments for untrusted execution

### Multi-Runner Agents

One agent session can dispatch tool calls to multiple runners:
- "Read the frontend repo" → Runner A
- "Run backend tests" → Runner B
- "Deploy to staging" → Runner C

The agent doesn't know or care which machine executes its tool calls.
The server routes based on environment → runner bindings.

## Memory Considerations

Each active session holds its transcript in memory via the
`WuhuSessionRuntime` actor. For 1000 active sessions:

- Typical transcript: 100-500 entries, ~50-250KB per session
- 1000 sessions × 250KB = ~250MB — manageable
- Compacted transcripts are smaller (summaries replace verbose entries
  in the LLM context, but original entries are still in memory for
  subscription backfill)

Eviction policy (future): inactive sessions can be evicted from memory.
On next access, reload from SQLite. The agent loop's persist-first design
means this is safe — no state is lost.

## LLM Concurrency

The real bottleneck for high session counts is API rate limits, not
local compute:

- Anthropic: ~50 concurrent requests at typical tier
- OpenAI: higher limits but still bounded

Wuhu should implement request queuing with priority:
- Steer-triggered inference (user is waiting) → high priority
- Follow-up inference (background work) → normal priority
- Compaction (maintenance) → low priority

This prevents 50 background sessions from starving a user who's
actively steering a session.
