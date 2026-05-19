# Smartlink Service

A lightweight Express + TypeScript service that powers a single "smart link"
(`/api/go`) which inspects the incoming request's User-Agent (and modern
client-hint headers) and 302-redirects the visitor to the appropriate
destination:

- **iOS devices** → the App Store listing
- **Android devices** → the Play Store listing
- **Everything else** (desktop, bots, unknown UAs) → a configurable web fallback

It is intended to be used in marketing campaigns, QR codes, social bios, etc.
where you want a single URL that "does the right thing" depending on the
device that opens it.

## Features

- Device detection via [`ua-parser-js`](https://www.npmjs.com/package/ua-parser-js)
  with extra handling for iPadOS 13+ (which reports a desktop UA) using
  `Sec-CH-UA-Platform` / `Sec-CH-UA-Mobile` client hints.
- Per-request URL overrides via query string (`?ios=`, `?android=`,
  `?fallback=`) so a single deployment can serve many campaigns.
- Open-redirect protection: override URLs are validated against an allow-list
  of hosts before being used.
- Cache-busting headers on the redirect so the device check re-runs on every
  click (browsers/CDNs never cache a `302` to the wrong store).
- `helmet` security headers and `trust proxy` enabled for deployments behind
  a reverse proxy / load balancer.
- `/health` endpoint for uptime checks and `/api/go/debug` for QA.

## Project structure

```
src/
├── app.ts                    # Express bootstrap, middleware, health check
├── config/
│   └── links.ts              # Default iOS / Android / fallback URLs
├── routes/
│   └── smartlink.route.ts    # GET /go and GET /go/debug
└── utils/
    └── detectPlatform.ts     # UA + client-hint platform detection
```

## Requirements

- Node.js 18+ (ES2020 target, modern Express)
- npm 9+ (or pnpm / yarn — adjust commands accordingly)

## Installation

```bash
git clone <your-repo-url> mydove-ads
cd mydove-ads
npm install
```

## Configuration

Edit `src/config/links.ts` and set the real destination URLs for your app:

```ts
const appLinks: AppLinks = {
  ios: "https://apps.apple.com/app/your-app/id000000000",
  android: "https://play.google.com/store/apps/details?id=com.yourapp",
  fallback: "https://yourwebsite.com/download",
};
```

If you intend to use per-request overrides (`?ios=...&android=...`), also
update the `allowedHosts` array in `src/routes/smartlink.route.ts` to include
the domains you trust.

The HTTP port can be overridden with the `PORT` environment variable
(defaults to `3000`).

## Running

### Development (auto-reload)

```bash
npm run dev
```

Uses `ts-node-dev` to run `src/app.ts` directly and restart on file changes.

### Production build

```bash
npm run build   # compiles TypeScript to ./dist
npm start       # node dist/app.js
```

### Linting

```bash
npm run lint
```

## Endpoints

| Method | Path             | Description                                                                 |
| ------ | ---------------- | --------------------------------------------------------------------------- |
| GET    | `/health`        | Returns `{ status: "ok", ts: <iso> }`                                       |
| GET    | `/api/go`        | Smart-link entry point — 302-redirects based on detected platform           |
| GET    | `/api/go/debug`  | Returns parsed UA / client-hint info as JSON (gate or remove in production) |

### Example

```
# Default destinations from config/links.ts
GET /api/go

# Campaign-specific overrides
GET /api/go?ios=https://apps.apple.com/app/...&android=https://play.google.com/store/apps/details?id=...
```

## Deployment notes

- The service calls `app.set("trust proxy", 1)`, so put it behind exactly one
  trusted proxy (Nginx, an ALB, Cloudflare, etc.) to get correct client IPs.
- Always return `302` (temporary) — never `301` — so browsers don't cache the
  redirect and bypass platform detection on subsequent clicks.
- The `/api/go/debug` endpoint exposes request headers; either remove it or
  put it behind authentication before going to production.

## License

ISC (or update to your preferred license).
