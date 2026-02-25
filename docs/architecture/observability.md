---
title: "Observability & Analytics"
kind: architecture
status: draft
---

# Observability & Analytics

## Overview

Wuhu captures everything: raw LLM requests/responses, tool executions, user
interactions, session outcomes. This data powers cost tracking, productivity
metrics, model evaluation, and debugging.

## Raw LLM Logging

Every LLM request and response is logged:
- Full request body (system prompt, messages, tools, options)
- Full response body (content, tool calls, usage, stop reason)
- Timestamps, latency, model, provider
- Session ID and entry ID for correlation

This is the most valuable debugging tool. "Why did the agent produce empty
tool arguments?" → look at the raw Anthropic response → `stop_reason: max_tokens`,
the request had `max_tokens: 1024`. Bug found in seconds.

Currently implemented via `llm_request_log_dir` in server config. Should
evolve into structured storage (separate SQLite file or table) with query
APIs.

## Cost Tracking

### Per-Request

Each LLM response includes token usage (input, output, cached). Combined
with model pricing tables, we can compute cost per request.

### Per-Session

Sum of all request costs within a session. Stored as a session-level
aggregate, updated after each inference call.

### Per-Issue

If a session is linked to an issue (via metadata or workspace reference),
aggregate session costs to get cost-per-issue-resolved.

### Per-User

Aggregate costs by the user who created or prompted sessions. Answers:
"How much is each team member spending on AI?"

### Per-Model

Aggregate by model. Answers: "Is Claude Opus worth 5x the cost of Sonnet
for our workload?"

## User Activity & Productivity

### Activity Metrics

- Sessions created, messages sent, issues resolved per user per day/week
- Time-to-resolution for issues
- Steer frequency (how often does a user course-correct vs let the agent run?)
- Session length distribution

### Productivity Insights

- "Who on my team made the most progress using Wuhu?"
- "Who isn't productive? Is it a setup issue? A skill issue? Are they
  micro-managing the agent?"
- Steer-to-outcome ratio: users who steer frequently but get good outcomes
  are skilled directors. Users who steer frequently with poor outcomes may
  need better prompts or training.

### Not a Surveillance Tool

The goal is to improve the human-AI collaboration, not to monitor humans.
Metrics should be used to identify friction points and improve workflows,
not to rank or punish team members.

## Task Reproduction

### Save & Replay

Every session is a fully persisted record:
- System prompt (including AGENTS.md at the time)
- Complete transcript (messages, tool calls, tool results)
- Model and provider used
- Request options (maxTokens, temperature, etc.)

This enables:

### Model Comparison

"I solved this issue with Claude Opus in February. DeepSeek 4 just launched.
Can it solve the same issue? How much cheaper?"

Replay the task: inject the same user messages, let the new model run,
compare outcomes (via LLM judge or human review).

### Regression Detection

"Anthropic claims they didn't nerf Claude, but our agents feel dumber."

Replay a batch of historical tasks on the current model version. Compare
success rates, token usage, and cost. Statistical evidence, not vibes.

### Cost Optimization

"We're using Opus for everything. Which tasks could Sonnet handle?"

Replay tasks on cheaper models, identify the quality threshold. Route
simple tasks to Sonnet, complex tasks to Opus.

## Implementation Phases

### Phase 1: Structured LLM Logging (Near-term)

- Move from file-based logging to SQLite (or a dedicated log table)
- Index by session ID, model, timestamp
- API to query logs: `GET /v1/logs?sessionID=...&model=...`
- Basic cost computation (hardcoded pricing table)

### Phase 2: Aggregated Metrics

- Session-level cost aggregates
- User activity dashboards in the app
- Issue-level cost tracking (requires issue ↔ session linking)

### Phase 3: Task Reproduction Engine

- Fixture format for saved tasks
- Replay CLI: `wuhu replay --fixture task-001 --model deepseek-4`
- Comparison reports: cost, quality (LLM judge), latency

### Phase 4: Analytics Dashboard

- App UI for browsing metrics
- Trend charts (cost over time, productivity over time)
- Model comparison views
- Team-level aggregates
