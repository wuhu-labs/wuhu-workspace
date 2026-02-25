---
title: "Project: Agent Experimentation Lab"
kind: project
status: planned
priority: medium
---

# Project: Agent Experimentation Lab

## Goal

Create a framework for rapidly prototyping and validating novel agent designs,
then capturing successful experiments as reproducible tests.

## Why

Ideas like the multi-channel bot, natural assistant, and custom context
management need to be validated interactively before becoming features. The
current setup requires booting the full Wuhu server. We need a lightweight
experimentation path.

## Approach

### Mini Apps

Small Swift apps (~200 lines) that wire together:
- `wuhu-pi-ai` for LLM calls
- A chat UI component for interaction
- A custom system prompt and tool schema
- Optional: custom message injection (simulating steer)

These are throwaway apps for trying ideas. No persistence, no server.

### Experiment Workflow

1. Human creates a mini app with a hypothesis
2. Human interacts with it, tweaks prompts and tool schemas
3. When something works, capture the transcript + config
4. Agent turns the capture into a reproducible test fixture
5. Test uses an LLM judge to verify expected behavior
6. Test runs in CI

### LLM Judge

An LLM call that evaluates agent output against criteria:
- Input: criteria (natural language) + agent output (transcript)
- Output: pass/fail per criterion + explanation
- For CI: multiple judge runs, require majority pass
- Fall back to deterministic checks where possible

### Experiments to Validate

1. **Multi-channel bot**: Agent handles interleaved messages from multiple
   users, routes responses correctly via tool calls
2. **Natural assistant**: Long-lived agent that manages its own context,
   posts proactively, uses steer for real-time feel
3. **Context management strategies**: Manual context pruning, summary
   injection, tiered memory (recent verbatim, older summarized, oldest
   in files)
4. **Tool schema optimization**: Minimal vs verbose tool descriptions,
   impact on tool-use accuracy across models

## Deliverables

- [ ] Template mini app (PiAI + SwiftUI chat view)
- [ ] Fixture format for captured experiments
- [ ] LLM judge implementation
- [ ] Example experiment: multi-channel bot
- [ ] CI integration for experiment-derived tests
