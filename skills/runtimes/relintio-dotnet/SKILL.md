---
name: relintio-dotnet
description: Install and register the Relintio agent in an ASP.NET Core application. Use for UseRelintio placement relative to UseRouting and authentication, minimal APIs, configuration from User Secrets or environment, and the Relintio.Agent NuGet package.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "dotnet"
---

# .NET

Package: `Relintio.Agent` · .NET 8+ · [quickstart](https://relintio.com/docs/quickstart/dotnet)

## Install

```bash
dotnet add package Relintio.Agent
```

## Register — ASP.NET Core

`Program.cs`, before `UseRouting` and before authentication:

```csharp
using Relintio.Agent;

var app = builder.Build();

app.UseRelintio();

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

Configuration comes from `UP_LICENSE_KEY` and `UP_API_URL`, or explicitly:

```csharp
app.UseRelintio(options =>
{
    options.LicenseKey = builder.Configuration["UP_LICENSE_KEY"];
    options.ApiUrl = builder.Configuration["UP_API_URL"];
});
```

## Gotchas

**Middleware order in ASP.NET Core is the order you write it.** `UseRelintio()` after `UseRouting()` still runs — but after endpoint selection, which is later than you want.

**`UseExceptionHandler` and `UseHsts` can go above it.** Anything that touches the request body or the user should go below.

**User Secrets in development, environment variables in production.** Never `appsettings.json` — it ships.

**Minimal APIs work the same way.** `app.UseRelintio()` before the first `app.MapGet`.

**Check for an existing install:** `grep -rn 'Relintio.Agent' --include=*.csproj .`

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
