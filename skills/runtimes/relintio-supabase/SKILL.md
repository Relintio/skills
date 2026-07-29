---
name: relintio-supabase
description: Add Relintio to a Supabase Edge Function. Use for the jsr: import, wrapping the Deno handler, setting the licence key as a Supabase secret, and identifying the visitor behind the Supabase proxy.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "supabase"
---

# Supabase

Package: `@relintio/supabase` on JSR · [quickstart](https://relintio.com/docs/quickstart/supabase)

A guard for Supabase Edge Functions, on Deno.

## Install

```bash
import { withRelintio } from 'jsr:@relintio/supabase';
```

## Register

Supabase Edge Functions are Deno. Wrap the handler rather than checking inside it — a function that decides after it has already opened a database connection has paid for the request it was about to refuse.

```ts
// supabase/functions/orders/index.ts
import { withRelintio } from 'jsr:@relintio/supabase';

Deno.serve(withRelintio(async (request) => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}));
```

```bash
supabase secrets set RELINTIO_LICENSE_KEY=UP_LIVE_...
supabase functions deploy orders
```

## The key problem

This runs on your server, so it takes a **licence key** (`UP_LIVE_…`). That key signs challenge passports and request signatures — keep it in the environment or a platform secret store, never in a bundle a browser can fetch.

If the front end also needs protection, that half takes a **publishable key** (`pk_live_…`) instead. The two are not interchangeable, and swapping them fails in a way that looks like the challenge simply not working: a publishable key cannot sign a passport, so every visitor is challenged again on every request with nothing in any log explaining it.

## Gotchas

**A `jsr:` specifier, not npm.** Deno resolves JSR natively; there is no install step and no import map entry to add.

**A key in the function source is a key in the repository.** Use a Supabase secret.

**The visitor is the first hop of `x-forwarded-for`.** `Deno.serve` also passes connection info, but behind Supabase's own proxy that address is the proxy — blocking on it would ban every visitor behind it.

**Deno has no `waitUntil`.** A telemetry report is raced against the isolate, so a function about to be evicted may lose one. Losing a sampled allow is noise; blocks and challenges are never sampled.

**Check for an existing install:** `grep -rn '@relintio/supabase' supabase/functions/`.

## Fails open, everywhere

An unreachable control plane, a rules fetch that times out, a fault inside the agent — every path releases the request. A security agent that stops a page because it could not do its job has turned our outage into the customer's, which is a worse failure than the one it was guarding against.

Never gate rendering, routing or a response on the agent. If it cannot initialise, the application must still work.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the licence resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — read the body, not the status. Then exercise one protected route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
