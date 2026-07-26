---
name: relintio-react
description: Add the Relintio client companion to a React or Next.js frontend. Use for RelintioProvider placement, why a client agent reports but cannot enforce, the client-safe key versus the server license key, and why a bundler-inlined key must never be the server key.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "react"
---

# React

Package: `@relintio/react-agent` · React 16.8–19 · [quickstart](https://relintio.com/docs/quickstart/react)

## Read this first

The React agent is a **companion, not protection**. It collects client-side signals and reports them; it cannot enforce a policy, because anything running in the browser is under the visitor's control. If this project has a backend, protect the backend. Install the React agent in addition, never instead.

Say this out loud to whoever asked. A team that believes their app is protected when only the client agent is installed is worse off than one that knows it is unprotected.

## Install

```bash
npm install @relintio/react-agent
```

## Register

At the app root, above everything that makes requests:

```jsx
import { RelintioProvider } from '@relintio/react-agent';

export default function App({ children }) {
  return (
    <RelintioProvider licenseKey={import.meta.env.VITE_UP_LICENSE_KEY}>
      {children}
    </RelintioProvider>
  );
}
```

## The key problem

Anything a bundler inlines is public. `VITE_`, `NEXT_PUBLIC_`, and `REACT_APP_` prefixed values ship to every visitor in plain text.

Use the **client-safe** key generated for browser agents in the dashboard — not the server license key. If you are about to paste a `UP_LIVE_…` server key into a `NEXT_PUBLIC_` variable, stop. That key belongs on the server only.

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
