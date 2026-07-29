---
name: relintio-firebase
description: Add Relintio to Firebase Cloud Functions. Use for wrapping an onRequest handler, declaring the secret, sharing one agent across exports, and why this uses the Node engine rather than the edge one.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "firebase"
---

# Firebase

Package: `@relintio/firebase` on npm · [quickstart](https://relintio.com/docs/quickstart/firebase)

A wrapper for Cloud Functions and Firebase Hosting rewrites.

## Install

```bash
npm install @relintio/firebase
```

## Register

Not the edge engine, despite sitting beside Vercel and Supabase in the docs. Cloud Functions run full Node and `onRequest` hands the handler an Express request and response, so this wraps `@relintio/agent` — the same server engine as a Node or Express install.

```js
const { onRequest } = require('firebase-functions/v2/https');
const { createAgent, withRelintio } = require('@relintio/firebase');

const agent = createAgent();

exports.api = onRequest(
  { secrets: ['RELINTIO_LICENSE_KEY'] },
  withRelintio(async (req, res) => { res.send('protected'); }, { agent }),
);
```

```bash
firebase functions:secrets:set RELINTIO_LICENSE_KEY
firebase deploy --only functions
```

## The key problem

This runs on your server, so it takes a **licence key** (`UP_LIVE_…`). That key signs challenge passports and request signatures — keep it in the environment or a platform secret store, never in a bundle a browser can fetch.

If the front end also needs protection, that half takes a **publishable key** (`pk_live_…`) instead. The two are not interchangeable, and swapping them fails in a way that looks like the challenge simply not working: a publishable key cannot sign a passport, so every visitor is challenged again on every request with nothing in any log explaining it.

## Gotchas

**The `secrets` array is what makes the value available at runtime.** Without it the function deploys and runs unprotected, because the wrapper throws on a missing key only when the first request arrives.

**Build the agent once and share it across exports.** A deployment usually exports more than one function, and an agent per export means a ruleset fetch per export and a separate set of rate-limit buckets per export — which is to say a rate limit that counts wrong.

**Install in the `functions/` directory**, not the repository root. That is the `package.json` Firebase deploys.

**It fails open on every path**, including an unexpected fault: the request is released and the handler runs rather than the function answering 500. Pass `onError` to see what was swallowed.

**Check for an existing install:** `grep -n '@relintio/firebase' functions/package.json`.

## Fails open, everywhere

An unreachable control plane, a rules fetch that times out, a fault inside the agent — every path releases the request. A security agent that stops a page because it could not do its job has turned our outage into the customer's, which is a worse failure than the one it was guarding against.

Never gate rendering, routing or a response on the agent. If it cannot initialise, the application must still work.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the licence resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — read the body, not the status. Then exercise one protected route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
