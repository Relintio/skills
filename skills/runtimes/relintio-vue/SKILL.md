---
name: relintio-vue
description: Add the Relintio agent to a Vue 3 or Vite frontend. Use for plugin registration, the challenge overlay composable, Content Security Policy, and the publishable key versus the licence key.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "vue"
---

# Vue

Package: `@relintio/vue-agent` on npm · [quickstart](https://relintio.com/docs/quickstart/vue)

Vue 3 plugin and composable, for Vite or any bundler.

## Install

```bash
npm install @relintio/vue-agent
```

## Register

Register the plugin at the app root, above anything that makes requests:

```ts
// src/main.ts
import { createApp } from 'vue';
import { relintio } from '@relintio/vue-agent';
import App from './App.vue';

createApp(App)
  .use(relintio, {
    publishableKey: import.meta.env.VITE_RELINTIO_PUBLISHABLE_KEY,
    apiUrl: 'https://api.relintio.com/v1',
  })
  .mount('#app');
```

Then render the challenge somewhere your layout allows an overlay:

```vue
<script setup lang="ts">
import { useRelintioChallenge } from '@relintio/vue-agent';

const { state, frame, attrs } = useRelintioChallenge();
</script>

<template>
  <iframe v-if="state.isChallenging" ref="frame" :src="state.challengeUrl" v-bind="attrs" />
  <RouterView />
</template>
```

## The key problem

The field is `publishableKey` and it takes a **publishable key** (`pk_live_…`). It is public by design and can do exactly one thing: ask Relintio for a verdict. It cannot read your policy, write telemetry, or mint a challenge pass.

A **licence key** (`UP_LIVE_…`) is the HMAC key that signs challenge passports and request signatures. Anyone holding it can walk through the WAF it belongs to. Anything a bundler inlines is public, so a licence key in a `VITE_`, `PUBLIC_` or `NEXT_PUBLIC_` variable is a published credential. If one is already there, rotate it in Dashboard → API keys before replacing it.

The agent refuses to start on anything that does not begin `pk_`, logs an error, and never transmits it. That check is the last line, not the plan.

## Gotchas

**One plugin registration.** Registering twice double-reports every page view.

**The overlay is yours to style.** The composable hands back state, a template ref and the required iframe attributes; it does not inject a fixed-position element into the layout.

**Content Security Policy.** `connect-src` needs `https://api.relintio.com` — the scheme and host alone, because a CSP source carrying a path matches that one path and nothing under it — and `frame-src` needs `https://relintio.com`. Block the second and the overlay renders as an empty rectangle: the challenge never posts back and the held request stays pending for the full 120-second timeout.

**Check for an existing install:** `grep -n '@relintio/vue-agent' package.json`.

## Fails open, everywhere

An unreachable control plane, a rules fetch that times out, a fault inside the agent — every path releases the request. A security agent that stops a page because it could not do its job has turned our outage into the customer's, which is a worse failure than the one it was guarding against.

Never gate rendering, routing or a response on the agent. If it cannot initialise, the application must still work.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the licence resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — read the body, not the status. Then exercise one protected route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
