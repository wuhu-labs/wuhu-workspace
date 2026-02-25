---
title: "Project: Native Apps (macOS, iOS, visionOS)"
kind: project
status: planned
priority: high
---

# Project: Native Apps

## Goal

Evolve the current WuhuMVPApp into a polished, multi-platform native app
supporting macOS, iOS, and visionOS.

## Current State

WuhuMVPApp is a functional macOS app built with TCA + SwiftUI. It supports:
- Session list + detail with real-time SSE streaming
- Channel chat with streaming deltas
- Issues kanban board (from workspace markdown files)
- Docs viewer
- Model picker, session rename, steer/follow-up lane selection
- Settings (server URL, username)

## Direction

### Ultra-Modularization (Point-Free Style)

Each feature becomes its own Swift module:
- `SessionFeature` — session list, detail, streaming, model picker
- `ChannelFeature` — channel chat, message routing
- `WorkspaceUI` — kanban, database views, doc viewer
- `ChatUI` — shared chat components (input field, message bubbles, markdown)
- `ObservabilityUI` — cost dashboards, activity metrics

Benefits:
- Fast incremental builds (only recompile changed modules)
- Each module is independently previewable with mock data
- Agents can work on one module without understanding others
- Tests run in isolation per module

### iOS

The session and channel UIs should adapt to phone form factor. Navigation
becomes tab-based or stack-based. The core TCA reducers are shared — only
the views differ.

### visionOS

Spatial computing opens interesting possibilities:
- Session threads as floating windows
- Kanban board in 3D space
- Channel conversations as ambient presence

This is exploratory but the TCA architecture makes it low-risk — add
visionOS-specific views, reuse all the reducers and state management.

### Workspace UI

High-performance kanban board is a priority. Database views render as
interactive tables, kanban boards, or custom layouts depending on view
configuration.

Canvas format (collaborative editing) is a stretch goal.

## Phased Approach

### Phase 1: Polish macOS

- Stop session control (WUHU-0031)
- Auto-naming improvements
- Better message rendering (collapse tool calls, verbosity levels)
- Keyboard shortcuts
- Session filtering and search

### Phase 2: Modularize

- Extract features into separate modules within the app package
- Set up SwiftUI previews with mock data for each module
- Explore Tuist for build management

### Phase 3: iOS

- Adaptive layouts for phone/tablet
- Shared reducers, platform-specific views
- Push notifications for session completion / channel messages

### Phase 4: visionOS

- Spatial layouts
- Multi-window session management
- Ambient channel presence

## Build System

Currently using XcodeGen (`project.yml` → `.xcodeproj`). May explore:
- **Tuist**: Better for ultra-modularized projects, handles module
  graphs, caching, and generation
- **Pure SPM**: If Xcode's SPM support improves enough to drop .xcodeproj
