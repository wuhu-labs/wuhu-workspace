---
title: Model/Provider Switcher for Sessions
status: open
depends_on: []
---

## Summary

Add functionality to change a session's model and/or provider mid-conversation.

## Requirements

- API endpoint to switch model on an existing session
- Support changing both provider and model name
- Session should continue with new model on next prompt

## Context

This is needed for manual testing of the retry logic (WUHU-0001). The test flow requires:

1. Create a session
2. Have one turn of conversation
3. Switch to a non-existent model (e.g., `gpt-404`)
4. Trigger a prompt
5. Observe retry behavior in logs

## Implementation Notes

- Likely a `PATCH /v2/sessions/:id` or dedicated endpoint
- Update session record in SQLite
- Next prompt uses the new model

## Testing

- Unit tests for model switching
- Integration test: switch model, verify next prompt uses it
