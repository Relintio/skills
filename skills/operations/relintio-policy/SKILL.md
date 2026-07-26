---
name: relintio-policy
description: Tune Relintio protection policy — risk score thresholds, response tiers, rate limits, path scoping, SEO safety, and the observe-then-enforce rollout. Use when legitimate traffic is being blocked or challenged, when bots are getting through, when choosing a starting preset, when excluding health checks or webhooks, or when deciding how aggressive to make enforcement.
license: MIT
metadata:
  version: "1.0.0"
  documentation: https://relintio.com/docs/security-layers
---

# Tune Relintio policy

Policy is not a switch. Every request gets an additive risk score, the score falls into a band, and the band picks a response. Tuning means moving the score of a class of traffic, or moving where the bands sit — not turning protection off for whoever complained loudest.

## How a decision is made

Signals add up. Each is cheap, individually weak, and meaningful in combination.

| Signal | Weight | What it means |
| --- | --- | --- |
| Empty User-Agent | +50 | No UA header at all |
| Short User-Agent | +25 | Under 20 characters |
| No Accept-Language | +20 | Browsers send one; scripts usually do not |
| Generic Accept | +15 | Wildcard `*/*` only |
| `Connection: close` | +10 | Non-persistent, typical of one-shot tooling |
| POST without Referer | +15 | Form submission with no origin |
| Rate burst | +35 | Token bucket exhausted |

The total lands in a band:

| Tier | Score | Response |
| --- | --- | --- |
| **ALLOW** | 0–39 | Proceeds normally |
| **SLOW** | 40–59 | Two-second delay — exhausts scanners, invisible to humans |
| **CHALLENGE** | 60–74 | Browser verification |
| **DECOY** | 75–84 | A fake maintenance page |
| **BLOCK** | 85–100 | Hard block with the configured response |

Rate limiting is a token bucket, not a fixed window: 8 tokens per second with a burst capacity of 24, with route-aware multipliers that give static assets more headroom and sensitive endpoints less. A fixed window lets an attacker send a full window's worth at the boundary and again immediately after; a bucket does not.

## Read the arithmetic before you change anything

A curl request with no `Accept-Language` and a generic `Accept` scores 20 + 15 = 35, which allows. Add a short User-Agent and it is 60 — a challenge. That is usually the whole explanation for "our monitoring broke."

Before touching a threshold, take a real blocked request from the dashboard event stream and add up its signals. If the score is correct and the traffic is legitimate, the fix is an exclusion, not a lower threshold. If the score is wrong, the fix is the threshold.

## Observe, then enforce

Never start at BLOCK. The sequence:

1. **Install and observe.** Default posture, a full day of real traffic — including whatever runs on a weekly cron, because that is the thing that will page you.
2. **Read the ALLOW band.** Raise `UP_ALLOW_SAMPLE_RATE` from `0.01` while tuning so you can actually see allowed traffic. Anything legitimate scoring above 40 needs attention now, not after you raise enforcement.
3. **Exclude the machines.** Health checks, inbound webhooks, server-to-server calls, uptime monitors. They score as bots because they are bots — yours.
4. **Then raise enforcement.** One band at a time, with a day between.

Lower it again the moment real users are affected. A policy that blocks customers is worse than one that lets a scanner through.

## Scoping

Narrow and explicit, always.

```dotenv
UP_EXCEPT_PATHS=/health,/healthz,/webhooks/*,/api/internal/*
```

```dotenv
UP_ONLY_PATHS=/login,/register,/checkout,/api/*
```

`UP_ONLY_PATHS` protects a subset and leaves everything else alone. That is the right shape when you are introducing Relintio to a large legacy app and want to start with the routes that matter.

Exact paths (`/health`) and prefixes (`/webhooks/*`) are supported; `UP_ONLY_REGEX` takes a JS-style regex source when the lists get unwieldy.

**Never exclude:** login, registration, password reset, checkout, payment, account settings, or any user-facing form. Those are the routes the protection exists for. If they produce false positives, tune the score — do not carve them out.

## Presets

The dashboard ships four starting policies. Review the exact diff before applying any of them; a preset is a starting point, not an answer.

| Preset | For | Watch for |
| --- | --- | --- |
| **Balanced Protection** | Most sites | The sensible default |
| **Maximum Compatibility** | Legacy clients, unusual integrations | Lets more through by design |
| **Under Active Attack** | Right now, during an incident | Will produce false positives; it is supposed to |
| **API & Webhook Workload** | Machine-heavy traffic | Assumes non-browser clients are normal |

"Under Active Attack" is a temporary posture. Set a reminder to come back off it.

## SEO safety

Keep it on for any public site. It verifies crawlers rather than trusting the User-Agent string, so Googlebot is not treated as a spoofed bot — and a spoofed Googlebot is not treated as Googlebot.

Turning it off on a public site is an SEO decision with revenue consequences. If someone asks for it, say so plainly and get an explicit yes.

## Behind a proxy

If every request appears to come from one IP, the agent is seeing the proxy, not the client, and rate limiting will fire on your own load balancer. Configure trusted forwarding headers and confirm the real client-IP chain **before** diagnosing anything else. Nearly every "Relintio is blocking everyone" report behind a CDN is this.

## Content protection

Enable only the modes compatible with the rendered output, and test authenticated, cached, and localized responses — not just the logged-out English homepage.

## Propagation

Policy changes saved in the dashboard reach agents on the next rule synchronization: a jittered 8–12 second interval. The health heartbeat is slower and is **not** proof that a revision landed. Check the reported policy revision, not the last check-in time.

## Report back

State the change you made, the class of traffic it affects, the score arithmetic that justified it, and what you expect to see in the dashboard afterwards. If you loosened anything, say exactly what is now unprotected.
