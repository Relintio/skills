---
name: relintio-vercel
description: Add Relintio to a Vercel project as edge middleware. Use for middleware.js placement, the matcher, composing with existing middleware, environment variables, and what per-isolate caching means for rules and rate limits.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "vercel"
---

# Vercel

Package: `@relintio/vercel` on npm · [quickstart](https://relintio.com/docs/quickstart/vercel)

Edge middleware that runs before your app, at Vercel’s edge.

## Install

```bash
npm install @relintio/vercel
```

## Register

Middleware is the only place on Vercel where a request can be refused before it costs anything. A check inside a route handler has already paid for the invocation, the cold start, and whatever the handler read before it decided.

```js
// middleware.js — project root, beside app/ or pages/, not inside it
import { relintio } from '@relintio/vercel';

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};

export default relintio();
```

If middleware already exists, wrap it rather than replacing it:

```js
import { withRelintio } from '@relintio/vercel';

export default withRelintio(async (request) => NextResponse.next());
```

## The key problem

This runs on your server, so it takes a **licence key** (`UP_LIVE_…`). That key signs challenge passports and request signatures — keep it in the environment or a platform secret store, never in a bundle a browser can fetch.

If the front end also needs protection, that half takes a **publishable key** (`pk_live_…`) instead. The two are not interchangeable, and swapping them fails in a way that looks like the challenge simply not working: a publishable key cannot sign a passport, so every visitor is challenged again on every request with nothing in any log explaining it.

## Gotchas

**Relintio runs first.** Composed the other way round, the existing middleware would have already redirected, rewritten, or read a feature flag from a database on behalf of a request we were about to block.

**`config.matcher` is the better exclusion.** A path excluded there never invokes the middleware and never costs anything; `exceptPaths` still pays for the invocation.

**The ruleset cache and the rate-limit bucket are per isolate.** A rule changed in the dashboard takes effect within a minute per isolate, and traffic spread across ten isolates gets ten rate-limit buckets — edge rate limiting is a coarse backstop, and the enforcing limiter is the one at the origin.

**Add `RELINTIO_LICENSE_KEY` in Project → Settings → Environment Variables.** A deployment without it runs unprotected and says so only in the function log.

**Check for an existing install:** `grep -rn '@relintio/vercel' middleware.js middleware.ts package.json`.

## Fails open, everywhere

An unreachable control plane, a rules fetch that times out, a fault inside the agent — every path releases the request. A security agent that stops a page because it could not do its job has turned our outage into the customer's, which is a worse failure than the one it was guarding against.

Never gate rendering, routing or a response on the agent. If it cannot initialise, the application must still work.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the licence resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — read the body, not the status. Then exercise one protected route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
