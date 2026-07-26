# Relintio Skills

AI agent skills for Relintio application protection. 18 skills across 3 categories.

## Structure

```
skills/
├── core/         # relintio (router), setup, cli, api
├── runtimes/     # node, react, python, php, wordpress, shopify,
│                 # go, ruby, rust, java, dotnet, zig
└── operations/   # policy, debug
```

`core/relintio` is the router. Every other skill assumes the reader arrived through it, or knows exactly what they want. A runtime skill is loaded *alongside* `relintio-setup`, not instead of it: setup carries the workflow and the rules, the runtime skill carries the install command and the exact registration point.

## Plugin registry

| File | Format |
| --- | --- |
| `.claude-plugin/marketplace.json` | Anthropic plugin format, 3 grouped plugins |
| `.codex-plugin/plugin.json` | Codex plugin manifest for the full bundle |
| `.agents/plugins/marketplace.json` | Codex marketplace registry entry |
| `.well-known/agent-skills/index.json` | Agent Skills discovery v0.2.0, served from relintio.com |

The `.well-known` index is generated, not hand-edited — `node scripts/build-index.mjs`. It carries a SHA-256 digest per skill, so it must be regenerated whenever a `SKILL.md` changes or `npx skills add relintio.com` will reject the entry.

## Contributing

1. Each skill needs `SKILL.md` with YAML frontmatter carrying `name`, `description` and `license`.
2. `name` must equal the directory name. The validator enforces this.
3. Place it under the category that fits: `core/`, `runtimes/`, or `operations/`.
4. Skill names use the `relintio-` prefix. The router is the one exception — it is just `relintio`.
5. Add it to `.claude-plugin/marketplace.json` under the matching plugin group, in the same commit.
6. Regenerate the discovery index.
7. Run `node scripts/validate.mjs`.

## Writing a skill

The `description` is the routing signal. It is the only thing an agent sees before deciding whether to load the skill, so it must say **when to use this**, not what the product does. Name the symptoms and the file names that would make this the right skill.

Keep the body to what an agent cannot infer. Ordering constraints, the exact registration point, the failure that looks like success. Skip anything a competent agent already knows about the framework.

Every skill ends on verification. An install that has not been confirmed against the control plane is not an install, and a skill that stops before that step has taught the agent to report success early.

## The invariants

These appear in every skill because each is a way an install ends up looking finished while protecting nothing.

- The license key never reaches source control, a log, or a prompt.
- Register before the application's routes.
- Fail open on infrastructure failure; preserve valid local block decisions.
- `https://api.relintio.com/v1` is canonical; `https://relintio.com/api` is compatibility-only.
- Exclude health checks and webhooks explicitly, never by lowering protection globally.
- Never carve out login, registration, checkout or password reset.
- Observe before enforcing.
- Never invent a package name, version, import or repository URL.
