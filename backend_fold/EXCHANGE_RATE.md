Exchange Rate: env variables and usage
=====================================

Purpose
-------
Provides guidance for the production-safe exchange rate service used by the backend.

Important env variables
-----------------------
- `USD_NGN_RATE` (optional admin override): If set and > 0 this value is used as the authoritative USD→NGN rate. Example: `USD_NGN_RATE=1550`
- `EXCHANGE_RATE_TTL_SECONDS` (optional): Cache TTL in seconds (default: `3600`). Example: `EXCHANGE_RATE_TTL_SECONDS=3600`
- `EXCHANGE_RATE_BG_REFRESH` (optional): `true`/`false` to enable background refresh (default: `true`).
- `HARD_FALLBACK_RATE` (optional): Numeric fallback USD→NGN rate used when everything else fails (default: `1500`).

Notes & recommendations
-----------------------
- Admin override wins: set `USD_NGN_RATE` when you want full control (e.g., to handle local FX realities).
- The service prefers cached values and uses a timeouted external API call as a best-effort.
- If the API fails and there's no cache or admin override, `HARD_FALLBACK_RATE` is used to avoid crashes.
- Background refresh warms the cache on boot and refreshes periodically; you can disable it with `EXCHANGE_RATE_BG_REFRESH=false`.

Usage (code)
------------
Require the helpers where needed:

const { getRate, usdToNgn, ngnToUsd } = require('./services/exchangeRate')

Examples:

const rate = await getRate()            // numeric USD→NGN rate
const naira = await usdToNgn(10)        // returns rounded NGN value for $10
const dollars = await ngnToUsd(15000)   // returns USD with 2 decimal precision

Deploy notes
------------
- On Render (or similar), set `USD_NGN_RATE` for admin override if you need immediate control.
- Otherwise ensure the host can reach `https://api.exchangerate.host` and that outbound traffic is allowed.
- After changing env vars use your platform's env-reload or redeploy to pick up changes (admin override is immediately used on next call in our implementation).

Troubleshooting
---------------
- If USD payments still fail with "Conversion failed", check backend logs for `conversion error` and ensure outbound network access to the exchange API or set `USD_NGN_RATE`.

Contact
-------
If you want, I can add a small admin UI to view and change `USD_NGN_RATE` safely.
