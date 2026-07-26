---
name: relintio-wordpress
description: Install the Relintio plugin on a WordPress site. Use for the license-bound plugin zip from the dashboard, wp-config.php constant placement, mu-plugins loading order, the private update channel, and the wp-cron, REST and admin-ajax exclusions that cause false positives.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "wordpress"
---

# WordPress

Distribution: Relintio-hosted plugin zip · [quickstart](https://relintio.com/docs/quickstart/wordpress)

## Read this first

The plugin is **not on the WordPress.org directory** and is not installed with `composer require`. It is a license-bound package generated in the dashboard. Do not invent a slug, a repository URL, or a `wp plugin install relintio` command — none of them exist.

## Install

1. Dashboard → Deployment → generate the WordPress package for the license.
2. Upload it:

```bash
wp plugin install ./relintio-agent.zip --activate
```

Or Plugins → Add New → Upload Plugin in wp-admin.

3. Enter the license key on the plugin's settings screen, or define it in `wp-config.php` **above** the `/* That's all, stop editing! */` line:

```php
define('UP_LICENSE_KEY', 'UP_LIVE_…');
define('UP_API_URL', 'https://api.relintio.com/v1');
```

## Must-use placement

For a site with many plugins, dropping the loader in `wp-content/mu-plugins/` makes it load before all of them. Worth doing when plugin order is causing the agent to miss requests.

## Updates

Updates come from the private channel (`/wp/plugin/update-check`), not WordPress.org. They appear in the normal Plugins screen once the license is registered. Do not disable the update check to silence a notice.

## Gotchas

**`wp-config.php` constants must be above the "stop editing" line.** Below it, WordPress has already bootstrapped and the constant arrives too late.

**Exclude `wp-cron.php`, the REST API routes your integrations call, and `admin-ajax.php` if a machine calls it.** These are the classic false positives on a WordPress install.

**Object caching and page caching sit in front of PHP.** A fully cached page never reaches the agent. That is usually fine — cached pages carry no user data — but it means your traffic numbers will not match the CDN's.

**Do not also install a Node or PHP agent on the same site.** One agent per request path.

**Check for an existing install:** `wp plugin list | grep -i relintio`.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
