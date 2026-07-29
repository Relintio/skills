---
name: relintio-react
description: Add the Relintio agent to a React or Next.js frontend. Use for RelintioProvider placement, the fetch interceptor and challenge overlay, why a browser agent reacts to enforcement rather than performing it, and the publishable key versus the licence key.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "react"
---

# React

Package: `@relintio/react-agent` · React 16.8–19 · [quickstart](https://relintio.com/docs/quickstart/react)

## Read this first

The React agent **reacts to enforcement; it does not perform it**. Anything running in a browser is under the visitor's control, so the decision is never made there — it asks Relintio for a verdict, and when your own API answers `403` with `X-Relintio-Challenge` it opens the challenge and replays the request that was refused.

If this project has a backend, protect the backend. Install the React agent in addition, never instead.

Say this out loud to whoever asked. A team that believes their app is protected when only the client agent is installed is worse off than one that knows it is unprotected.

## Install

```bash
npm install @relintio/react-agent
```

## Register

At the app root, above everything that makes requests:

```jsx
import { RelintioProvider } from '@relintio/react-agent';

const config = {
  publishableKey: import.meta.env.VITE_RELINTIO_PUBLISHABLE_KEY, // pk_live_…
  apiUrl: 'https://api.relintio.com/v1',
};

export default function App({ children }) {
  return <RelintioProvider config={config}>{children}</RelintioProvider>;
}
```

## The key problem

Anything a bundler inlines is public. `VITE_`, `NEXT_PUBLIC_` and `REACT_APP_` prefixed values ship to every visitor in plain text.

The field is `publishableKey` and it takes a **publishable key** (`pk_live_…`). It is public by design and can do exactly one thing: ask Relintio for a verdict. It cannot read your policy, write telemetry, or mint a challenge pass.

A **licence key** (`UP_LIVE_…`) is the HMAC key that signs challenge passports and request signatures. Anyone holding it can walk through the WAF it belongs to. If you are about to paste one into a `NEXT_PUBLIC_` variable, stop — and if one is already there, rotate it in Dashboard → API keys before replacing it.

The provider refuses to start on anything that does not begin `pk_`, logs an error, and never transmits it. That check is the last line, not the plan.

## Gotchas

**Next.js:** the provider goes in a client component (`'use client'`). It does nothing in a server component. And a Next app has a server — protect it with the Node agent or the preload, per `relintio-node`.

**Do not gate rendering on the provider.** If the agent cannot initialize, the app must still render. Fail open applies to the client too.

**One provider.** Nesting two double-reports every request.

**Check for an existing install:** `grep -n '@relintio/react-agent' package.json`.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
