# SSO Bridge — Cross-App Authentication

This document explains the Single Sign-On (SSO) bridge between **Tutoring app** (student dashboard) and **Academy app**.

---

## Overview

A child logged into Tutoring app can click **"Login to Academy"** and land on Academy app fully authenticated — no username, no password, no extra steps.

```
[Child in Tutoring app] → click button → Tutoring app backend issues bridge token
                                        ↓
                              Academy app /sso?token=...
                                        ↓
                              Academy app backend verifies token
                                        ↓
                              issues normal Academy app session
                                        ↓
                              child lands on Academy app home page
```

---

## Secret Key Strategy

A separate shared secret `SSO_BRIDGE_SECRET` is introduced in both `.env` files with the **same value**.

```
Tutoring app/.env
                 SSO_BRIDGE_SECRET=sso_shared_bridge_secret

Academy app/.env
                 SSO_BRIDGE_SECRET=sso_shared_bridge_secret
```

**Why separate secrets?**

- A token signed with `Tutoring app`'s `JWT_SECRET` can never be accepted by `Academy app`'s regular `authenticate` middleware — the secrets are different.
- The bridge token is signed with `SSO_BRIDGE_SECRET` and only verified by the dedicated `/api/sso/login` endpoint — never by the regular auth middleware.
- Existing users and sessions in both apps are completely unaffected.
- If the SSO bridge is ever compromised, you rotate only `SSO_BRIDGE_SECRET` without touching either app's normal auth flow.

---

## Step-by-Step Flow

### Step 1 — Child clicks "Login to Academy" (Tutoring app frontend)

`Tutoring app/frontend/src/pages/ChildHome.jsx`

The child's existing `childToken` (a normal Tutoring app JWT) is sent to Tutoring app's backend:

```
POST http://localhost:5001/api/child/sso-token
Authorization: Bearer <childToken>
```

### Step 2 — Tutoring app backend issues a bridge token

`Tutoring app/backend/server.js` → `POST /api/child/sso-token`

1. The `authenticateChild` middleware verifies the request using Tutoring app's own `JWT_SECRET`.
2. The child's record is fetched from the DB, joined with the parent's email.
3. A **tagged email** is constructed:
   ```
   parent email:  john@example.com
   child username: james.tyler210
   tagged email:  john+james.tyler210@example.com
   ```
   This gives each child a unique, deterministic identity in Academy app without needing a real email address.
4. A **bridge token** is signed with `SSO_BRIDGE_SECRET`, expiring in **30 seconds**:
   ```json
   {
     "id": 3,
     "username": "james.tyler210",
     "name": "James",
     "email": "john+james.tyler210@example.com"
   }
   ```
5. The token is returned to the frontend.

**Why 30 seconds?**
The bridge token is a one-time handoff credential. A short expiry minimises the window for interception or replay attacks. It is never stored anywhere — it lives only in the redirect URL for a fraction of a second.

### Step 3 — Browser is redirected to Academy app

```
window.location.href = http://localhost:5173/sso?token=<bridgeToken>
```

The token travels in the URL query string. This is acceptable because:

- It expires in 30 seconds.
- It is consumed immediately on page load.
- HTTPS in production prevents interception in transit.

### Step 4 — Academy app SSO page consumes the token

`Academy app/frontend/src/pages/SSOLogin.jsx`

On mount, the page reads `?token=` from the URL and immediately POSTs it to Academy app's backend:

```
POST http://localhost:5000/api/sso/login
{ "token": "<bridgeToken>" }
```

### Step 5 — Academy app backend verifies and provisions the user

`Academy app/backend/server.js` → `POST /api/sso/login`

1. The token is verified using `SSO_BRIDGE_SECRET` — **not** `JWT_SECRET`. This endpoint is completely separate from the regular `authenticate` middleware.
2. `name` and `email` are extracted from the payload.
3. The `users` table is checked for the tagged email:
   - **Exists** → use the existing record (idempotent, safe to call multiple times).
   - **Does not exist** → auto-provision a new user row with a securely hashed random placeholder password. The child can never log in with a password — only via SSO.
4. A normal Academy app session JWT is issued using Academy app's own `JWT_SECRET` with the standard 2-minute expiry.
5. `{ token, user }` is returned.

### Step 6 — Session is stored and child is redirected home

Back in `SSOLogin.jsx`:

- `token` and `user` are stored in `localStorage` (same keys as a normal Academy app login).
- The child is redirected to `/` — the Academy app home page.
- The child sees: **"Welcome, James 👋"**

---

## Security Properties

| Property                                              | How it's achieved                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Bridge token can't be used as a regular session       | Signed with `SSO_BRIDGE_SECRET`, not `JWT_SECRET`                      |
| Regular session tokens can't be used as bridge tokens | `SSO_BRIDGE_SECRET` ≠ either app's `JWT_SECRET`                        |
| Replay attacks are limited                            | Bridge token expires in 30 seconds                                     |
| Child identity is unique in Academy app               | Tagged email `parent+childusername@domain` is deterministic and unique |
| Child can't set their own password in Academy app     | Placeholder password is random and never revealed                      |
| Existing users in both apps are unaffected            | No changes to existing tables, secrets, or middleware                  |

---

## Files Changed

| File                                            | Change                                                       |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `Tutoring app/backend/.env`                     | Added `SSO_BRIDGE_SECRET`                                    |
| `Academy app/backend/.env`                      | Added `SSO_BRIDGE_SECRET`                                    |
| `Tutoring app/backend/server.js`                | Added `POST /api/child/sso-token`                            |
| `Academy app/backend/server.js`                 | Added `POST /api/sso/login`, updated CORS to allow port 5174 |
| `Tutoring app/frontend/src/pages/ChildHome.jsx` | Added "Login to Academy" button                              |
| `Academy app/frontend/src/pages/SSOLogin.jsx`   | New SSO landing page                                         |
| `Academy app/frontend/src/App.jsx`              | Added `/sso` route                                           |
