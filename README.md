# GCode Licensing Backend

Secure and minimal licensing backend for GCode indicators with Paddle and TradingView integration.

---

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Stack](#stack)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Endpoints](#endpoints)
- [Paddle Event Mapping](#paddle-event-mapping)
- [Deployment](#deployment)
- [License Expiry Logic](#license-expiry-logic)
- [Security](#security)
- [Example Flows](#example-flows)
- [Testing](#testing)
- [License](#license)

---

## Introduction

This backend handles the licensing lifecycle for the GCode indicator, integrating Paddle's billing system and TradingView alerts. It supports secure license creation, validation, and revocation with admin protection and event-based updates.

---

## Features

- License management: create, validate, revoke
- Paddle webhook verification:
  - HMAC for Billing model
  - RSA for Classic model
- TradingView alert ingestion with secret-based authentication
- License key prefixing (e.g., `GCODE-`)
- Company-scoped license management
- SQLite support by default
- Optional admin UI
- Dockerized for easy deployment

---

## Stack

- **Backend**: Node.js (Express)
- **Database**: SQLite (via `better-sqlite3`)
- **Middleware**: `helmet`, `morgan`, `dotenv`, `raw-body`

---

## Installation

```bash
git clone https://github.com/your-org/gcode-licensing.git
cd gcode-licensing
cp .env.example .env
# Fill in required env values
npm install
npm run migrate
npm run dev
```

The server will run at `http://localhost:8080`.

---

## Quick Start

1. Clone the repo
2. Set up `.env` using `.env.example`
3. Install and migrate:
   ```bash
   npm install
   npm run migrate
   npm run dev
   ```

---

## Environment Variables

Refer to `.env.example`. Key variables:

- `ADMIN_TOKEN`: Required for admin-protected routes
- `TV_WEBHOOK_SECRET`: TradingView alert authentication
- `TV_WEBHOOK_SECRET_HEADER`: Header name for TV secrets
- `PADDLE_SIGNATURE_TYPE`: `hmac` or `rsa`
- `PADDLE_WEBHOOK_SECRET`: Used for HMAC
- `PADDLE_PUBLIC_KEY_PEM`: Used for RSA
- `LICENSE_PREFIX`: e.g., `GCODE-`
- `TRIAL_DAYS`: Default trial duration in days

---

## Endpoints

### POST `/license/create` (Admin)

Creates a license.

**Headers**:
```http
X-Admin-Token: your_admin_token
```

**Body**:
```json
{
  "plan": "monthly",
  "customer": {
    "external_id": "sub_123",
    "email": "user@example.com",
    "name": "User"
  },
  "notes": "optional"
}
```

---

### POST `/license/validate`

Validates a license key.

**Body**:
```json
{
  "key": "GCODE-..."
}
```

---

### POST `/license/revoke` (Admin)

Revokes a license.

**Headers**:
```http
X-Admin-Token: your_admin_token
```

**Body**:
```json
{
  "key": "GCODE-...",
  "reason": "refund"
}
```

---

### POST `/paddle/webhook`

Processes Paddle events.

- **HMAC**: Send `Paddle-Signature` header with HMAC SHA256 of raw body.
- **RSA**: Include `p_signature` in payload and use the public key.

---

### POST `/tv/alert`

Processes TradingView alerts.

**Headers**:
```http
X-TV-Secret: your_tv_secret
```

**Body**:
```json
{
  "lic_key": "GCODE-...",
  "symbol": "BTCUSDT",
  "direction": "long",
  "price": 70000.0,
  "timeframe": "15"
}
```

If you cannot use headers, include `"tv_secret": "your_tv_secret"` in the body.

---

## Paddle Event Mapping

| Event Type                         | Action                              |
|-----------------------------------|-------------------------------------|
| `subscription.created`            | Create new license (active)         |
| `transaction.completed`           | Create new license (active)         |
| `subscription.canceled`           | Mark license inactive               |
| `refund`                          | Mark license inactive               |

If `metadata.license_key` or `passthrough` is passed from Paddle, it will update the corresponding license.

---

## Deployment

### Render

- Create Web Service from repo
- Add environment variables
- Use `npm start`
- Enable persistent disk or switch to Postgres if needed

### Vercel

- Can use Express server with `vercel.json`
- For serverless functions, disable body parsing on webhook routes

### Docker

```bash
docker build -t gcode-licensing .
docker run --env-file .env -p 8080:8080 \
  -v $(pwd)/gcode.sqlite:/app/gcode.sqlite \
  gcode-licensing
```

---

## License Expiry Logic

- **Trial**, **Monthly**, **Annual**: expire based on `expires_at`
- **Lifetime**: no expiration
- Every validation or alert triggers an expiration check

---

## Security

- Uses `helmet` for security headers
- `morgan` for logging
- Secrets are never logged
- Timing-safe comparisons for secrets
- Paddle signature verification on raw payload
- Admin endpoints require `X-Admin-Token`

---

## Example Flows

### ✅ Payment Success

1. Paddle sends event (`subscription.created`)
2. Signature is verified
3. License created and returned

### ❌ Cancel or Refund

1. Paddle sends event
2. License is located (via passthrough or metadata)
3. Status updated to `inactive`

### 📡 TradingView Alert

1. TV sends alert to `/tv/alert`
2. Server validates secret and license
3. Logs alert if license is active

---

## Testing

### Validate License Key

```bash
curl -s http://localhost:8080/license/validate \
  -H "Content-Type: application/json" \
  -d '{ "key": "GCODE-XXXX-..." }'
```

**Expected Response**:
```json
{
  "ok": true,
  "valid": true,
  "license": {
    "key": "GCODE-XXXX-...",
    "plan": "monthly",
    "status": "active",
    "expires_at": "2025-12-09T12:00:00.000Z"
  }
}
```

---

## License

This project is proprietary and protected. All rights reserved by GCode.
