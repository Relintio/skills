---
name: relintio-shopify
description: Connect a Shopify store to Relintio. Use for the dashboard OAuth connection and storefront ScriptTag, why there is nothing to install from the command line, the checkout boundary, and theme changes that strip the ScriptTag.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "shopify"
---

# Shopify

Integration: OAuth connection plus a storefront ScriptTag · [quickstart](https://relintio.com/docs/shopify)

## Read this first

There is **nothing to install from the command line**. Shopify is connected from the Relintio dashboard: you authorize the app, and Relintio installs a ScriptTag on the storefront. Do not add a package, do not edit theme liquid by hand, and do not invent an npm module for it.

Like React, the storefront agent is a client-side companion. It receives an immediate `allow` / `challenge` / `block` decision from the control plane rather than a downloadable ruleset. If the store has a custom backend or a Shopify app with its own server, protect that server separately.

## Connect

1. Dashboard → Integrations → Shopify.
2. Authorize the store. Relintio installs the ScriptTag.
3. Confirm the store appears with a recent check-in.

## Gotchas

**Checkout is Shopify's, not yours.** Shopify Plus aside, you cannot inject into checkout. Protection covers the storefront up to that boundary.

**Theme editors and app embeds can strip ScriptTags.** After a theme change, re-check the integration status.

**Consent-mode and cookie banners can defer script execution.** If check-ins stop after a privacy plugin is added, that is where to look first.

**Do not remove the ScriptTag manually.** Disconnect from the dashboard so the control plane knows.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
