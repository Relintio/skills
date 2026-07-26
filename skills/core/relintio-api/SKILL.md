---
name: relintio-api
description: Work directly against the Relintio Agent Contract v1 HTTP API — verify, log, batched telemetry, heartbeat, challenge init, geo lookup, cache purge. Use when building or maintaining a Relintio SDK, integrating from a runtime with no official SDK, scripting license checks in CI, or debugging raw request and response payloads.
license: MIT
metadata:
  version: "1.0.0"
  protocol: agent-contract-v1
  documentation: https://relintio.com/docs/api-reference
---

# Relintio Agent Contract v1

The language-neutral interface between the control plane and every agent. If you are integrating a runtime with no official SDK, this is the whole contract.

**Base URL:** `https://api.relintio.com/v1`

`https://relintio.com/api` is compatibility-only, for installations that already use it. It runs the same handlers without a redirect and adds `Deprecation: true`, a `Link` header with `rel="successor-version"`, and `X-Relintio-Canonical-Api`. New code uses the canonical base.

Never derive one origin from the other by string-replacing `api`. Use the URLs the control plane returns.

## Headers

| Header | When | Notes |
| --- | --- | --- |
| `Content-Type: application/json` | Every POST | All payloads are JSON |
| `Accept: application/json` | Recommended | Prevents HTML error negotiation |
| `If-None-Match` | Optional on verify | `304` when the policy revision is unchanged |
| `Idempotency-Key` | Batch telemetry | 8–128 chars; may also go in the body |
| `X-Agent-Version` | Legacy | Prefer `agent_version` in the body |

**License keys go in request bodies.** Never in a URL, a query string, a log line, source control, or browser storage.

## Identity

Every request from a current agent carries:

| Field | Type | Value |
| --- | --- | --- |
| `protocol_version` | integer | `1` |
| `agent_kind` | string | `dotnet`, `go`, `java`, `node`, `php-thin`, `python`, `react`, `ruby`, `rust`, `shopify`, `wordpress`, `zig` |
| `agent_version` | string | Package version |
| `capabilities` | string[] | e.g. `enforce:block`, `enforce:challenge`, `telemetry:v1` — max 64 chars each |

## `POST /agent/verify`

Synchronize policy, or get a browser decision.

```json
{
  "license_key": "UP_LIVE_REDACTED",
  "domain": "example.com",
  "blocked_ips_version": 0,
  "intel_version": 0,
  "protocol_version": 1,
  "agent_kind": "node",
  "agent_version": "0.11.4",
  "capabilities": ["enforce:block", "enforce:challenge", "telemetry:v1"]
}
```

`domain` is required for non-administrator licenses. Send the hostname only — no scheme, no path. Normalized to 255 characters.

| HTTP | Meaning |
| --- | --- |
| `200` | Success, expired/degraded state, or a browser decision |
| `304` | Policy unchanged (with `If-None-Match`) |
| `401` | Invalid license |
| `403` | Suspended or inactive |
| `422` | Invalid payload, or the required domain is missing |
| `429` | Agent rate limit exceeded |

Successful policy responses carry `ETag`, `X-Policy-Revision`, and — after signed publication — `policy_signature` and `policy_signing_key_id`.

**A `200` is not automatically a success.** Check the body: `status: "expired"` means the subscription lapsed and protection is off.

### Three response shapes

**Encrypted rules** — PHP thin, Node, Python:

```json
{
  "status": "success",
  "timestamp": 1784073600,
  "encrypted": true,
  "payload": "BASE64_ENVELOPE",
  "rules_version": 4
}
```

Envelope: `base64(IV[16] + AES-256-CBC ciphertext + HMAC-SHA256[32])`. Verify the HMAC before decrypting.

**Typed rules** — .NET, Go, Java, Ruby, Rust, Zig:

```json
{
  "status": "success",
  "timestamp": 1784073600,
  "encrypted": false,
  "rules": [
    { "type": "path", "pattern": "/admin", "condition": "contains", "score": 100, "action": "block" }
  ],
  "rules_version": 4
}
```

**Browser decision** — Shopify: an immediate `allow`, `challenge`, or `block` instead of a ruleset.

## `POST /agent/events/batch`

The preferred telemetry transport. 1–100 events, one idempotent write, `202 Accepted` before asynchronous enrichment.

