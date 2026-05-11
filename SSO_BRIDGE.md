# SSO Bridge — Cross-App Authentication

This document explains the Single Sign-On (SSO) bridge between **Tutoring app** (student dashboard) and **Academy app**.

---

## Overview

A child logged into Tutoring app can click **"Login to Academy"** and land on Academy app fully authenticated — no username, no password, no extra steps.

```
[Child in Tutoring app] → click button → Tutoring app backend issues bridge token as secure cookie
                                        ↓
                              Academy app /sso (no token in URL)
                                        ↓
                              Academy app backend reads cookie & verifies token
                                        ↓
                              issues normal Academy app session cookie
                                        ↓
                              child lands on Academy app home page
```

---

## Security Improvements

**Cookie-Based SSO** (Current Implementation)

- Bridge token is set as an **HTTP-only, secure cookie** on the shared domain (`.evangadi.com`)
- Token **never appears in the URL**, eliminating exposure risks
- Cookies are automatically sent by the browser with `credentials: 'include'`
- `sameSite: 'lax'` allows cross-subdomain but prevents CSRF attacks
- Cookie is cleared immediately after use

**Why This Is More Secure:**

- No token exposure in browser history, logs, or referrer headers
- HTTP-only flag prevents JavaScript access (XSS protection)
- Secure flag ensures HTTPS-only transmission in production
- Automatic browser handling reduces implementation errors
- Works seamlessly across subdomains on the same parent domain

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

```javascript
POST http://localhost:5001/api/child/sso-token
Authorization: Bearer <childToken>
credentials: 'include'  // Enable cookie handling
```

### Step 2 — Tutoring app backend issues a bridge token as a secure cookie

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
5. The token is set as a **secure cookie**:
   ```javascript
   res.cookie("sso_bridge_token", ssoToken, {
     httpOnly: true, // Prevents JavaScript access
     secure: true, // HTTPS only in production
     sameSite: "lax", // Cross-subdomain allowed
     domain: ".evangadi.com", // Shared across subdomains
     maxAge: 30000, // 30 seconds
     path: "/",
   });
   ```

**Why 30 seconds?**
The bridge token is a one-time handoff credential. A short expiry minimizes the window for interception or replay attacks.

### Step 3 — Browser is redirected to Academy app

```javascript
window.location.href = "http://localhost:5173/sso";
```

**No token in the URL!** The cookie is automatically sent by the browser.

### Step 4 — Academy app SSO page consumes the token

`Academy app/frontend/src/pages/SSOLogin.jsx`

On mount, the page immediately POSTs to Academy app's backend with `credentials: 'include'`:

```javascript
POST http://localhost:5000/api/sso/login
credentials: 'include'  // Browser automatically sends the cookie
```

### Step 5 — Academy app backend verifies and provisions the user

`Academy app/backend/server.js` → `POST /api/sso/login`

1. The token is read from `req.cookies.sso_bridge_token` using `cookie-parser` middleware.
2. The token is verified using `SSO_BRIDGE_SECRET` — **not** `JWT_SECRET`. This endpoint is completely separate from the regular `authenticate` middleware.
3. `name` and `email` are extracted from the payload.
4. The `users` table is checked for the tagged email:
   - **Exists** → use the existing record (idempotent, safe to call multiple times).
   - **Does not exist** → auto-provision a new user row with a securely hashed random placeholder password. The child can never log in with a password — only via SSO.
5. A normal Academy app session JWT is issued using Academy app's own `JWT_SECRET` with the standard 2-minute expiry.
6. The **bridge cookie is cleared** immediately after use.
7. `{ token, user }` is returned in the response body (consistent with normal login flow).

### Step 6 — Session is stored and child is redirected home

Back in `SSOLogin.jsx`:

- `token` and `user` are stored in `localStorage` (same keys as a normal Academy app login).
- The child is redirected to `/` — the Academy app home page.
- The child sees: **"Welcome, James 👋"**

---

## Security Properties

| Property                                              | How it's achieved                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Token never exposed in URL                            | Stored in HTTP-only cookie, not query parameter                                       |
| Bridge token can't be used as a regular session       | Signed with `SSO_BRIDGE_SECRET`, not `JWT_SECRET`                                     |
| Regular session tokens can't be used as bridge tokens | `SSO_BRIDGE_SECRET` ≠ either app's `JWT_SECRET`                                       |
| Replay attacks are limited                            | Bridge token expires in 30 seconds and is cleared after use                           |
| XSS protection                                        | HTTP-only cookies cannot be accessed by JavaScript                                    |
| CSRF protection                                       | `sameSite: 'lax'` prevents cross-site request forgery                                 |
| HTTPS enforcement                                     | `secure: true` in production ensures encrypted transmission                           |
| Child identity is unique in Academy app               | Tagged email `parent+childusername@domain` is deterministic and unique                |
| Child can't set their own password in Academy app     | Placeholder password is random and never revealed                                     |
| Existing users in both apps are unaffected            | No changes to existing tables, secrets, or middleware                                 |
| Works across subdomains                               | Cookie domain set to `.evangadi.com` (or `localhost` in dev) shares across subdomains |

---

## Local Development vs Production

### Local Development (localhost)

- Domain: `localhost`
- Ports: `5174` (Tutoring) and `5173` (Academy)
- Cookie domain: `localhost` (shared across ports)
- Secure flag: `false` (HTTP allowed)

### Production

- Domains: `tutoring.evangadi.com` and `evangadi.com`
- Cookie domain: `.evangadi.com` (note the leading dot for subdomain sharing)
- Secure flag: `true` (HTTPS required)
- Set `NODE_ENV=production` in both `.env` files

---

## Files Changed

| File                                            | Change                                                                |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| `Tutoring app/backend/.env`                     | Added `SSO_BRIDGE_SECRET`                                             |
| `Academy app/backend/.env`                      | Added `SSO_BRIDGE_SECRET`                                             |
| `Tutoring app/backend/package.json`             | Added `cookie-parser` dependency                                      |
| `Academy app/backend/package.json`              | Added `cookie-parser` dependency                                      |
| `Tutoring app/backend/server.js`                | Added `cookie-parser` middleware, updated `POST /api/child/sso-token` |
| `Academy app/backend/server.js`                 | Added `cookie-parser` middleware, updated `POST /api/sso/login`       |
| `Tutoring app/frontend/src/pages/ChildHome.jsx` | Updated SSO button to use `credentials: 'include'`                    |
| `Academy app/frontend/src/pages/SSOLogin.jsx`   | Removed URL token parsing, added `credentials: 'include'`             |
| `Academy app/frontend/src/App.jsx`              | `/sso` route (no changes needed)                                      |

---

## Testing the Flow

1. Start both backends:

   ```bash
   cd tutoring-app/backend && npm run dev
   cd academy-app/backend && npm run dev
   ```

2. Start both frontends:

   ```bash
   cd tutoring-app/frontend && npm run dev
   cd academy-app/frontend && npm run dev
   ```

3. Register a parent and add a child in Tutoring app
4. Log in as the child
5. Click "Login to Academy" button
6. Verify you land on Academy app home page without seeing any token in the URL
7. Check browser DevTools → Application → Cookies to see the secure cookies
