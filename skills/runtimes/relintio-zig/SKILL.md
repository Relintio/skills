---
name: relintio-zig
description: Install and register the Relintio agent in a Zig application. Use for zig fetch and build.zig wiring, the assess-then-dispatch decision switch, fail-open default branches, allocator ownership, and typed rule handling.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "zig"
---

# Zig

Package: `relintio` · Zig 0.13 · [quickstart](https://relintio.com/docs/quickstart/zig)

## Install

```bash
zig fetch --save https://github.com/Relintio/relintio-zig-agent/archive/refs/heads/main.tar.gz
```

Then in `build.zig`:

```zig
const relintio = b.dependency("relintio", .{ .target = target, .optimize = optimize });
exe.root_module.addImport("relintio", relintio.module("relintio"));
```

## Register

Assess the request before the protected handler runs, and honour the decision.

```zig
const relintio = @import("relintio");

var agent = try relintio.Agent.initFromEnv(allocator);
defer agent.deinit();

const decision = try agent.assess(request);
switch (decision) {
    .allow => try handler(request, response),
    .block => try response.writeStatus(403),
    .challenge => try response.redirect(decision.challenge_url),
    else => try handler(request, response),
}
```

## Gotchas

**The `else` branch must allow.** Any decision the agent adds later that this code does not know about should let traffic through, not block it. That is what fail-open means in a `switch`.

**`initFromEnv` allocates.** Own the allocator, `defer agent.deinit()`, and do not construct one per request.

**Typed rules, not encrypted.** Zig receives the compact rule envelope described in the `relintio-api` skill.

**Check for an existing install:** `grep -n relintio build.zig.zon`.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
