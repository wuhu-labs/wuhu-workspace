---
title: "Agent Experimentation Framework"
kind: architecture
status: draft
---

# Agent Experimentation Framework

## Problem

We need to validate novel agent designs — multi-channel bots, natural
assistants, custom context management — before committing them to the main
product. Currently, trying a new idea requires booting the full Wuhu server.

## Solution

The ultra-modularized architecture enables rapid experimentation:

1. **Mini apps**: Wire together a subset of packages (PiAI + chat UI +
   custom system prompt) in a ~200-line Swift app
2. **Interactive experimentation**: Human plays with the setup, tries
   different prompts, message formats, tool schemas
3. **Capture**: Save the transcript + system prompt + expected behavior
4. **Reproduce**: An agent turns the experiment into a reproducible test
   with an LLM judge
5. **Regress**: The test runs in CI, catches regressions

## Example: Multi-Channel Bot

### Hypothesis

A single agent session can handle interleaved messages from multiple users,
delivered via the steer mechanism, and route responses to the correct
recipients via tool calls.

### Setup

- PiAI (Anthropic provider)
- Custom system prompt explaining the multi-channel concept
- `send_message(target, content)` tool
- Messages from different users injected as steer notifications

### Experiment Flow

1. Create a mini app with the above setup
2. Send interleaved messages as different users
3. Observe: Does the model route responses correctly?
4. Tweak the system prompt until behavior is reliable
5. Capture a working transcript as a test fixture

### Test

```swift
func testMultiChannelRouting() async throws {
    let transcript = loadFixture("multi-channel-basic")
    let result = try await replayTranscript(transcript, model: .claude4Sonnet)

    // LLM judge evaluates the agent's responses
    let judge = LLMJudge(criteria: [
        "Agent responded to Minsheng's message about PRs",
        "Agent responded to Yihan's message about milestones",
        "Responses were routed to the correct recipients",
        "Agent did not confuse the two conversations",
    ])
    let verdict = try await judge.evaluate(result)
    XCTAssert(verdict.allPassed)
}
```

## Task Reproduction

Beyond experimentation, the framework supports **task reproduction** for
model evaluation:

- Save a complete session (system prompt + transcript + tools + model)
- Replay on a different model: "Can DeepSeek 4 solve this task that
  Claude Opus solved?"
- Compare cost, quality, speed
- Detect model regressions: "Did the latest Anthropic update break
  our agent's tool-use behavior?"

### Reproduction Storage

Each reproduction is a fixture containing:
- System prompt (with AGENTS.md context)
- Tool schema
- Input messages (what the user/system sent)
- Expected behavior criteria (for the LLM judge)
- Original model + original output (for comparison)

## LLM Judge

The judge is itself an LLM call (can be a different, cheaper model) that
evaluates whether an agent's output meets specified criteria. The judge
receives:

- The criteria (natural language descriptions of expected behavior)
- The agent's actual output (transcript of actions/messages)
- Returns: pass/fail per criterion + explanation

This is not deterministic — LLM judges have variance. For CI, we can:
- Run the judge multiple times and require majority pass
- Use stricter criteria for critical behaviors
- Fall back to deterministic checks where possible (e.g., "did the agent
  call send_message with target=Minsheng" is a string match)

## Integration with Observability

Experiments and reproductions feed into the observability system:
- Cost per experiment run
- Success rate across models
- Regression trends over time
- "This prompt works 95% of the time on Claude, 60% on GPT-5"
