---
title: "Contracts Philosophy"
kind: architecture
status: draft
---

# Contracts Philosophy

## Principle

Contracts are defined in **real programming languages** (Swift, TypeScript),
not in schema languages (OpenAPI, Protobuf). The transport layer is an
implementation detail.

## Why Not OpenAPI

OpenAPI is schema-first: you define the API in YAML/JSON, then generate
client and server code. This has drawbacks:

1. **Nobody enjoys it.** The YAML is verbose, the generated code is ugly,
   the tooling is fragile.
2. **It's a lowest-common-denominator format.** You lose Swift's type system
   (enums, associated values, protocols) and TypeScript's union types.
3. **It couples you to HTTP.** The schema describes HTTP endpoints, not
   domain operations. If you switch to WebSocket or gRPC, the schema is
   useless.
4. **It's hard to mock.** Generated clients typically make real HTTP calls.
   Mocking requires intercepting the network layer.

## The Wuhu Approach

### Define Contracts as Protocols

```swift
protocol WorkspaceQuerying: Sendable {
    func listDocuments(filter: DocumentFilter?) async throws -> [DocumentSummary]
    func readDocument(path: String) async throws -> Document
    func executeQuery(query: String) async throws -> QueryResult
}
```

### Implement Multiple Conformances

- **Engine**: Local implementation, direct function calls
- **Client**: Remote implementation, HTTP/WebSocket under the hood
- **Mock**: In-memory fake, for tests and UI previews

```swift
// In tests
let mock = MockWorkspaceEngine()
mock.documents = [testDoc1, testDoc2]
let results = try await mock.listDocuments(filter: nil)

// In the app
let client = WorkspaceHTTPClient(baseURL: serverURL)
let results = try await client.listDocuments(filter: nil)

// Both conform to WorkspaceQuerying — consumer doesn't know or care
```

### Test Transport with Round-Trip Tests

```swift
func testListDocumentsRoundTrip() async throws {
    // Start a real server with a real engine
    let server = TestServer(engine: realEngine)
    let client = WorkspaceHTTPClient(baseURL: server.url)

    // Client and engine should agree
    let clientResult = try await client.listDocuments(filter: nil)
    let engineResult = try await realEngine.listDocuments(filter: nil)
    XCTAssertEqual(clientResult, engineResult)
}
```

This verifies that the HTTP encoding/decoding is correct without polluting
the domain layer with transport concerns.

### Cross-Language Contracts

For TypeScript (future web app):

```typescript
interface WorkspaceQuerying {
    listDocuments(filter?: DocumentFilter): Promise<DocumentSummary[]>;
    readDocument(path: string): Promise<Document>;
    executeQuery(query: string): Promise<QueryResult>;
}
```

The types are duplicated but small and stable. The TS client is tested
against the same server endpoints as the Swift client.

If duplication becomes painful, codegen one from the other. But start with
manual duplication — it's simpler and the contracts change infrequently
once stable.

## Package Structure

For each domain, the contracts live in the same repo as the engine but as a
separate library product:

```
wuhu-workspace/
  Package.swift          # Two products: WorkspaceContracts, WorkspaceEngine
  Sources/
    WorkspaceContracts/  # Types + protocols only. Zero dependencies.
    WorkspaceEngine/     # Implementation. Depends on WorkspaceContracts.
```

Downstream consumers choose which product to import:
- **UI packages**: `import WorkspaceContracts` (mock for previews)
- **Server**: `import WorkspaceEngine` (real implementation)
- **App**: `import WorkspaceContracts` + a client conformance

## Benefits

1. **Testability**: Mock any dependency by conforming to the protocol
2. **Transport independence**: Swap HTTP for WebSocket without changing
   consumer code
3. **IDE support**: Full autocompletion, type checking, refactoring
4. **Agent-friendly**: Agents understand Swift protocols better than
   OpenAPI YAML
5. **Incremental adoption**: Start with protocols, add transport later
