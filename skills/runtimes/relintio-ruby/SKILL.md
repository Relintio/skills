---
name: relintio-ruby
description: Install and register the Relintio agent in a Ruby application. Use for Rack middleware in config.ru, Rails middleware insertion order, Puma forking and worker boot, Sinatra pitfalls, and the relintio-agent gem.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "ruby"
---

# Ruby

Gem: `relintio-agent` · Ruby 3.0+ · [quickstart](https://relintio.com/docs/quickstart/ruby)

## Install

```bash
bundle add relintio-agent
```

## Register — Rack

`config.ru`, above everything else:

```ruby
require "relintio-agent"

use Relintio::Middleware,
    license_key: ENV.fetch("UP_LICENSE_KEY"),
    api_url:     ENV.fetch("UP_API_URL")

run App
```

## Register — Rails

In `config/application.rb`:

```ruby
config.middleware.insert_before 0, Relintio::Middleware,
  license_key: ENV.fetch("UP_LICENSE_KEY"),
  api_url:     ENV.fetch("UP_API_URL")
```

`insert_before 0` puts it at the very top of the stack — ahead of `ActionDispatch::HostAuthorization` and the rest. That is the point.

## Gotchas

**`ENV.fetch` without a default raises at boot.** Keep it that way. An agent running without a license key looks installed and protects nothing.

**Puma forks.** The agent's sync thread must start in the worker, not the parent. If you see the policy never refreshing under clustered Puma, move initialization into `on_worker_boot`.

**Sidekiq and rake tasks are not HTTP.** Nothing to protect; do not load the agent there.

**Sinatra apps that `run!` inside the app file** never reach `config.ru`. Use the Rack form in a proper `config.ru` instead.

**Check for an existing install:** `grep -n relintio Gemfile Gemfile.lock`.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
