---
name: relintio-setup
description: Install, configure, and verify Relintio application protection in a codebase. Use when a project needs the Relintio agent added, when middleware ordering or registration point matters, when wiring UP_LICENSE_KEY and UP_API_URL, when a deployment must be verified against the control plane, or when a Relintio install exists but was never confirmed working. Covers Node.js, React, Python, PHP, Laravel, WordPress, Shopify, Go, Ruby, Rust, Java, .NET, and Zig.
license: MIT
metadata:
  version: "1.0.0"
  protocol: agent-contract-v1
  documentation: https://relintio.com/docs
---

# Add Relintio protection

Relintio evaluates security policy **inside the application runtime**. There is no proxy to point at and no DNS change to make. An agent runs in-process, scores every request against a policy it synchronizes from the control plane, and enforces the decision before the application's own handlers run.

Your job is to install that agent correctly, register it early enough to matter, keep the license key out of source control, and then prove it works. An install that has not been verified is not an install.

## Non-negotiable rules

1. **Read the repository before editing it.** Identify the runtime, framework, request entry point, existing middleware order, reverse proxy, health checks, and webhook routes. A registration point chosen without that context will either miss traffic or block the wrong traffic.
2. **The license key is a secret.** Never print it, commit it, paste it into a prompt, place it in client-visible source, or write it to a log. It goes in the environment; the environment file goes in `.gitignore`.
3. **Register before the application's routes.** After body parsing if the framework needs it, but before anything that touches user data. A middleware registered after the router protects nothing.
4. **Fail open.** If the control plane is unreachable, the agent must let traffic through on its last valid cached policy. Never write integration code that takes the site down when Relintio is unavailable. Every shipped SDK already behaves this way — do not "improve" it into failing closed.
5. **Use `https://api.relintio.com/v1`.** The legacy base `https://relintio.com/api` exists only for installations that already use it. New code uses the canonical base.
6. **Exclude machine traffic explicitly.** Health checks, inbound webhooks, and server-to-server API calls score as bots by default, because they *are* machines. Scope them out with narrow path rules — never by lowering protection globally.
7. **Observe before you enforce.** Turn the agent on, watch a day of real traffic in the dashboard, confirm the decisions match what you expected, and only then raise enforcement. Going straight to blocking on day one is how legitimate users get locked out.
8. **Do not invent package names, versions, imports, or repository URLs.** If you cannot confirm one from the manifest, the registry, or the reference file for that runtime, stop and ask.

## The fastest path

If the project can run Node 18+, the CLI does all of this:

```bash
npx relintio@latest init
```

It detects the runtime, installs the right SDK with the project's own package manager, writes `UP_LICENSE_KEY` and `UP_API_URL`, adds `.env` to `.gitignore`, registers the Express middleware when it can do so safely, and verifies the license against the control plane. `--dry-run` prints the plan without touching anything.

Do the rest of this skill by hand when the CLI cannot run, when it declines to edit an entry file, or when the project is one of the runtimes it can only print a snippet for.

## Step 1 — Detect the runtime

Match the first row that applies. Order matters: a WordPress install also has a `composer.json`, and a Shopify app also has a `package.json`.

| Signal in the project root | Runtime | Skill |
| --- | --- | --- |
| `wp-config.php` | WordPress | `relintio-wordpress` |
| `shopify.app.toml` | Shopify | `relintio-shopify` |
| `package.json` with `react` or `next` | React | `relintio-react` |
| `package.json` | Node.js | `relintio-node` |
| `pyproject.toml`, `requirements.txt`, `manage.py` | Python | `relintio-python` |
| `composer.json`, `artisan` | PHP | `relintio-php` |
| `go.mod` | Go | `relintio-go` |
| `Gemfile`, `config.ru` | Ruby | `relintio-ruby` |
| `Cargo.toml` | Rust | `relintio-rust` |
| `pom.xml`, `build.gradle` | Java | `relintio-java` |
| `*.csproj`, `*.sln` | .NET | `relintio-dotnet` |
| `build.zig` | Zig | `relintio-zig` |

Load only the skill for the runtime you matched, alongside this one. Each carries the install command, the exact registration point, and the mistakes specific to that stack.

If two runtimes match because the repository holds a frontend and a backend, protect the **server** first. React and Shopify are client-side companions: they report signals, they do not enforce policy. Never describe either as a replacement for server-side protection when a protected backend exists.

## Step 2 — Configure

Two variables, in the environment, never in source:

