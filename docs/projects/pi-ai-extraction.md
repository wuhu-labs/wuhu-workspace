---
title: "Project: PiAI Extraction"
kind: project
status: planned
priority: high
---

# Project: PiAI Extraction

## Goal

Extract `PiAI` from the Wuhu monorepo into its own repository (`wuhu-pi-ai`)
as the first step in the multi-repo strategy.

## Why First

- Already self-contained: zero Wuhu-specific logic
- No dependencies beyond Foundation
- Clean API surface (providers, request/response types, streaming)
- Useful standalone for anyone building LLM-powered Swift apps
- Validates the extraction workflow for subsequent packages

## Scope

### What Moves

- `Sources/PiAI/` — All provider implementations, types, streaming
- Model catalogs (currently in WuhuCore as `WuhuModelCatalog` — needs
  to be split: generic model specs → PiAI, Wuhu-specific catalog → core)
- Associated tests

### What Stays

- `WuhuLLMRetryPolicy` — Wuhu-specific retry logic, stays in core
- `WuhuLLMRequestLogger` — Wuhu-specific logging, stays in core
- `WuhuModelCatalog` Wuhu-specific model lists and aliases — stays in core,
  but uses PiAI's base types

## Deliverables

- [ ] `wuhu-pi-ai` repo with `Package.swift`, sources, tests
- [ ] CI (GitHub Actions: `swift test` on macOS + Linux)
- [ ] Branch protection rules configured
- [ ] Main Wuhu repo updated to depend on `wuhu-pi-ai` via git URL + version
- [ ] All existing tests pass in both repos
- [ ] README with usage examples

## Milestones

1. Create repo, move sources, get `swift test` passing
2. Set up CI and branch protection
3. Update main Wuhu repo dependency
4. Verify end-to-end (server still works with extracted PiAI)
5. Tag v0.1.0
