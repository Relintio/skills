---
name: relintio-node
description: Install and register the Relintio agent in a Node.js application. Use for Express middleware ordering, the zero-code NODE_OPTIONS preload, Fastify/Koa/Hapi/raw http servers, Next.js API routes, serverless caveats, and the @relintio/agent package options. Covers npm, pnpm, yarn and bun.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "node"
---

# Node.js

Package: `@relintio/agent` · Node 18+ · [quickstart](https://relintio.com/docs/quickstart/node)

## Install

Use the project's own package manager — read the lockfile, do not assume npm.

```bash
npm install @relintio/agent      # package-lock.json
pnpm add @relintio/agent         # pnpm-lock.yaml
yarn add @relintio/agent         # yarn.lock
bun add @relintio/agent          # bun.lockb
```

`express` is an optional peer dependency (`>=4.21.2`). The package is ESM with `exports` for `.`, `./express`, and `./preload`.

## Register — Express

Before every other `app.use`, and before the router.

```js
import express from 'express';
import { ultimateProtectorExpress } from '@relintio/agent/express';

const app = express();

app.use(ultimateProtectorExpress({
  licenseKey: process.env.UP_LICENSE_KEY,
  apiUrl: process.env.UP_API_URL,
}));

// …your middleware and routes below this line
```

CommonJS:

```js
const { ultimateProtectorExpress } = require('@relintio/agent/express');
```

## Register — zero-code preload

For anything that is not Express, or when you would rather not touch application source at all. The agent wraps Node's HTTP request listener on boot.

```bash
export UP_LICENSE_KEY='UP_LIVE_…'
export UP_API_URL='https://api.relintio.com/v1'
export NODE_OPTIONS='--require @relintio/agent/preload'

node server.js
```

This works for Fastify, Koa, Hapi, raw `http.createServer`, and anything else that ends up at Node's HTTP server. Put the `NODE_OPTIONS` line in the process manager or container definition, not in application code.

## Options

Every environment variable has a constructor equivalent. Prefer the environment; use the constructor when one process serves two licenses.

| Option | Type | Default |
| --- | --- | --- |
| `licenseKey` | string | required |
| `apiUrl` | string | required |
| `syncIntervalSeconds` | number | `10` |
| `allowSampleRate` | number | `0.01` |
| `onlyPaths` | string[] | — |
| `exceptPaths` | string[] | — |
| `onlyRegex` | string | — |
| `rateLimitPerMinute` | number | `120` (`0` disables) |
| `enforceTlsMinVersion` | boolean | `true` |

## Gotchas

**Next.js API routes and app-router handlers are not Express.** Use the preload, or protect the reverse proxy in front of Next. Adding the Express middleware to a Next project silently protects nothing.

**Serverless has no long-lived process.** A function that cold-starts on every request cannot maintain the policy cache, and each invocation will pay a synchronization round trip. Protect the edge or the origin instead.

**Register before `express.static`.** Static asset requests are traffic too, and a scanner walking your `/uploads` directory should be scored.

**Do not wrap the agent in a try/catch that swallows and continues.** It already fails open internally. A second layer hides real configuration errors.

**Check for an existing install before adding one.** `grep -r '@relintio/agent' --include=package.json .` — two agents on one request path double-count risk.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
