---
name: relintio-expo
description: Add the Relintio agent to an Expo or React Native app. Use for the native client, the required domain option, the challenge WebView, why the device signals are smaller on native, and why an app binary may only carry a publishable key.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "expo"
---

# Expo

Package: `@relintio/expo-agent` on npm · [quickstart](https://relintio.com/docs/quickstart/expo)

React Native and Expo, with a native-safe device collector.

## Install

```bash
npx expo install @relintio/expo-agent react-native-webview
```

## Register

`domain` is required here and nowhere else. A browser agent reads `location.hostname` and knows which site it is protecting; a native app has no such thing, so without it the platform cannot match the request to a protected domain and every verdict comes back unmatched.

```ts
import { Platform } from 'react-native';
import { createRelintio } from '@relintio/expo-agent';

export const relintio = createRelintio({
  publishableKey: process.env.EXPO_PUBLIC_RELINTIO_KEY,
  domain: 'api.example.com',
  environment: { platform: Platform.OS, platformVersion: Platform.Version },
});
```

There is no `fetch` interception on native — patching the global `fetch` inside someone else's app is not a thing a dependency should do. Ask explicitly, before the request that matters:

```ts
const verdict = await relintio.verify();
if (verdict?.action === 'challenge' && verdict.challenge_url) {
  await relintio.challenge(verdict.challenge_url);
}
```

## The key problem

The field is `publishableKey` and it takes a **publishable key** (`pk_live_…`). It is public by design and can do exactly one thing: ask Relintio for a verdict. It cannot read your policy, write telemetry, or mint a challenge pass.

A **licence key** (`UP_LIVE_…`) is the HMAC key that signs challenge passports and request signatures. Anyone holding it can walk through the WAF it belongs to. Anything a bundler inlines is public, so a licence key in a `VITE_`, `PUBLIC_` or `NEXT_PUBLIC_` variable is a published credential. If one is already there, rotate it in Dashboard → API keys before replacing it.

The agent refuses to start on anything that does not begin `pk_`, logs an error, and never transmits it. That check is the last line, not the plan.

## Gotchas

**This key ships inside an app binary, which anyone can unpack.** That is exactly why it is a publishable key.

**The device signals are smaller on native and honestly so.** React Native has no canvas, no WebGL and no font enumeration; the SDK sends a truthful subset rather than shimming a browser, because a fingerprint that lies is worse than one that is short — the platform would score it against browser baselines it does not belong to.

**Mount the challenge `WebView` once, near the app root, above your navigator.** Inside a screen it disappears on navigation, and the challenge then rejects on timeout with the visitor never having seen it.

**The WebView is `incognito` on purpose.** A challenge is an identity check, and one that reuses cookies from the last check is checking the cookie.

**Check for an existing install:** `grep -n '@relintio/expo-agent' package.json`.

## Fails open, everywhere

An unreachable control plane, a rules fetch that times out, a fault inside the agent — every path releases the request. A security agent that stops a page because it could not do its job has turned our outage into the customer's, which is a worse failure than the one it was guarding against.

Never gate rendering, routing or a response on the agent. If it cannot initialise, the application must still work.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the licence resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — read the body, not the status. Then exercise one protected route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
