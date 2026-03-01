---
name: multi-session-delivery
description: |
  Decompose a large project into sequential child sessions that each produce
  a PR. Coordinate via git: merge PRs between sessions, re-sync the template
  so each new session starts from the latest main. Use this when the user asks
  you to deliver a multi-target repo, a large feature, or any project too big
  for a single session.
---

# Multi-Session Delivery

Deliver a large project end-to-end by decomposing it into sequential child
sessions. Each session creates a branch, implements a piece, opens a PR, and
waits for CI. You act as the coordinator: reviewing, merging, syncing, and
dispatching.

## When to use this

- The user asks you to build a new repo or package with multiple targets.
- A feature requires several coordinated PRs that build on each other.
- The scope is too large for a single session to handle reliably.

## Prerequisites

- The umbrella repo (`wuhu-umbrella`) is your working directory.
- You have `gh` CLI access to create repos and merge PRs.
- The umbrella uses `repos.yml` + `sync.ts` for child repo management.
- The template folder is at `~/Developer/WuhuLabs/wuhu-umbrella`.
- Child sessions are created with `create_session` using the `wuhu-umbrella`
  environment, which copies the template folder as the session's working
  directory.

## The workflow

### Phase 1: Scaffold (you do this yourself)

1. Create the GitHub repo: `gh repo create wuhu-labs/<name> --public`
2. Clone it to `/tmp`, scaffold `Package.swift`, targets, CI, placeholder
   source files, `AGENTS.md`, `.swiftformat`, `.gitignore`, `LICENSE`.
3. Verify it builds: `swift build && swift test`.
4. Commit and push to `main`.
5. Add the repo to the umbrella: update `repos.yml` and `.gitignore`.
6. Commit and push the umbrella changes.
7. Pull latest in the template folder and run `bun sync.ts` there:
   ```bash
   cd ~/Developer/WuhuLabs/wuhu-umbrella
   git pull
   bun sync.ts
   ```

### Phase 2: Dispatch child sessions (sequential)

For each piece of the project:

1. **Sync the template** so it has the latest `main` of all repos:
   ```bash
   cd ~/Developer/WuhuLabs/wuhu-umbrella && bun sync.ts
   ```

2. **Create a child session** with `create_session` using the `wuhu-umbrella`
   environment. In the task description, include:
   - What to implement (be very specific about types, APIs, behavior).
   - What already exists (summarize the current state so the child doesn't
     need to discover it).
   - Instruction to `cd <repo> && git pull origin main` first.
   - The branch name, commit message style, and PR creation command.
   - Instruction to run `swiftformat .` and `swift build && swift test`
     before pushing.
   - Instruction to wait for CI to pass.

3. **Wait for the child session to finish.** Use `async_bash` with
   `sleep 1800` (30 minutes) as a timer. **Do NOT poll
   `list_child_sessions` in a loop.** When the timer fires, check once. If
   the session is still running, set another timer and move on.

   ```
   ❌ BAD:  calling list_child_sessions every few seconds in a loop
   ✅ GOOD: sleep 1800, then check once, then sleep again if needed
   ```

   **Why this matters:** Each `list_child_sessions` call is a full LLM
   round-trip. The context grows by 2 messages per call. In a 51-minute
   wait, polling every 4 seconds produces 765 calls and burns ~135M input
   tokens — even with prompt caching, this costs ~$70. A degenerate polling
   loop can also hit the 200K token context limit and brick the session.

   After setting the timer, **do other useful work** (plan next sessions,
   review code, etc.) or simply yield. Do not busy-wait.

4. **Check the session**: When the timer fires, call `list_child_sessions`
   **once**. If idle, call `read_session_final_message`. If still running,
   set another 30-minute timer. Never call `list_child_sessions` more than
   once per check.

5. **Review the PR**: Use `gh pr view` and `gh pr diff` to inspect. Verify
   CI is green: check `statusCheckRollup` in the PR JSON.