```json
{
  "license_key": "UP_LIVE_REDACTED",
  "idempotency_key": "01J2BATCH000000000000000000",
  "schema_version": "1.0",
  "agent": { "protocol_version": 1, "agent_kind": "node", "agent_version": "1.0.0" },
  "events": [
    { "ip": "203.0.113.10", "action": "BLOCK", "path": "/login", "reason_code": "bot_signature", "risk_score": 80 }
  ]
}
```

Retrying an identical batch with the same key is safe. A **different** payload under the same key returns `409 Conflict` — generate a fresh key per batch, not per retry.

## `POST /agent/log`

A single normalized event. Required: `license_key`, a valid IPv4/IPv6 `ip`, and `action`.

| Field | Type | Limit |
| --- | --- | --- |
| `action` | string | One of `ALLOW`, `SLOW`, `CHALLENGE`, `DECOY`, `BLOCK` |
| `method` | string | 10 chars |
| `host` | string | 255 chars |
| `path` | string | 1,024 chars |
| `user_agent` | string | Raw; the server can derive `ua_hash` |
| `ua_hash` | string | SHA-256 hex |
| `reason_code` | string | 80 chars |
| `risk_score` | integer | 0–100 |

Success: `200 {"status":"logged"}`.

Prefer the batch endpoint for new code.

## `POST /agent/challenge/init`

```json
{ "license_key": "UP_LIVE_REDACTED", "return_url": "https://example.com/account" }
```

`return_url` must be absolute HTTP(S), max 2,048 characters.

```json
{ "status": "success", "token": "…", "challenge_url": "https://relintio.com/security-check?token=…", "ttl": 300 }
```

**Use the returned `challenge_url` verbatim.** Deriving a browser origin from the API hostname is only ever a fallback for older control planes, and stripping the substring `api` from a URL is never acceptable — it corrupts hostnames like `api.myapiapp.com`.

Tokens live five minutes, permit at most 120 seconds of absolute clock skew, and must be compared in constant time.

## `POST /agent/heartbeat`

`license_key` required; `domain`, `agent_kind`, `agent_version` optional. Returns `200 {"status":"ok"}`.

The online cache entry expires after six minutes. When a matching licensed domain exists, the latest runtime kind, version, and check-in time are persisted for deployment verification — which is how the dashboard catches a reachable target running a different SDK than expected.

Typed SDKs report the same identity during rule sync and do not need a separate heartbeat.

## `POST /agent/geo-lookup`

```json
{ "license_key": "UP_LIVE_REDACTED", "ip": "203.0.113.10" }
```

`200 {"country":"US","asn":"AS64500","org":"Example"}`. Invalid input returns `XX` with null ASN data; an inactive license returns `403`. For agents whose runtime has no geo headers.

## `POST /agent/purge-cache`

`{"license_key":"UP_LIVE_REDACTED"}` — increments `rules_version` so agents discard stale rules on the next sync.

## Policy revision caching

Verify responses carry `ETag` and `X-Policy-Revision`. Send the previous ETag in `If-None-Match` and the platform returns `304` when nothing changed. Signed revisions add `policy_signature` and `policy_signing_key_id`.

## Failure semantics — the part that matters

These are requirements, not suggestions. An agent that violates them can take an application offline.

- **Fail open.** Platform, DNS, cache, or telemetry unavailable means traffic passes on the last valid cached policy.
- **Preserve valid local decisions.** Failing open on infrastructure does not mean discarding a block the agent already decided locally.
- **Timeouts on everything.** Connect *and* total. An agent without a total timeout will eventually hang a request thread.
- **Bounded background work.** Retained, bounded, cancellable, or explicitly awaited. Never a detached task with unbounded growth.
- **Reject malformed or oversized rule responses without replacing the last valid cache.** A corrupted response must not become the active policy.
- **Never leak.** Server errors must not expose provider messages, secrets, or streamed content to clients.

## Compatibility aliases

`POST /verify`, `POST /log`, and `POST /challenge/init` still work. New code uses the `/agent/*` routes.

## Health

`GET /health` — no auth, no throttle. Reports database and cache latency, queue readiness, and Stripe configuration. `200` for `ok` and `degraded`, `503` for `critical`. This is the platform's own health, not your license's.
