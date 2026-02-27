---
title: "Orchestrator Session Workflow: Observations & Improvements"
kind: document
status: draft
priority: high
related: workspace-engine
---

# Orchestrator Session Workflow: Observations & Improvements

Notes from the first orchestrator session in Wuhu (delivering
`wuhu-workspace-engine` via 5 sequential child sessions). Combines raw
observations from the orchestrator with the human's corrections and ideas.

## What worked well

- **Git as the artifact transport.** Each child session creates a PR, the
  orchestrator reviews and merges, `bun sync.ts` propagates to the template.
  Clean, auditable, and CI validates every step.
- **Sequential decomposition.** Each session had a clear, bounded scope.
  Contracts → Engine → Scanner → FileWatcher → Docs. Dependencies flowed
  naturally.
- **30-minute check intervals.** Respected LLM costs and cache economics.
  Most sessions finished well within 30 minutes.
- **Detailed task descriptions.** Over-specifying what exists and what to
  build meant zero misunderstandings across 5 child sessions.

## Frictions & proposed improvements

### 1. Join primitive (highest priority)

**Problem:** The orchestrator polls with `list_child_sessions` on a fixed
timer. No way to know when a child finishes, or to observe progress. Some
tasks finish in 5 minutes but the orchestrator sleeps 30.

**Proposed:** A `join(sessionID)` tool that blocks until the child session
is idle. Should be interruptible by:
- Other async_bash completions
- System messages
- Steer messages from the human

This eliminates the artificial cadence and lets the orchestrator react
immediately.

### 2. Universal bash with env/path targeting

**Problem:** The orchestrator's bash tool is scoped to its own pwd. To work
in a child session's directory, you have to `cd` with absolute paths and
hope you guessed the session ID path correctly.

**Proposed (human idea):** Bash tool that accepts a machine + pwd descriptor.
Every session's tools can target any directory (or eventually any machine).
Security can be layered on later. This also opens the door to the
orchestrator running builds/tests in the child's directory directly.

### 3. Session instantiation before task start

**Problem:** `create_session` creates the environment copy and starts the
task atomically. The orchestrator can't pre-populate files or configure the
working directory before the child starts working.

**Proposed (human idea):** Split into two steps:
1. `instantiate_session(environmentID)` → creates the directory, returns
   session ID and path
2. The orchestrator can drop files, modify configs, etc.
3. `start_session(sessionID, task)` → begins execution

This eliminates the need to stuff everything into the task description
string. The orchestrator could write a design brief, seed fixture files,
or pre-configure `wuhu.yml` before the child starts.

### 4. Review sessions

**Problem:** The orchestrator reviewed PRs by reading `gh pr diff` output
inline. This works but is shallow — hard to catch subtle design
misalignments.

**Proposed (human idea):** Dispatch a dedicated review session on the same
repo. The reviewer reads the code, asks critical questions, flags
misalignment. This mirrors how a human tech lead would review: not just
"does it compile" but "does this match our design intent." Could even be
a skill: `code-review` with guidelines for what to look for.

### 5. Automatic template sync

**Problem:** Before every `create_session`, the orchestrator must manually:
1. Pull latest in the template folder
2. Run `bun sync.ts`
3. Create the session
4. Tell the child to `git pull` as a safety net

If any step is missed, the child starts with stale code.

**Proposed:** Either make `create_session` automatically sync, or provide
a `sync_environment(environmentID)` tool. The "tell the child to git pull"
instruction should be unnecessary if the environment is guaranteed fresh.

### 6. Context passing between sessions

**Problem:** Each task description re-summarized everything the previous
sessions built. By session 4 this was paragraphs of "here's what exists."

**Observations:**
- The human notes this "doesn't hurt" and may actually be a feature (explicit
  context is better than implicit assumptions).
- If instantiation is split from task start (#3 above), the orchestrator
  could drop a `DESIGN.md` or `CONTEXT.md` into the child's directory
  instead of stuffing everything into the task string.
- The child can always just read the code — over-specifying is a crutch but
  a safe one for now.

### 7. Error recovery

**Problem:** If a child produces bad work, options are: steer it (hoping it
can fix in-place), or dispatch a whole new session (cold start, re-download
deps, re-build). Both are expensive.

**Possible improvements:**
- `session_follow_up` with specific fix instructions + another 30-min wait.
- A "fix this PR" pattern: dispatch a new session whose task is "review and
  fix PR #N" rather than reimplementing from scratch.
- Warm session pools (pre-built `.build` directories in the template).

### 8. Environment concept reconsideration

**Human observation:** The rigid environment abstraction may not be necessary
for orchestrator patterns. The orchestrator could provision a working
directory (clone repos, set up toolchain) on its own. The main value of
environments today is:
- Pre-cloned sibling repos for reference
- Skills and AGENTS.md loading from the environment root

**Tension:** If skills/AGENTS.md are loaded from the environment root at
session creation time, decoupling provisioning from the environment concept
means finding another way to discover them. Options:
- Fetch skills from a URL or well-known git repo
- Let the orchestrator explicitly list skills in the task
- Skills as a separate, environment-independent concept

This needs more thought. The environment concept is simple and works today.

## Orchestrator's blind spots (self-correction)

- **Missed that child sessions share the same filesystem.** All sessions run
  on the same Mac. The orchestrator can directly `cd` into
  `/Users/minsheng/Developer/WuhuLabs/sessions/<id>/` to read files, run
  builds, or inspect state. No need to rely solely on `gh pr diff` or
  `read_session_final_message`.
- **Over-relied on final message summaries.** Could have inspected the
  child's working directory directly between dispatches to verify quality
  before merging.

## Skill improvements

The `multi-session-delivery` skill was written after the fact. For next
time:
- Write the skill *before* starting, so the orchestrator has it in context.
- Add a `code-review` skill for dispatching review sessions.
- Consider a `pr-fix` skill for targeted PR repair sessions.

## Open questions

- Should the orchestrator ever work in parallel (dispatch 2+ independent
  sessions simultaneously)? The current design is purely sequential. Parallel
  dispatch could speed things up but adds coordination complexity.
- How should the orchestrator handle flaky CI? Retry the same session? Manual
  intervention?
- What's the right granularity for decomposition? The 5-session split for
  `wuhu-workspace-engine` felt right, but larger projects might need
  different patterns (e.g., per-file sessions for migrations).
