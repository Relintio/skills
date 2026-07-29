---
name: relintio-nuxt
description: Add the Relintio module to a Nuxt 3 or 4 application. Use for the two-key model — a licence key on Nitro and a publishable key in the browser — the challenge overlay, and why runtimeConfig makes swapping them a published credential.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "nuxt"
---

# Nuxt

Package: `@relintio/nuxt` on npm · [quickstart](https://relintio.com/docs/quickstart/nuxt)

Nuxt 3 module: server middleware and the client plugin together.

## Install

```bash
npm install @relintio/nuxt
```

## Register

Nuxt is two runtimes and this module takes **two keys**. `runtimeConfig` has a private half and a `public` half that is serialised into the HTML of every page; one key feeding both would publish the licence key in the page source of every site that installed it.

```bash
npx nuxi module add @relintio/nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@relintio/nuxt'],
  relintio: {
    licenseKey: process.env.RELINTIO_LICENSE_KEY,        // UP_LIVE_…  server only
    publishableKey: process.env.RELINTIO_PUBLISHABLE_KEY, // pk_live_…  reaches the browser
  },
});
```

## The key problem

This runs on your server, so it takes a **licence key** (`UP_LIVE_…`). That key signs challenge passports and request signatures — keep it in the environment or a platform secret store, never in a bundle a browser can fetch.

If the front end also needs protection, that half takes a **publishable key** (`pk_live_…`) instead. The two are not interchangeable, and swapping them fails in a way that looks like the challenge simply not working: a publishable key cannot sign a passport, so every visitor is challenged again on every request with nothing in any log explaining it.

## Gotchas

**The module throws at build time if the keys are swapped.** A `publishableKey` beginning `UP_` and a `licenseKey` beginning `pk_` are both refused — the first would be serialised into every page, and the second could not sign anything.

**With no `relintio` block at all** the module reads `RELINTIO_LICENSE_KEY` and `RELINTIO_PUBLISHABLE_KEY` from the environment, which is what most deployments want.

**Set only one key** and the other half is skipped with a warning rather than half-installed.

**The Nitro middleware runs on every request**, not on a list of routes someone remembered to add.

**Check for an existing install:** `grep -n '@relintio/nuxt' nuxt.config.ts package.json`.

## Fails open, everywhere

An unreachable control plane, a rules fetch that times out, a fault inside the agent — every path releases the request. A security agent that stops a page because it could not do its job has turned our outage into the customer's, which is a worse failure than the one it was guarding against.

Never gate rendering, routing or a response on the agent. If it cannot initialise, the application must still work.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the licence resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — read the body, not the status. Then exercise one protected route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