```dotenv
UP_LICENSE_KEY=UP_LIVE_…
UP_API_URL=https://api.relintio.com/v1
```

Optional, and worth reaching for only when there is a reason:

| Variable | Default | Use it when |
| --- | --- | --- |
| `UP_SYNC_INTERVAL` | `10` | Policy refresh cadence in seconds. Jitter and failure backoff are automatic; leave it alone unless the control plane asks you to change it. |
| `UP_ONLY_PATHS` | — | Protect a subset only. Exact (`/checkout`) or prefix (`/product/*`). |
| `UP_EXCEPT_PATHS` | — | Exclude health checks, webhooks, and machine endpoints. This is the one you will actually need. |
| `UP_ONLY_REGEX` | — | A JS-style regex source when path lists get unwieldy. |
| `UP_ALLOW_SAMPLE_RATE` | `0.01` | Telemetry sampling for ALLOW decisions. Raise it while tuning, lower it after. |
| `UP_AGENT_DISABLE` | — | Kill switch. Set it to disable the agent without redeploying. |

Then confirm the env file is ignored:

```bash
grep -q '^\.env$' .gitignore || printf '\n# Relintio: never commit your license key\n.env\n' >> .gitignore
```

## Step 3 — Register

The registration point is per-runtime; take it from the runtime skill. What is universal:

- It happens **before** the application's routes.
- It happens **once**. Two agents on one request path will double-count risk and double-report telemetry.
- It reads the key from the environment, not from a literal.
- It survives a control-plane outage without taking the app with it.

If a Relintio agent is already installed, do not add a second one. Upgrade the existing one instead.

## Step 4 — Verify

An install is not finished until the control plane confirms it.

```bash
npx relintio@latest verify --domain example.com
```

Or directly:

```bash
curl -sS -X POST https://api.relintio.com/v1/verify \
  -H 'content-type: application/json' \
  -d '{"license_key":"'"$UP_LICENSE_KEY"'","domain":"example.com","protocol_version":1}'
```

| Result | Meaning | Do this |
| --- | --- | --- |
| `200` with a policy body | Working. | Move to observation. |
| `401` | The key was not recognised. | Re-copy it from https://relintio.com/licenses. |
| `403` | The license is suspended. | Check the license status in the dashboard. |
| `422` | The license needs a domain. | Pass the real public hostname, or bind it in the dashboard. |
| `429` | Rate limited. | Wait, then retry. Do not loop. |
| `status: "expired"` on a `200` | The subscription lapsed. Protection is off. | Renew. This one is easy to miss — the HTTP status is a success. |

Then, in the dashboard: enter the exact public domain, open one safe public route so the agent checks in, and run the deployment verification for that target. Confirm the reported runtime, the last check-in, and the current policy revision.

Rule synchronization targets a jittered 8–12 second interval. The health heartbeat is slower — a fresh heartbeat is **not** proof that a new policy revision has landed.

## Step 5 — Observe, then enforce

Leave the agent in its default posture and watch real traffic for a day. Then, in the dashboard, look for:

- legitimate traffic that scored above `40`, which means a threshold needs raising or a path needs excluding;
- health checks and webhooks appearing in the event stream at all, which means Step 2's exclusions are missing;
- crawlers being scored as spoofed, which means SEO Safety needs attention.

Only once that reads clean should enforcement go up. See the `relintio-policy` skill for what the score bands mean and how to move them.

## Never do these

- Test production with exploit payloads. Verify through the deployment verifier and a normal public route.
- Bypass protection on login, registration, checkout, password reset, or any user-facing form. If those routes are producing false positives, tune the policy — do not switch it off.
- Disable SEO Safety on a public site without saying out loud what it costs.
- Derive the challenge URL by removing the string `api` from the API hostname. Use the `challenge_url` the control plane returns.
- Treat a passing heartbeat as proof that a policy change synchronized.

## Report back

When you finish, state:

- the runtime and framework you detected;
- the integration method and the exact file and line where the agent registers;
- every file you changed;
- the **names** of the environment variables you referenced — never their values;
- which paths you protected or excluded, and why;
- the verification target and its result;
- anything still needing dashboard access or a human decision.

## References

- Documentation — https://relintio.com/docs
- Quickstarts — https://relintio.com/docs/quickstart
- Deployment workflow — https://relintio.com/docs/deployment
- Proxy and HTTPS — https://relintio.com/docs/proxy-https
- Agent Contract v1 — `relintio-api`
- Policy tuning — `relintio-policy`
- Diagnosis — `relintio-debug`