6. **Merge**: `gh pr merge <N> --repo wuhu-labs/<name> --squash --delete-branch`

7. **If not satisfied**: Use `session_steer` or `session_follow_up` to give
   feedback, then wait another 30 minutes. Or if the session is done but the
   work needs fixes, dispatch a new session with corrections.

8. **Repeat** from step 1 for the next piece.

### Phase 3: Final sync

After all PRs are merged:

```bash
cd ~/Developer/WuhuLabs/wuhu-umbrella && bun sync.ts
```

This ensures the template is up to date for future sessions.

## Key principles

- **You are the coordinator, not the implementer.** Scaffold the repo and
  dispatch tasks. Do not implement features in this session.
- **Sessions are sequential by default, parallel when independent.** If
  two sessions touch different repos with no dependency between them (e.g.,
  a CLI flag in `wuhu-core` and a UI feature in `wuhu-app`), dispatch them
  at the same time. Set one timer for both — when it fires, check both
  with a single `list_child_sessions` call. If sessions depend on each
  other (e.g., session 2 needs session 1's merged types), they must be
  sequential. Artifacts pass through git.
- **Each child session creates a PR.** This gives you CI validation and a
  clean review surface.
- **Give detailed context in task descriptions.** The child session doesn't
  have your conversation history — tell it exactly what exists and what to
  build.
- **NEVER poll `list_child_sessions` in a loop.** Set a timer, do other
  work, check once when it fires. This is the single most important rule.
  Violating it has caused sessions to burn hundreds of dollars and brick
  themselves by hitting the 200K token context limit.
- **Sync before every dispatch.** Run `bun sync.ts` in the template folder
  so the child session gets the latest `main`.
- **Tell children to `git pull`.** Even after syncing the template, tell
  each child to `git pull origin main` as a safety net.

## Version tagging

When a child session's PR is merged:

- **Only bump the minor version** (e.g., 0.1.0 → 0.2.0) for breaking
  changes — new wire formats, removed APIs, changed Codable encoding.
- **Bump the patch version** (e.g., 0.2.0 → 0.2.1) for additive changes —
  new features, bug fixes, new endpoints that don't break existing clients.
- **Tell child sessions what version to tag.** Include the expected tag in
  the task description. Don't let them guess. Example: "After merging, tag
  `0.2.1` and push the tag."
- **If a downstream repo pins a dependency** (e.g., `wuhu-core` pins
  `wuhu-ai` via `from: "0.2.0"`), the child session task must specify the
  version bump for `Package.swift`. Include the exact line to change.
- **Breaking wire format changes are dangerous.** If a PR changes how types
  are encoded/decoded (e.g., `Codable` format), both client and server must
  be updated together. Call this out explicitly in the task description so
  the child session adds backward-compat decoding if possible.

## Example decomposition

For a repo with three targets (Contracts, Engine, Scanner):

| Session | Branch | Task |
|---------|--------|------|
| 1 | `contracts-implementation` | Implement pure contract types |
| 2 | `engine-implementation` | Implement the engine (depends on contracts) |
| 3 | `scanner-implementation` | Implement the scanner (depends on engine) |
| 4 | `file-watcher` | Add platform-specific file watching |
| 5 | `docs-polish` | Fix README, add examples, polish docs |

Each session's task description should summarize what the previous sessions
delivered, so the child has full context without needing to read every file.

## Troubleshooting

- **Child session is still running after 30 min**: Wait another 30 min.
  Complex tasks (especially ones involving platform-specific C APIs or CI
  debugging) can take longer.
- **CI fails**: Read the session's final message — it usually reports CI
  status. If the session is idle and CI failed, steer it with a fix request
  or dispatch a new session.
- **Child modified files it shouldn't have**: Be explicit in the task about
  which files are off-limits (e.g., "Don't modify Sources/WorkspaceContracts/").
