---
name: relintio-cli
description: Operate the Relintio CLI — npx relintio@latest init, verify and doctor. Use when installing Relintio from the command line, scripting a license check in CI or a deploy pipeline, diagnosing a project without changing files, or interpreting the CLI's exit codes and flags. Covers runtime detection, package-manager selection, .env handling, automatic Express wiring, and the dry-run.
license: MIT
metadata:
  version: "1.0.0"
  package: relintio
---

# The Relintio CLI

```bash
npx relintio@latest init
```

One pass: detect the runtime, install the right agent SDK with the project's own package manager, write `UP_LICENSE_KEY` and `UP_API_URL`, add `.env` to `.gitignore`, register the Express middleware when it can do so safely, and verify the license against the control plane.

Zero runtime dependencies, Node 18+. The project itself can be any of the twelve supported runtimes — Node is only needed to run the installer.

## Commands

### `init`

Safe to run more than once. An agent already in the manifest is not reinstalled, an entry file already wired is left alone, and existing `.env` values are updated in place rather than appended.

```bash
npx relintio@latest init
npx relintio@latest init --license-key UP_LIVE_… --domain shop.example.com --yes
npx relintio@latest init --dry-run
```

Reach for `--dry-run` first on any repository you did not write. It prints the plan — install command, env changes, which file would be edited — and changes nothing.

### `verify`

Ask the control plane whether this license is currently active. Reads the key from `--license-key`, then `UP_LICENSE_KEY`, then `.env`.

```bash
npx relintio@latest verify
npx relintio@latest verify --json
```

Exits `0` when active and `1` when not, so it drops straight into a deploy pipeline as a gate.

### `doctor`

Read-only. Reports everything that would stop this project being protected without touching a file, so it is safe in CI and safe on a repository you are unfamiliar with.

```bash
npx relintio@latest doctor
npx relintio@latest doctor --offline --json
```

Checks the runtime, whether the SDK is actually a declared dependency, whether the key and API URL are set, whether the key matches the expected shape, whether `.env` is git-ignored, whether a domain can be inferred, and whether the control plane agrees the license is active.

## Options

| Option | Meaning |
| --- | --- |
| `-k, --license-key <key>` | Falls back to `UP_LICENSE_KEY`, then `.env`. |
| `-d, --domain <host>` | Inferred from `APP_URL` or `homepage` when omitted. Hostname only. |
| `-r, --runtime <id>` | Skip detection. `node`, `react`, `python`, `php`, `go`, `ruby`, `rust`, `java`, `dotnet`, `zig`, `wordpress`, `shopify`. |
| `--api-url <url>` | Defaults to `https://api.relintio.com/v1`. |
| `--cwd <dir>` | Project root. |
| `-y, --yes` | Accept every prompt. Implied when stdin is not a TTY, so CI never hangs. |
| `--dry-run` | Print the plan, change nothing. |
| `--no-install` | Skip the package install. |
| `--no-wire` | Never touch application source. |
| `--no-verify` | Skip the network check. |
| `--offline` | `doctor` only: skip the control-plane call. |
| `--json` | Machine-readable output for `verify` and `doctor`. |

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Done. |
| `1` | Could not proceed — bad arguments, no runtime detected, failed install, or `verify`/`doctor` found a problem. |
| `2` | `init` only: everything is in place but verification failed. The install is not the problem; the license or the network is. |

That `2` matters in a pipeline. Treating it as a hard failure will roll back a perfectly good install because a subscription lapsed.

## What it decides, and how

**Runtime detection is ordered, not first-match-by-luck.** WordPress beats the `composer.json` beside it, Shopify beats its `package.json`, and React beats Node. When more than one still matches — a monorepo, a polyglot service — it says so and asks for `--runtime` rather than guessing.

**The package manager comes from the lockfile.** `pnpm-lock.yaml` gets `pnpm add`, `bun.lockb` gets `bun add`, `poetry.lock` or `[tool.poetry]` gets `poetry add`, `uv.lock` gets `uv add`. It does not impose npm on a pnpm project.

**`.env` edits are surgical.** An existing `UP_LICENSE_KEY` is rewritten where the author put it, so ordering and comments survive. New keys are appended under a labelled block. Values containing spaces or quotes are quoted.

**Source is only edited when the shape is unambiguous.** Express, and only when the app is a plain `const app = express()`. It matches the variable name the project actually uses, puts the import with the other imports rather than above a shebang, and registers before every other `app.use`. Anything less obvious is left alone and the snippet is printed instead. Running twice is a no-op.

## In CI

```yaml
- run: npx relintio@latest doctor --json
- run: npx relintio@latest verify --domain ${{ vars.APP_DOMAIN }}
  env:
    UP_LICENSE_KEY: ${{ secrets.UP_LICENSE_KEY }}
```

The key comes from the secret store, never from a file in the repository. `--yes` is implied without a TTY, so nothing hangs waiting for input.

## When not to use it

The CLI installs an agent. It does not tune policy — for thresholds, exclusions and the enforcement rollout, see `relintio-policy`. It also cannot fix a project whose entry point it declines to edit; when it prints a snippet instead of wiring, place that snippet yourself using the matching `relintio-<runtime>` skill.
