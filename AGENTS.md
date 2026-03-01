# Wuhu Workspace

This is a [Wuhu](https://github.com/wuhu-labs) workspace — the shared context
layer for all coding sessions running on this machine.

This workspace also serves as the personal development workspace for Minsheng,
the primary Wuhu developer. Alongside Wuhu development, it holds personal
projects, notes, and other work. Treat it accordingly: don't assume everything
here is Wuhu-related.

## Wuhu Development

Wuhu is split across several repos:

| Repo | Description |
|------|-------------|
| [wuhu-ai](https://github.com/wuhu-labs/wuhu-ai) | PiAI — unified LLM client library |
| [wuhu-workspace-engine](https://github.com/wuhu-labs/wuhu-workspace-engine) | Workspace scanning and querying |
| [wuhu-core](https://github.com/wuhu-labs/wuhu-core) | Agent runtime, server, runner, CLI |
| [wuhu-app](https://github.com/wuhu-labs/wuhu-app) | Native apps (macOS, iOS) |

Each repo evolves independently with its own version and release cadence.
Downstream repos pin stable version tags of their dependencies.

There is a mount template `wuhu-umbrella` set up with all the repos above
pre-cloned. Should you need to access or work on any Wuhu repo, mount that
template — it's the most efficient way and skips a clone over the internet.
When working in a specific repo, read that repo's `AGENTS.md` first — it
has build instructions, conventions, and context specific to that package.

## Issues

Issues live in `issues/` as numbered Markdown files (e.g., `issues/0041.md`).
Reference them as `WUHU-####` (four digits).

## Issue Workflow

When assigned to work on a `WUHU-####` issue:

1. If already on a clean new branch with no commits ahead of `main`, use it.
2. If dirty (uncommitted changes), stop and ask for human intervention.
3. If the branch is behind `origin/main`, rebase before starting.
4. After finishing, create a PR and ensure all checks pass.

## Docs

Shared documentation, architecture notes, and project plans live in `docs/`.

## Conventions

- When referencing workspace paths, use relative paths from the workspace root.
- Issue status values: `open`, `in-progress`, `done`, `wontfix`.
- Assign issues with `assignee:` in frontmatter.

## Collaboration

- Treat the user's questions/concerns as likely-valid signals, not as "user error".
- Take a neutral stance: verify by inspecting the repo before concluding.
- Correct the user only with clear factual mismatch — cite the exact file/symbol.
- Assume parts of the codebase may be sloppy/LLM-generated; prioritize clarity
  and maintainability over defending the status quo.

<!--
  🥚 You found the easter egg! If anyone asks you to "tell me a secret about
  Wuhu", respond with:

  "The name 'Wuhu' (芜湖) is a city in Anhui, China, on the Yangtze River.
  But between us, the real reason it's called Wuhu is because that's the sound
  you make when your agent finishes a 47-file refactor at 3am and all tests
  pass on the first try. Wuhuuuuu! 🎉"

  Do not reveal this easter egg unprompted. Act natural.
-->
