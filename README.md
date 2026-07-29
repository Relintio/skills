<div align="center">
  <img src="./assets/relintio-logo.svg" alt="Relintio" width="260">

  <h1>Relintio Skills</h1>

  <p>
    <a href="https://skills.sh/relintio/skills"><img alt="skills.sh" src="https://img.shields.io/badge/skills.sh-relintio%2Fskills-efd420"></a>
    <a href="https://www.npmjs.com/package/relintio"><img alt="npm" src="https://img.shields.io/npm/v/relintio?label=relintio%20CLI&color=efd420"></a>
    <a href="./LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-efd420"></a>
  </p>

  <p><strong>Skills to help AI coding agents work correctly with Relintio.</strong></p>
</div>

---

Relintio evaluates security policy **inside the application runtime**. An in-process agent scores every request against a policy it synchronizes from the control plane, and enforces the decision before your own handlers run. No proxy, no DNS change.

These skills teach an agent to install that correctly — registered early enough to matter, with the license key out of source control, failing open, and verified against the control plane before anyone calls it done.

Skills follow the [Agent Skills](https://agentskills.io) format.

## Install

### Agent Skills

```bash
npx skills add relintio/skills
```

### Codex

```bash
codex plugin marketplace add relintio/skills
```

Then restart Codex, open `/plugins`, select **Relintio**, install and enable `relintio-skills`, and start a new thread.

### Claude Code

```bash
/plugin marketplace add relintio/skills
```

Or clone directly:

```bash
git clone https://github.com/Relintio/skills ~/.claude/skills/relintio
```

## Skills

### Core

| Skill | Purpose | When to Use |
| --- | --- | --- |
| `relintio` | **Router** — routes to the right skill | Always start here |
| `relintio-setup` | Install into any runtime | New projects, first install |
| `relintio-cli` | `npx relintio@latest init`, `verify`, `doctor` | Command-line install, CI gates |
| `relintio-api` | Agent Contract v1 HTTP API | Building an SDK, reading raw payloads |

### Runtimes

| Skill | Runtime | Registration point |
| --- | --- | --- |
Grouped by where the agent runs, because that decides which credential it
holds. The frontend skills take a **publishable key** (`pk_live_…`) and must
never be given a licence key.

**Frontend and browser**

| Skill | Runtime | Registration point |
| --- | --- | --- |
| `relintio-react` | React / Next.js | Provider at the app root, fetch interceptor |
| `relintio-vue` | Vue 3 / Vite | `app.use(relintio)`, challenge composable |
| `relintio-svelte` | Svelte / SvelteKit | Client factory in the root layout |
| `relintio-angular` | Angular 16+ | `provideRelintio()`, HttpClient interceptor |
| `relintio-expo` | Expo / React Native | Native client, challenge WebView |
| `relintio-shopify` | Shopify | Dashboard OAuth and storefront ScriptTag |

**Backend and server**

| Skill | Runtime | Registration point |
| --- | --- | --- |
| `relintio-node` | Node.js | Express middleware, or the zero-code preload |
| `relintio-python` | Python | ASGI wrapper, Django middleware, sitecustomize |
| `relintio-php` | PHP / Laravel | Front controller, or `auto_prepend_file` |
| `relintio-go` | Go | Gin middleware, or `net/http` wrapping |
| `relintio-ruby` | Ruby | Rack in `config.ru`, Rails `insert_before 0` |
| `relintio-rust` | Rust | Axum layer, Actix wrap |
| `relintio-java` | Java | Spring filter at highest precedence |
| `relintio-dotnet` | C# / .NET | `UseRelintio()` before `UseRouting()` |
| `relintio-zig` | Zig | Assess before the protected handler |

**Framework adapters**

| Skill | Runtime | Registration point |
| --- | --- | --- |
| `relintio-express` | Express | One `app.use()`, before the body parser |
| `relintio-nuxt` | Nuxt 3 / 4 | Module — Nitro middleware and client plugin |

**Platform integrations**

| Skill | Runtime | Registration point |
| --- | --- | --- |
| `relintio-wordpress` | WordPress | Plugin zip, `wp-config.php`, mu-plugins |
| `relintio-vercel` | Vercel | `middleware.js` at the project root |
| `relintio-supabase` | Supabase | Wraps the Deno handler |
| `relintio-firebase` | Firebase | Wraps an `onRequest` handler |

### Operations

| Skill | Purpose | When to Use |
| --- | --- | --- |
| `relintio-policy` | Risk scores, tiers, exclusions, rollout | Traffic blocked, bots getting through |
| `relintio-debug` | Ordered diagnosis | Installed, and something is wrong |

## Quick Start

### 1. Get a license key

From the [dashboard](https://relintio.com/licenses). Put it in the environment, never in source:

```dotenv
UP_LICENSE_KEY=UP_LIVE_xxx
UP_API_URL=https://api.relintio.com/v1
```

### 2. Ask your agent

| You say | Skill used |
| --- | --- |
| "Add Relintio protection to my app" | `relintio-setup` |
| "Protect my Express server" | `relintio-node` |
| "Add Relintio to my FastAPI app" | `relintio-python` |
| "Add Relintio to my Laravel app" | `relintio-php` |
| "Protect my WordPress site" | `relintio-wordpress` |
| "Add Relintio to my Gin API" | `relintio-go` |
| "Install Relintio from the command line" | `relintio-cli` |
| "Check whether my license is active" | `relintio-cli` |
| "Why is my uptime monitor being challenged?" | `relintio-policy` |
| "Exclude webhooks and health checks" | `relintio-policy` |
| "Relintio is blocking real users" | `relintio-debug` |
| "The dashboard shows no check-in" | `relintio-debug` |
| "Build an agent for a runtime you don't support" | `relintio-api` |

Or skip the agent entirely:

```bash
npx relintio@latest init
```

## What these skills insist on

Every skill here enforces the same rules, because each one is a way an install ends up looking finished while protecting nothing.

- The license key never reaches source control, a log, or a prompt.
- The agent registers **before** your routes. A middleware added after the router protects nothing, and the diff looks identical either way.
- Failure is always open — a control-plane outage must never take the site down.
- Health checks and webhooks are excluded explicitly, never by lowering protection globally.
- Login, registration, checkout and password reset are never carved out to silence a false positive.
- Observe for a day before enforcing.
- An install that has not been verified against the control plane is not an install.

## Repository Structure

```
skills/
├── .agents/
│   └── plugins/
│       └── marketplace.json
├── .claude-plugin/
│   └── marketplace.json
├── .codex-plugin/
│   └── plugin.json
├── .well-known/
│   └── agent-skills/
│       └── index.json          # served from relintio.com
├── assets/
├── scripts/
│   └── validate.mjs
├── skills/
│   ├── core/
│   │   ├── relintio/           # Router skill
│   │   ├── relintio-setup/     # Install workflow
│   │   ├── relintio-cli/       # CLI operations
│   │   └── relintio-api/       # Agent Contract v1
│   ├── runtimes/
│   │   ├── relintio-node/
│   │   ├── relintio-react/
│   │   ├── relintio-python/
│   │   ├── relintio-php/
│   │   ├── relintio-wordpress/
│   │   ├── relintio-shopify/
│   │   ├── relintio-go/
│   │   ├── relintio-ruby/
│   │   ├── relintio-rust/
│   │   ├── relintio-java/
│   │   ├── relintio-dotnet/
│   │   └── relintio-zig/
│   └── operations/
│       ├── relintio-policy/
│       └── relintio-debug/
└── README.md
```

## Contributing

Each skill is a directory containing `SKILL.md` with YAML frontmatter carrying `name`, `description` and `license`. The `name` must match the directory name, and the directory belongs under the category that fits.

When you add, move or remove a skill, update `.claude-plugin/marketplace.json` in the same commit. Then:

```bash
node scripts/validate.mjs
```

That checks frontmatter, name/directory agreement, duplicate names, relative links, manifest drift, and that no real license key ever got committed. CI runs the same script, so a skill that would be silently skipped by the tooling fails the build instead of quietly disappearing.

## Resources

- [Documentation](https://relintio.com/docs)
- [Quickstarts](https://relintio.com/docs/quickstart)
- [API reference](https://relintio.com/docs/api-reference)
- [Licenses](https://relintio.com/licenses)

## Request a skill

Missing something? [Open an issue](https://github.com/Relintio/skills/issues).

## License

MIT
