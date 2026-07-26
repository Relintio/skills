---
name: relintio-python
description: Install and register the Relintio agent in a Python application. Use for FastAPI and Starlette ASGI wrapping, Django middleware ordering, the sitecustomize zero-code hook, Gunicorn and Uvicorn worker pitfalls, and the relintio-agent package. Covers pip, poetry and uv.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "python"
---

# Python

Package: `relintio-agent` · Python 3.10+ · [quickstart](https://relintio.com/docs/quickstart/python)

## Install

Match the project's tooling — read the lockfile first.

```bash
pip install relintio-agent      # requirements.txt
poetry add relintio-agent       # poetry.lock or [tool.poetry]
uv add relintio-agent           # uv.lock
```

## Register — ASGI

Wrap the application object. This is the outermost layer: the agent must see the request before the framework routes it.

```python
import os
from relintio_agent.asgi import RelintioMiddleware

app = RelintioMiddleware(
    app,
    license_key=os.environ["UP_LICENSE_KEY"],
    api_url=os.environ["UP_API_URL"],
)
```

FastAPI and Starlette both work this way. Wrap **after** the app is fully constructed and all routers are included, so the wrapper is the last thing applied and therefore the first thing to run.

## Register — zero-code

The package ships a `sitecustomize` hook. With it on the path, the agent installs itself at interpreter start, no application change required. Use this for Django, WSGI apps, and anything where wrapping the app object is awkward.

## Gotchas

**Do not wrap inside `if __name__ == "__main__"`.** Under Gunicorn or Uvicorn workers that block never runs, and the agent never loads.

**Django's `MIDDLEWARE` list is ordered outermost-first.** If you go the middleware route rather than the ASGI wrapper, Relintio belongs at the top — above `SecurityMiddleware`.

**Celery workers and management commands are not HTTP.** There is nothing to protect there; do not load the agent into them.

**`os.environ[...]` raises on a missing key, which is what you want at boot.** Do not soften it to `os.environ.get(...)` with a `None` default — an agent silently running without a license key looks installed and protects nothing.

**Check for an existing install:** `grep -rn 'relintio' requirements.txt pyproject.toml Pipfile 2>/dev/null`.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
