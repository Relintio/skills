---
name: relintio-rust
description: Install and register the Relintio agent in a Rust application. Use for Axum tower layers, Actix-web wrap ordering, the outermost-last layer inversion, Tokio runtime requirements, and the relintio-agent crate.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "rust"
---

# Rust

Crate: `relintio-agent` · edition 2021 · [quickstart](https://relintio.com/docs/quickstart/rust)

## Install

```bash
cargo add relintio-agent
```

## Register — Axum

```rust
use relintio_agent::axum::RelintioLayer;

let app = Router::new()
    .route("/", get(handler))
    .layer(RelintioLayer::from_env());
```

## Register — Actix-web

```rust
use relintio_agent::actix::Relintio;

HttpServer::new(|| {
    App::new()
        .wrap(Relintio::from_env())
        .service(index)
})
```

## Gotchas

**Tower layers apply outermost-last.** In Axum, the layer added *last* runs *first*. Put `RelintioLayer` at the end of the `.layer()` chain so it is the outermost — the opposite of what reading top-to-bottom suggests.

**Actix's `.wrap()` is the same inversion.** The last `wrap` runs first.

**`from_env()` reads `UP_LICENSE_KEY` and `UP_API_URL`** and returns a layer that no-ops when they are missing. Assert on them at startup rather than shipping an inert agent.

**The background sync task needs a Tokio runtime.** In a `main` that builds its own runtime, construct the layer inside it.

**Check for an existing install:** `grep -n relintio Cargo.toml`.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
