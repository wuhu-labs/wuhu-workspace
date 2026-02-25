---
title: "QuickJS Tool Sandbox"
kind: architecture
status: draft
---

# QuickJS Tool Sandbox

## Concept

Embed QuickJS in the Wuhu server to provide a JavaScript sandbox as an agent
tool. All Wuhu APIs and MCP tools are exposed as JavaScript functions/classes
in the sandbox.

## Motivation

Agents often need to perform multi-step operations: query issues, filter
results, create a session based on the findings, post a summary to a channel.
With traditional tool calling, each step is a separate round trip:

1. Agent calls `workspace_query` → waits for result
2. Agent processes result, calls `session_create` → waits
3. Agent calls `channel_post` → waits

Each round trip costs LLM tokens (the result goes back into context) and
latency. With a JS sandbox, the agent writes a single snippet:

```javascript
const issues = workspace.query({ kind: 'issue', status: 'open' });
const urgent = issues.filter(i => i.priority === 'critical');
const session = sessions.create({
  env: 'frontend',
  title: 'Fix ' + urgent[0].title
});
session.send(urgent[0].markdownContent);
channels.post('engineering', `Started working on ${urgent[0].title}`);
```

One tool call, multiple operations, no intermediate round trips.

## Design

### Single Tool

The agent sees one tool in its schema:

```
wuhu(code: string) -> string
```

The `code` parameter is a JavaScript snippet. The return value is the
stringified result (or error).

### API Surface

Wuhu injects global objects into the QuickJS context:

- `workspace.query(filter)` — Query workspace docs
- `workspace.read(path)` — Read a doc
- `workspace.write(path, content)` — Write a doc
- `sessions.list(filter)` — List sessions
- `sessions.create(options)` — Create a session
- `sessions.get(id)` — Get session details
- `sessions.send(id, message)` — Send a message to a session
- `channels.post(channel, message)` — Post to a channel
- `channels.read(channel, options)` — Read channel history

### MCP Integration

MCP tools are discovered at runtime and injected as additional functions:

```javascript
// An MCP server for GitHub, auto-discovered
github.createPR({ title: '...', body: '...' });
github.listIssues({ state: 'open' });
```

No schema changes, no prompt updates. New MCP tools appear as new functions.

### Discoverability

- `wuhu('help')` — Lists all available functions
- System prompt or skills include basic usage examples
- Agents learn the API like any other CLI/SDK

### Sandboxing

QuickJS is:
- Embedded (no external process)
- Sandboxed (no filesystem or network access except through injected APIs)
- Fast startup (~1ms to create a context)
- Small memory footprint

Each tool call gets a fresh context. No state leaks between calls.

### Not the Only Way

The JS sandbox is an additional tool, not a replacement. Simple operations
still use dedicated tools (`bash`, `read`, `write`). The sandbox is for
orchestration and multi-step workflows where round-trip reduction matters.

## Implementation Notes

- QuickJS has a C API; Swift can call it via C interop or a thin wrapper
- Async operations (session.send that triggers inference) need careful
  handling — either synchronous from the JS side (blocking the sandbox
  until complete) or return a handle for later polling
- Timeout enforcement: kill the QuickJS context if a snippet runs too long
- Output size limits: truncate large return values
