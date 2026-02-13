# Wuhu Workspace

Issue tracking and project management for [wuhu-labs/wuhu](https://github.com/wuhu-labs/wuhu).

## Issues

| ID | Title | Status | Depends On |
|----|-------|--------|------------|
| [002](issues/002-model-provider-switcher.md) | Model/Provider Switcher | Open | — |
| [001](issues/001-llm-retry-backoff.md) | LLM Retry with Backoff | Open | 002 |

## Dependency Graph

```
002 Model/Provider Switcher
 └──► 001 LLM Retry with Backoff
```

## Static Site

Build the static site from `issues/*.md`:

```bash
npm run build
```

Output is written to `dist/`:

- `dist/index.html` - issue list + dependency graph
- `dist/issues/*.html` - individual issue pages
- `dist/styles.css` - shared responsive dark theme
