---
name: relintio-go
description: Install and register the Relintio agent in a Go application. Use for Gin middleware, net/http handler wrapping, Chi/Echo/Fiber chains, registration ordering, background sync goroutine shutdown, and typed rule handling. Covers the relintio-golang-agent module.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "go"
---

# Go

Module: `github.com/Relintio/relintio-golang-agent` · Go 1.22+ · [quickstart](https://relintio.com/docs/quickstart/go)

## Install

```bash
go get github.com/Relintio/relintio-golang-agent
```

## Register — Gin

```go
import relintio "github.com/Relintio/relintio-golang-agent"

r := gin.Default()

r.Use(relintio.GinMiddleware(relintio.Config{
    LicenseKey: os.Getenv("UP_LICENSE_KEY"),
    APIURL:     os.Getenv("UP_API_URL"),
}))

// routes below
```

## Register — net/http

Wrap the outermost handler, so the agent sees the request before the mux routes it.

```go
mux := http.NewServeMux()
mux.HandleFunc("/", handler)

protected := relintio.Middleware(relintio.ConfigFromEnv())(mux)

log.Fatal(http.ListenAndServe(":8080", protected))
```

Chi, Echo, and Fiber all accept a `net/http` middleware at the top of the chain — the same wrapper works.

## Gotchas

**Order is literal in Go.** `r.Use(...)` after a route group has been defined does not apply to that group. Register before you define anything.

**The agent runs a background sync goroutine.** It is bounded and cancellable. On shutdown, cancel the context you gave it rather than letting the process exit mid-flight, so the last telemetry batch is not lost.

**`ConfigFromEnv()` reads `UP_LICENSE_KEY` and `UP_API_URL`.** If either is empty the agent stays inert. Check the return value at boot rather than discovering it in production.

**Typed rules, not encrypted.** Go receives the compact rule envelope described in the `relintio-api` skill. Reject a malformed response and keep the last valid cache — the SDK already does this; do not override it.

**Check for an existing install:** `grep -n relintio go.mod`.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
