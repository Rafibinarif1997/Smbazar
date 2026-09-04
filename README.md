# HOOD CHEGGY — Pixel WL Website

Production-ready starter for the Hood Cheggy public WL checker.

## What is included
- Premium chunky-pixel website UI
- Address-only WL checker (no wallet connection)
- Node/Express API
- Rate limiting, Helmet security headers and CORS
- Verified allowlist stored in `allowlist.json`
- Admin CSV/text import and export endpoints
- OpenSea server-side wallet enrichment endpoint (optional)
- Authorized Robinhood verification adapter (optional; server-to-server only)
- 1,000-genesis positioning and pixel collection gallery

## Run locally
1. Install Node 18+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set a long random `ADMIN_KEY`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

## Import verified WL addresses
Send a POST request to `/api/admin/import` with header `X-Admin-Key: YOUR_ADMIN_KEY` and a CSV/text body containing public EVM addresses. The server normalizes and deduplicates them.

Example:
`curl -X POST http://localhost:3000/api/admin/import -H "X-Admin-Key: YOUR_ADMIN_KEY" -H "Content-Type: text/csv" --data-binary @wl.csv`

## API endpoints
- `GET /api/health`
- `GET /api/stats`
- `GET /api/collection`
- `POST /api/eligibility` body `{ "address": "0x..." }`
- `POST /api/admin/import` (admin)
- `GET /api/admin/export` (admin)
- `GET /api/opensea/wallet/:address` (optional OpenSea API key)
- `POST /api/robinhood/verify` (admin + authorized verifier URL)

## Important production rule
The public checker must only return the final eligibility decision. Do not expose the source evidence, private brokerage data, API credentials, private keys, or seed phrases.

A Robinhood custodial account does not become publicly attributable to an EVM wallet merely because someone submits an address. If Robinhood activity is part of the WL criteria, populate the verified allowlist using an authorized verification process. Never ask users for Robinhood passwords, private API keys, private keys, or seed phrases.

## OpenSea
If you enable the OpenSea endpoint, keep the API key on the server in `.env`; never put it in browser JavaScript.

## Branding
Hood Cheggy is an independent project. Do not use Robinhood logos or language that suggests an official partnership.
