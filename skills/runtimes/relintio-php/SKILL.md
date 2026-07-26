---
name: relintio-php
description: Install and register the Relintio agent in a PHP or Laravel application. Use for front-controller placement, auto_prepend_file, Laravel global middleware ordering, config caching and env() pitfalls, OPcache reloads, and webhook path exclusions. Covers the relintio-agent/agent Composer package.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "php"
---

# PHP and Laravel

Package: `relintio-agent/agent` · PHP 7.4+ · [quickstart](https://relintio.com/docs/quickstart/php)

## Install

```bash
composer require relintio-agent/agent
```

## Register — front controller

The earliest safe point, immediately after the autoloader and before the framework boots.

```php
require __DIR__ . '/../vendor/autoload.php';

\Relintio\Agent::protect([
    'license_key' => getenv('UP_LICENSE_KEY'),
    'api_url'     => getenv('UP_API_URL'),
]);
```

In Laravel that is `public/index.php`, above `$app = require_once __DIR__.'/../bootstrap/app.php';`.

## Register — auto_prepend_file

Zero application changes. Point PHP at a small bootstrap that calls `protect()`:

```ini
; php.ini or a pool config
auto_prepend_file = /var/www/relintio-bootstrap.php
```

This covers every entry point in the vhost, including legacy scripts that never go through a front controller. It is the right choice for a WordPress-adjacent or multi-app document root.

## Laravel specifics

If you prefer a middleware over the front controller, register it **globally** in `bootstrap/app.php` and put it first — before `TrustProxies`, before `HandleCors`, before everything. A route middleware runs after routing has already happened, which is too late.

Configuration belongs in `config/services.php` and comes from the environment:

```php
'relintio' => [
    'license_key' => env('UP_LICENSE_KEY'),
    'api_url'     => env('UP_API_URL', 'https://api.relintio.com/v1'),
],
```

Then `php artisan config:cache` on deploy — and remember that `env()` returns `null` once the config is cached, so never call `env()` outside a config file.

## Gotchas

**OPcache holds the old bootstrap.** After changing `auto_prepend_file` or the front controller, reload PHP-FPM. A stale opcode cache will make you think the integration did not work.

**Queue workers are long-lived processes that never see HTTP.** Do not load the agent there, and do restart them after a deploy for unrelated reasons.

**`getenv()` may be disabled or empty under FPM** depending on `clear_env`. If the key comes back empty, check the pool config before blaming the agent.

**Exclude the webhook routes.** Stripe, payment callbacks, and any inbound POST from a machine will score as a bot. `UP_EXCEPT_PATHS=/webhooks/*,/api/callbacks/*` — narrow, explicit paths, never a global relaxation.

**Check for an existing install:** `grep -n relintio composer.json`.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
