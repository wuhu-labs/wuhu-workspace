---
title: "Project: Observability & Cost Tracking"
kind: project
status: planned
priority: medium
---

# Project: Observability & Cost Tracking

## Goal

Build comprehensive observability into Wuhu: raw LLM logging, cost tracking,
user activity metrics, and task reproduction.

## Phases

### Phase 1: Structured LLM Logging

- Move from file-based `llm_request_log_dir` to structured SQLite storage
- Index by session ID, model, provider, timestamp
- API endpoint: `GET /v1/logs?sessionID=...&model=...`
- CLI: `wuhu logs --session <id>`

### Phase 2: Cost Tracking

- Hardcoded pricing table per model per provider
- Per-request cost computed from token usage
- Per-session cost aggregate (updated after each inference)
- API: `GET /v1/sessions/:id/cost`
- CLI: `wuhu session cost <id>`

### Phase 3: User Activity

- Track: sessions created, messages sent, steers, follow-ups per user
- Time-to-idle per session
- Steer frequency analysis
- API: `GET /v1/users/:id/activity`
- App dashboard

### Phase 4: Task Reproduction

- Fixture format for saved sessions (system prompt + transcript + tools)
- Replay engine: re-run a task with a different model
- CLI: `wuhu replay --fixture <path> --model <model>`
- Comparison reports: cost, quality (LLM judge), latency
- Regression detection: batch-replay historical tasks, diff results

### Phase 5: Analytics Dashboard (App)

- Cost trends over time
- Per-user productivity views
- Model comparison charts
- Issue-level cost attribution
