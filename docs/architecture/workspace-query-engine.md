---
title: "Workspace Query Engine"
kind: architecture
status: draft
---

# Workspace Query Engine

## Overview

The workspace query engine indexes markdown files with YAML frontmatter and
supports live queries — database views embedded in docs, like Notion's
database views but backed by plain files on disk.

## Data Model

Every document is a markdown file. Metadata comes from two sources:

### 1. YAML Frontmatter

```yaml
---
title: "Fix authentication bug"
status: open
priority: high
assignee: minsheng
tags: [auth, security]
---
```

### 2. Implicit Rules (`wuhu.yml`)

A `wuhu.yml` (or `.json`) at the workspace root defines rules that inject
metadata based on file path:

```yaml
rules:
  - path: "issues/**"
    metadata:
      kind: issue
  - path: "docs/architecture/**"
    metadata:
      kind: architecture-doc
  - path: "docs/vision/**"
    metadata:
      kind: vision-doc
```

This eliminates the need to add `kind: issue` to every issue file.

### 3. System Attributes

Automatically available for every document:
- `_path` — relative file path
- `_filename` — file name without extension
- `_ctime` — creation time (from git or filesystem)
- `_mtime` — modification time (from git or filesystem)

## Database Views

A special markdown block defines a live query:

~~~markdown
```database-view
id: open-issues
name: Open Issues
---
SELECT * FROM documents
WHERE kind = 'issue' AND status = 'open'
ORDER BY priority DESC
```
~~~

### View Properties

- `id` — Unique identifier within the workspace. Agents can reference this
  to materialize the view via `wuhu workspace query --view open-issues`
- `name` — Human-readable display name
- The body after `---` is the query

### Query Language

TBD. Candidates:
- **SQL-like DSL**: Familiar, expressive, easy to parse
- **Datalog**: Better for recursive queries (e.g., "all docs linked from X")
- **Custom filter syntax**: Simpler, less powerful, faster to implement

For v1, a SQL-like subset is probably sufficient:
- `SELECT` (fields or `*`)
- `FROM documents`
- `WHERE` (field comparisons, `AND`/`OR`, `IN`, `LIKE`)
- `ORDER BY`
- `LIMIT`

### Rendering

In the app, database views render as interactive tables or kanban boards
depending on configuration. The query engine returns structured data; the
UI decides presentation.

## Indexing

The engine maintains an in-memory index of all documents and their metadata.
The index is rebuilt on startup and updated incrementally via filesystem
watching.

For git-managed workspaces: `git log` provides accurate `_ctime`/`_mtime`.
For non-git workspaces: fall back to filesystem timestamps.

## API (Protocol)

```swift
protocol WorkspaceQuerying {
    func listDocuments(filter: DocumentFilter?) async throws -> [DocumentSummary]
    func readDocument(path: String) async throws -> Document
    func executeQuery(query: String) async throws -> QueryResult
    func materializeView(id: String) async throws -> QueryResult
}
```

Implementations:
- `WorkspaceEngine` — Local, reads from filesystem
- `WorkspaceClient` — Remote, talks to server over HTTP
- `MockWorkspaceEngine` — In-memory, for tests and UI previews

## Contracts Package

`WorkspaceContracts` exports:
- `DocumentSummary`, `Document`, `DocumentFilter`
- `QueryResult`, `ViewDefinition`
- `WorkspaceQuerying` protocol
- Frontmatter parsing types

The contracts package has zero dependencies. The engine imports it and
adds the implementation. UI packages import only the contracts.

## Agent Integration

Agents interact with the workspace through:
1. **File tools** (`read`, `write`) — Direct markdown editing
2. **`wuhu` tool** — `wuhu("workspace.query({ kind: 'issue', status: 'open' })")`
3. **CLI** — `wuhu workspace query --view open-issues`

All three paths go through the same `WorkspaceQuerying` protocol.
