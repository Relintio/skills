---
name: relintio-express
description: Add the Relintio agent to an Express application. Use for middleware placement before the body parser, path scoping, the onError reporter, and why the boundary fails open rather than answering 500.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "express"
---

# Express

Package: `@relintio/express` on npm · [quickstart](https://relintio.com/docs/quickstart/express)

One-line app.use() over the Node.js agent.

## Install

```bash
npm install @relintio/express
```

## Register

Mount it before your routes and before your body parser:

```js
import express from 'express';
import { relintio } from '@relintio/express';

const app = express();

app.use(relintio({
  licenseKey: process.env.RELINTIO_LICENSE_KEY,
  apiUrl: 'https://api.relintio.com/v1',
  exceptPaths: ['/health'],
  onError: (error, req) => reportToSentry(error, { url: req.originalUrl }),
}));

app.use(express.json());
```

## The key problem

This runs on your server, so it takes a **licence key** (`UP_LIVE_…`). That key signs challenge passports and request signatures — keep it in the environment or a platform secret store, never in a bundle a browser can fetch.

If the front end also needs protection, that half takes a **publishable key** (`pk_live_…`) instead. The two are not interchangeable, and swapping them fails in a way that looks like the challenge simply not working: a publishable key cannot sign a passport, so every visitor is challenged again on every request with nothing in any log explaining it.

## Gotchas

**Before the body parser.** Enforcement that runs after a body parser has already read a 40MB upload has let the request cost you what it was going to cost you.

**Mounting twice is safe.** The second mount passes the request straight through rather than assessing, logging and metering the same page view again.

**Set `onError` on day one.** The middleware fails open on every path including an unexpected fault: it calls `next()` with no error rather than `next(err)`, because Express answers 500 by default and a bug in the agent should not be an outage of yours. Without a reporter that fault is silent by design.

**This is the same engine as `@relintio/agent`.** Same licence key, same ruleset, same protocol — see `relintio-node` if the app is not Express.

**Check for an existing install:** `grep -n '@relintio/express\|@relintio/agent' package.json`.

## Fails open, everywhere

An unreachable control plane, a rules fetch that times out, a fault inside the agent — every path releases the request. A security agent that stops a page because it could not do its job has turned our outage into the customer's, which is a worse failure than the one it was guarding against.

Never gate rendering, routing or a response on the agent. If it cannot initialise, the application must still work.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the licence resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — read the body, not the status. Then exercise one protected route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
