---
name: relintio-angular
description: Add the Relintio agent to an Angular 16+ application. Use for provideRelintio, the functional HttpClient interceptor, the challenge component, and the publishable key versus the licence key.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "angular"
---

# Angular

Package: `@relintio/angular-agent` on npm · [quickstart](https://relintio.com/docs/quickstart/angular)

Injectable service and HttpInterceptor for Angular 16+.

## Install

```bash
npm install @relintio/angular-agent
```

## Register

Angular 16 or newer, because this uses signals and `DestroyRef`.

```ts
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRelintio, relintioInterceptor } from '@relintio/angular-agent';

bootstrapApplication(AppComponent, {
  providers: [
    provideRelintio({ publishableKey: environment.relintioPublishableKey }),
    provideHttpClient(withInterceptors([relintioInterceptor])),
  ],
});
```

## The key problem

The field is `publishableKey` and it takes a **publishable key** (`pk_live_…`). It is public by design and can do exactly one thing: ask Relintio for a verdict. It cannot read your policy, write telemetry, or mint a challenge pass.

A **licence key** (`UP_LIVE_…`) is the HMAC key that signs challenge passports and request signatures. Anyone holding it can walk through the WAF it belongs to. Anything a bundler inlines is public, so a licence key in a `VITE_`, `PUBLIC_` or `NEXT_PUBLIC_` variable is a published credential. If one is already there, rotate it in Dashboard → API keys before replacing it.

The agent refuses to start on anything that does not begin `pk_`, logs an error, and never transmits it. That check is the last line, not the plan.

## Gotchas

**The interceptor must go through `withInterceptors`.** The class-based `HTTP_INTERCEPTORS` token does not see functional interceptors, and an interceptor nobody registers is one that silently never runs.

**Requests made with `fetch` directly do not pass through `HttpClient`.** An API client that bypasses `HttpClient` is one this does not protect.

**State is a signal**, so templates update without a subscription. Read it from `RelintioService`.

**Angular sanitises an iframe `src` bound with `[src]`.** Bind through `DomSanitizer.bypassSecurityTrustResourceUrl` if your build strips it — the URL comes from the platform, and the agent has already refused anything that is not `http` or `https`.

**Check for an existing install:** `grep -n '@relintio/angular-agent' package.json`.

## Fails open, everywhere

An unreachable control plane, a rules fetch that times out, a fault inside the agent — every path releases the request. A security agent that stops a page because it could not do its job has turned our outage into the customer's, which is a worse failure than the one it was guarding against.

Never gate rendering, routing or a response on the agent. If it cannot initialise, the application must still work.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the licence resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — read the body, not the status. Then exercise one protected route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
