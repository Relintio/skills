---
name: relintio-svelte
description: Add the Relintio agent to a Svelte or SvelteKit frontend. Use for the client factory in the root layout, the challenge action, SSR safety, teardown on navigation, and the publishable key versus the licence key.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "svelte"
---

# Svelte

Package: `@relintio/svelte-agent` on npm · [quickstart](https://relintio.com/docs/quickstart/svelte)

Svelte store and action for Svelte 4, 5 and SvelteKit.

## Install

```bash
npm install @relintio/svelte-agent
```

## Register

Create the client in the root layout. It is safe during SSR — on the server it is inert, because wrapping `fetch` there would wrap SvelteKit's own request plumbing:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createRelintio } from '@relintio/svelte-agent';

  const relintio = createRelintio({
    publishableKey: import.meta.env.VITE_RELINTIO_PUBLISHABLE_KEY,
    apiUrl: 'https://api.relintio.com/v1',
  });

  const { state, challengeFrame, frameAttrs } = relintio;
  onDestroy(() => relintio.destroy());
</script>

{#if $state.isChallenging}
  <iframe use:challengeFrame src={$state.challengeUrl} {...frameAttrs} />
{/if}

<slot />
```

## The key problem

The field is `publishableKey` and it takes a **publishable key** (`pk_live_…`). It is public by design and can do exactly one thing: ask Relintio for a verdict. It cannot read your policy, write telemetry, or mint a challenge pass.

A **licence key** (`UP_LIVE_…`) is the HMAC key that signs challenge passports and request signatures. Anyone holding it can walk through the WAF it belongs to. Anything a bundler inlines is public, so a licence key in a `VITE_`, `PUBLIC_` or `NEXT_PUBLIC_` variable is a published credential. If one is already there, rotate it in Dashboard → API keys before replacing it.

The agent refuses to start on anything that does not begin `pk_`, logs an error, and never transmits it. That check is the last line, not the plan.

## Gotchas

**`destroy()` matters more here than in a single-page React app.** SvelteKit unmounts the layout on a full navigation, and a client left running keeps a fetch wrapper and a challenge timer belonging to a page that is gone.

**No runtime dependency on Svelte.** The store shape is declared locally, so the same build works under Svelte 4 and 5.

**Content Security Policy:** `connect-src https://api.relintio.com` and `frame-src https://relintio.com`.

**Check for an existing install:** `grep -n '@relintio/svelte-agent' package.json`.

## Fails open, everywhere

An unreachable control plane, a rules fetch that times out, a fault inside the agent — every path releases the request. A security agent that stops a page because it could not do its job has turned our outage into the customer's, which is a worse failure than the one it was guarding against.

Never gate rendering, routing or a response on the agent. If it cannot initialise, the application must still work.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the licence resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — read the body, not the status. Then exercise one protected route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
