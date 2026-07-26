---
name: relintio-debug
description: Diagnose a Relintio installation that is not behaving — legitimate users blocked or challenged, the agent not appearing in the dashboard, policy changes not taking effect, verification failing, everyone behind a proxy sharing one IP, or protection silently doing nothing. Use when Relintio is already installed and something is wrong.
license: MIT
metadata:
  version: "1.0.0"
  documentation: https://relintio.com/docs
---

# Debug a Relintio installation

Work in order. Each step is cheaper than the one after it, and most problems are solved by the first three.

**Disabling protection is not a diagnostic step.** It ends the investigation without answering anything and leaves the application exposed. Keep the last valid policy cache and work the list.

## Start here

```bash
npx relintio@latest doctor
```

This reports the runtime, whether the SDK is actually a dependency, whether the key and API URL are set, whether `.env` is ignored by git, and whether the control plane agrees the license is active — without changing a file. `--json` for a pipeline, `--offline` to skip the network call.

## 1. Is the agent actually running?

The most common failure is an agent that was installed but never loaded. Nothing is broken; nothing is protected either.

- Is the package in the manifest, and installed in the environment that is running — not just in the lockfile on your laptop?
- Does the registration line actually execute? A wrapper inside `if __name__ == "__main__"`, a middleware added after the router, a `mu-plugins` file that was never copied — all look correct in the diff and never run.
- Has the process restarted since the change? Long-lived workers, PHP-FPM with OPcache, and clustered Puma all hold the old code.
- Does the dashboard show a check-in in the last six minutes? The online cache entry expires after six.

If the dashboard has never seen this deployment, stop here. Everything below assumes the agent is running.

## 2. Is the license healthy?

```bash
curl -sS -X POST https://api.relintio.com/v1/verify \
  -H 'content-type: application/json' \
  -d '{"license_key":"'"$UP_LICENSE_KEY"'","domain":"example.com","protocol_version":1}'
```

| Response | Cause | Fix |
| --- | --- | --- |
| `401` | Key not recognised | Re-copy from the dashboard. Check for a trailing newline or a shell-mangled quote. |
| `403` | Suspended | Check license status. |
| `422` | Domain required or invalid | Send the hostname only — no scheme, no path. Bind it in the dashboard. |
| `429` | Rate limited | Wait. Do not retry in a loop; that is what got you here. |
| `200` + `status: "expired"` | Subscription lapsed | Renew. **Protection is disabled.** The HTTP status is a success, so this is easy to miss — check the body. |
| `200` + policy | Healthy | Move on. |

There is a 48-hour grace period after a subscription ends. Past that, the agent is told to stand down.

## 3. Are you behind a proxy?

If legitimate users are being blocked *as a group*, or the event stream shows one IP for everything, the agent is scoring the proxy rather than the client. Rate limiting then fires on your own load balancer and takes out all of it at once.

Check what the agent sees as the client IP. If it is your CDN, your load balancer, or `10.x`/`172.16.x`/`192.168.x`, configure trusted forwarding headers and the real client-IP chain before touching anything else.

This is the single most common cause of "Relintio is blocking everyone."

## 4. Is it a real false positive?

Take one blocked request from the dashboard event stream and add up its signals by hand — the table is in the `relintio-policy` skill.

- **Score is right, traffic is legitimate** (a health check, a webhook, an uptime monitor): the fix is an exclusion in `UP_EXCEPT_PATHS`, narrow and explicit.
- **Score is wrong** (a real browser scoring 60): something is stripping headers. A proxy removing `Accept-Language`, an aggressive CDN normalizing requests, an in-app webview with a truncated User-Agent. Fix the header path, not the threshold.
- **A crawler is being scored as spoofed**: SEO Safety is off, or the crawler is genuinely spoofed. Verify before you allow.

Never fix a false positive by excluding login, registration, checkout, password reset, or payment routes.

## 5. Did the policy change actually land?

Rule synchronization targets a jittered 8–12 second interval. The health heartbeat is slower.

**A recent check-in is not proof that a policy revision synchronized.** Check the reported policy revision instead. If it is stale:

- the agent may be serving a cached ruleset because a malformed response was correctly rejected — check the runtime logs;
- `POST /agent/purge-cache` increments `rules_version` and forces a discard on the next sync;
- an `If-None-Match` round trip returning `304` means nothing changed, which may itself be the answer.

## 6. Is protection silently doing nothing?

An agent that loaded but sees no traffic:

- **Caching in front of PHP.** A fully cached page never reaches the runtime.
- **`UP_ONLY_PATHS` too narrow.** It protects a subset and allows everything else, quietly.
- **`UP_AGENT_DISABLE` still set** from an earlier incident.
- **Registered after the router**, so requests are handled before the agent sees them.
- **A React or Shopify agent only.** Those are client-side companions. They report; they do not enforce. If there is a backend, it is unprotected.
- **Two agents installed**, each thinking the other handled it, both double-reporting.

## 7. Reading the logs

The SDKs fail open by design: a control-plane outage produces a warning and allowed traffic, not an exception. So an empty error log is not evidence that everything is fine.

Look for the sync interval firing, the policy revision it received, and the decision counts by tier. If you see decisions but no syncs, the agent is running on a stale cache.

## When to escalate

Collect before you ask: the runtime and SDK version, the `doctor` output, the `verify` response body with the key redacted, one full event record from the dashboard for the traffic in question, the client IP the agent believes it saw, and the current policy revision.

**Never paste the license key** into an issue, a chat, a prompt, or a log. Redact it.
