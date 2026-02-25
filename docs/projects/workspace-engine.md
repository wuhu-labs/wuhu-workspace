---
title: "Project: Workspace Engine"
kind: project
status: planned
priority: high
---

# Project: Workspace Engine

## Goal

Build the workspace query engine as a new repository (`wuhu-workspace`).
This is greenfield — not an extraction from the current codebase, but a
new implementation based on the architecture doc.

## Why

- The current workspace support in Wuhu is minimal (list docs, read doc,
  parse frontmatter). It needs a proper query engine.
- Building it in its own repo lets agents iterate rapidly without
  affecting the main codebase.
- The contracts + engine pattern is validated here first, then applied
  to other domains.

## Scope

### Phase 1: Foundation

- Markdown file discovery and frontmatter parsing
- `WorkspaceContracts` library: types, protocols
- `WorkspaceEngine` library: local filesystem implementation
- Unit tests with fixture files

### Phase 2: Implicit Rules

- `wuhu.yml` parser
- Rule evaluation (path patterns → injected metadata)
- Tests for rule precedence and edge cases

### Phase 3: Query Engine

- Query language design (SQL-like subset for v1)
- Query parser
- Query executor against the indexed documents
- Database view definitions (parse from markdown blocks)

### Phase 4: Integration

- Wire into main Wuhu server (replace current ad-hoc workspace code)
- `WorkspaceClient` implementation (HTTP client conforming to protocol)
- CLI commands: `wuhu workspace query`, `wuhu workspace view`
- QuickJS bindings: `workspace.query(...)`, `workspace.read(...)`

## Deliverables

- [ ] `wuhu-workspace` repo with two products: `WorkspaceContracts`,
      `WorkspaceEngine`
- [ ] Comprehensive test suite with markdown fixtures
- [ ] CI on macOS + Linux
- [ ] Integration with main Wuhu repo at a pinned version
- [ ] Documentation (DocC or README)
