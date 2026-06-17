# PromptForge Worker

Thin [Cloudflare Worker](https://workers.cloudflare.com/) proxy in front of
[OpenRouter](https://openrouter.ai/). The GitHub Pages web build calls this so the
OpenRouter API key stays server-side and never reaches the browser.

## Deploy

```bash
cd worker
npm install
npx wrangler login                       # one-time, opens browser
npx wrangler secret put OPENROUTER_API_KEY   # paste your OpenRouter key
npm run deploy
```

Wrangler prints the deployed URL, e.g. `https://promptforge.<you>.workers.dev`.
Paste that into the PromptForge web app under **Settings → Backend URL** (or bake
it into the Pages build via the `VITE_BACKEND_URL` repo variable).

## Lock it to your site (recommended)

A public Worker with a `*` origin lets anyone use (and bill) your key. After your
Pages site is live, restrict it. In `wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGINS = "https://bouwles.github.io"
```

Then redeploy. Consider Cloudflare rate limiting / WAF rules too, since the
endpoint is public.

## Endpoints

| Method | Path            | Purpose                                  |
|--------|-----------------|------------------------------------------|
| GET    | `/api/models`   | List models (`{ ok, models }`)           |
| POST   | `/api/test`     | Connectivity + key check                 |
| POST   | `/api/generate` | Streamed completion (OpenAI-style SSE)   |

## Config

| Var               | Default       | Notes                                                        |
|-------------------|---------------|-------------------------------------------------------------|
| `OPENROUTER_API_KEY` | —          | **Secret.** `wrangler secret put OPENROUTER_API_KEY`        |
| `ALLOWED_ORIGINS` | `*`           | Comma list of allowed site origins                          |
| `ALLOWED_MODELS`  | (unset)       | Comma list to curate the dropdown instead of all OpenRouter |
| `APP_TITLE`       | `PromptForge` | Sent to OpenRouter as `X-Title`                              |
