---
title: LLM Call Retry with Exponential Backoff
status: open
depends_on:
  - 2
---

## Summary

Wrap LLM streaming calls in a retry loop with exponential backoff to handle transient failures gracefully.

## Requirements

- Retry loop with minimum 5 attempts
- Exponential backoff between retries (e.g., 1s, 2s, 4s, 8s, 16s)
- On retry, emit a UI notification entry (e.g., "Retrying due to network error...")
- **Critical:** Retry notification must NOT be included in LLM context
  - UI-only, not persisted to conversation history sent to model
  - User sees it, model doesn't

## Background

From the postmortem of session `2a5cbaaa-8268-460d-9a07-aa172a89991d`: the LLM stream failed after tool execution but before the assistant response was finalized. The error wasn't persisted, and the session just stopped. With retry logic, transient failures would be recoverable.

## Testing

### Unit Tests
- Verify retry count and backoff timing
- Verify UI entry is emitted on retry
- Verify UI entry is excluded from LLM context

### Manual Testing
1. Start a session with a valid model
2. Have one turn of conversation (baseline)
3. Switch model to a non-existent one (e.g., `gpt-404`) using WUHU-0002's functionality
4. Trigger a prompt
5. Observe:
   - Retry attempts in server logs
   - UI shows retry notifications
   - After max retries, graceful failure message

## Implementation Notes

- Likely in `OpenAIResponsesProvider.swift` or `AgentLoop.swift`
- Consider jitter to avoid thundering herd
- May need a new entry type for UI-only messages (not part of conversation context)
