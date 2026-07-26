---
name: relintio
description: Relintio router. Use when the user mentions Relintio, or asks about adding a WAF, bot mitigation, bot detection, application protection, rate limiting, or a security agent to their app; installing or registering the Relintio agent in Node, React, Python, PHP, Laravel, WordPress, Shopify, Go, Ruby, Rust, Java, .NET or Zig; the relintio CLI; UP_LICENSE_KEY or UP_API_URL; risk scores, response tiers, challenges, blocked or challenged traffic, false positives, SEO safety, path exclusions for health checks and webhooks; license verification, deployment check-in, policy revisions; or the Agent Contract v1 API. Routes to the right skill for the task.
license: MIT
metadata:
  version: "1.0.0"
---

# Relintio skills router

Relintio evaluates security policy **inside the application runtime**. An in-process agent scores every request against a policy it synchronizes from the control plane, and enforces the decision before the application's own handlers run. There is no proxy to point at and no DNS change to make.

Pick the skill that matches the task. Read one; do not load the whole set.

## By task

**Adding Relintio to a project** → `relintio-setup`
The workflow that applies to every runtime: detect, configure, register, verify, observe, then enforce. Start here even when you already know the runtime — it carries the rules that keep an install from being quietly useless.

**A specific runtime** → the matching `relintio-<runtime>` skill
Install command, exact registration point, and the mistakes specific to that stack. Load this *with* `relintio-setup`, not instead of it.

**Installing from the command line** → `relintio-cli`
`npx relintio@latest init` does detection, install, configuration, wiring and verification in one pass. Also `verify` and `doctor`.

**Traffic is being blocked, challenged, or let through** → `relintio-policy`
Risk score arithmetic, the five response tiers, rate limiting, path scoping, SEO safety, presets, and the observe-then-enforce rollout.

**Something is installed and wrong** → `relintio-debug`
Ordered diagnosis: is the agent running, is the license healthy, is a proxy hiding the client IP, is it a real false positive, did the policy actually land.

**Calling the API directly** → `relintio-api`
Agent Contract v1: verify, batched telemetry, log, heartbeat, challenge init, geo lookup, cache purge. For building an SDK for a runtime with no official one, or reading raw payloads.

## Runtime detection

Match the first row that applies. Order matters — a WordPress install also has a `composer.json`, and a Shopify app also has a `package.json`.

| Signal in the project root | Skill |
| --- | --- |
| `wp-config.php` | `relintio-wordpress` |
| `shopify.app.toml` | `relintio-shopify` |
| `package.json` with `react` or `next` | `relintio-react` |
| `package.json` | `relintio-node` |
| `pyproject.toml`, `requirements.txt`, `manage.py` | `relintio-python` |
| `composer.json`, `artisan` | `relintio-php` |
| `go.mod` | `relintio-go` |
| `Gemfile`, `config.ru` | `relintio-ruby` |
| `Cargo.toml` | `relintio-rust` |
| `pom.xml`, `build.gradle` | `relintio-java` |
| `*.csproj`, `*.sln` | `relintio-dotnet` |
| `build.zig` | `relintio-zig` |

If a repository holds both a frontend and a backend, protect the **server** first. React and Shopify are client-side companions: they report signals, they do not enforce policy. Never present either as a replacement for server-side protection when a protected backend exists.

## The rules that hold everywhere

These apply no matter which skill you end up in. They are the difference between an install that works and one that looks like it does.

1. **The license key is a secret.** Never print it, commit it, paste it into a prompt, put it in client-visible source, or write it to a log. It goes in the environment; the environment file goes in `.gitignore`.
2. **Register before the application's routes.** A middleware registered after the router protects nothing, and the diff looks correct either way.
3. **Fail open.** If the control plane is unreachable, traffic passes on the last valid cached policy. Every shipped SDK already behaves this way — do not "improve" it into failing closed.
4. **Use `https://api.relintio.com/v1`.** The legacy base `https://relintio.com/api` is compatibility-only, for installations that already use it.
5. **An unverified install is not an install.** Confirm against the control plane before reporting success.
6. **Observe before enforcing.** Watch a day of real traffic, then raise enforcement — not the other way round.
7. **Do not invent package names, versions, imports, or repository URLs.** If you cannot confirm one from the manifest, the registry, or the runtime skill, stop and ask.

## Configuration, in one place

```dotenv
UP_LICENSE_KEY=UP_LIVE_…
UP_API_URL=https://api.relintio.com/v1
```

Optional: `UP_EXCEPT_PATHS` (exclude health checks and webhooks — the one you will actually need), `UP_ONLY_PATHS`, `UP_ONLY_REGEX`, `UP_SYNC_INTERVAL`, `UP_ALLOW_SAMPLE_RATE`, `UP_AGENT_DISABLE`. Details in `relintio-policy`.

## Links

- Documentation — https://relintio.com/docs
- Quickstarts — https://relintio.com/docs/quickstart
- API reference — https://relintio.com/docs/api-reference
- Licenses — https://relintio.com/licenses
