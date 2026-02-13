# Wuhu Workspace

Issue tracking and project management for [wuhu-labs/wuhu](https://github.com/wuhu-labs/wuhu).

## Issues

| ID | Title | Status | Depends On |
|----|-------|--------|------------|
| [WUHU-0002](issues/0002-model-provider-switcher.md) | Model/Provider Switcher | Open | — |
| [WUHU-0001](issues/0001-llm-retry-backoff.md) | LLM Retry with Backoff | Open | WUHU-0002 |

## Dependency Graph

```
WUHU-0002 Model/Provider Switcher
 └──► WUHU-0001 LLM Retry with Backoff
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
