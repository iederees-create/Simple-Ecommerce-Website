# Francis Digital Atelier — premium NOWPayments storefront

This branch contains a new premium storefront built on top of the existing Simple-Ecommerce-Website repository without deleting the original files.

## What is included

- 5 digital products sourced from existing GitHub projects
- 5 premium service engagements
- Server-side pricing so customers cannot change prices in browser code
- NOWPayments payment creation
- Payment-status polling
- Signed NOWPayments IPN verification using HMAC SHA-512
- Premium responsive UI
- Server-only secret handling

## Local setup

1. Use Node.js 20+.
2. Copy `.env.example` to `.env` and fill in the values.
3. Start with `STORE_PAYMENTS_ENABLED=false`.
4. Run `npm install`.
5. Run `npm start`.

> Node does not automatically load .env files in this project. For local testing either export the variables in your shell, use Node's --env-file option, or add a local-only dotenv loader. Never commit a real .env file.

## Render environment variables

Add these in Render > your Web Service > Environment:

- `PUBLIC_BASE_URL` — the final public URL, for example `https://your-store.onrender.com`
- `NOWPAYMENTS_API_KEY` — secret; server only
- `NOWPAYMENTS_IPN_SECRET` — secret; server only
- `NOWPAYMENTS_API_BASE` — default `https://api.nowpayments.io/v1`
- `STORE_PAYMENTS_ENABLED` — keep `false` until the keys and callback are verified, then switch to `true`

Do not place the NOWPayments API key or IPN secret in:
- GitHub source
- public/app.js
- HTML
- browser localStorage
- any VITE_ or NEXT_PUBLIC_ variable

## NOWPayments callback URL

Once deployed, the callback URL is:

`https://YOUR-DOMAIN/api/nowpayments/ipn`

Use that public URL in NOWPayments if the dashboard asks for a default IPN URL. The checkout also submits it per payment.

## Production hardening still recommended

Before public launch, add a persistent order database, transactional email delivery for digital purchases, rate limiting, structured logging, terms/refund pages, taxes/VAT handling appropriate to your business, and a final payment integration test including partial, expired, failed and repeated callbacks.
