# Auth App — Full Workflow Documentation

A full-stack authentication app built with **Node.js + Express** (backend) and **React** (frontend), using **JWT** for auth and **MySQL** as the database.

---

## Project Structure

```
auth-app/
├── backend/
│   ├── config/
│   │   └── db.js          # MySQL connection pool + connectDB()
│   ├── server.js          # Express app, routes, JWT middleware
│   ├── init.sql           # SQL script to create DB and users table
│   ├── .env               # Environment variables
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   └── Home.jsx
    │   ├── App.jsx         # Routes + PrivateRoute guard
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Prerequisites

- Node.js >= 18
- MySQL running locally
- npm

---

## 1. Database Setup

Run the SQL script once to create the database and table:

```bash
mysql -u tester -p12345678 < auth-app/backend/init.sql
```

This executes:

```sql
CREATE DATABASE IF NOT EXISTS tester;

USE tester;

CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. Backend Setup

### Environment Variables

`auth-app/backend/.env`:

```env
JWT_SECRET=your_super_secret_key_change_this
PORT=5000

DB_HOST=localhost
DB_USER=tester
DB_PASSWORD=12345678
DB_NAME=tester
```

> Change `JWT_SECRET` to a strong random string before deploying.

### Install & Run

```bash
cd auth-app/backend
npm install
npm run dev
```

On startup you'll see:

```
✅ MySQL connected — database: "tester" on localhost
🚀 Server running on http://localhost:5000
```

If the DB connection fails, the process exits immediately with:

```
❌ MySQL connection failed: <reason>
```

---

## 3. Frontend Setup

### Install & Run

```bash
cd auth-app/frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

---

## 4. Application Flow

### Registration

```
User fills Register form (name, email, password)
  → POST /api/register
  → Server checks if email already exists
  → Hashes password with bcrypt (salt rounds: 10)
  → Inserts new user into MySQL
  → Returns 201 { message: "User registered successfully" }
  → Frontend redirects to /login after 1.5s
```

### Login

```
User fills Login form (email, password)
  → POST /api/login
  → Server fetches user by email from MySQL
  → Compares password with bcrypt
  → Signs JWT with { id, name, email } — expires in 2 minutes
  → Returns { token, user }
  → Frontend stores token + user in localStorage
  → Redirects to / (Home)
```

### Home (Protected)

```
PrivateRoute checks localStorage for token
  → If missing → redirect to /login
  → If present → render Home
  → Home displays "Welcome, {name} 👋"
  → Client-side timer auto-logs out after 2 minutes (matches JWT expiry)
  → Logout button clears localStorage and redirects to /login
```

### Token Expiry

- JWT expires server-side after **2 minutes**
- Any request with an expired token to a protected route returns `401 Invalid or expired token`
- The Home page has a matching client-side `setTimeout` that auto-logs out the user at the same time

---

## 5. API Reference

| Method | Endpoint      | Auth Required | Description          |
| ------ | ------------- | ------------- | -------------------- |
| POST   | /api/register | No            | Register a new user  |
| POST   | /api/login    | No            | Login, returns JWT   |
| GET    | /api/me       | Yes (Bearer)  | Returns current user |

### POST /api/register

Request body:

```json
{ "name": "John", "email": "john@example.com", "password": "secret" }
```

Responses:

- `201` — Registered successfully
- `400` — Missing fields
- `409` — Email already registered
- `500` — Server error

### POST /api/login

Request body:

```json
{ "email": "john@example.com", "password": "secret" }
```

Responses:

- `200` — `{ token, user: { id, name, email } }`
- `401` — Invalid credentials
- `500` — Server error

### GET /api/me

Headers: `Authorization: Bearer <token>`

Responses:

- `200` — `{ user: { id, name, email } }`
- `401` — No token / Invalid or expired token

---

## 6. Key Dependencies

### Backend

| Package      | Purpose                      |
| ------------ | ---------------------------- |
| express      | HTTP server & routing        |
| mysql2       | MySQL client (promise-based) |
| bcryptjs     | Password hashing             |
| jsonwebtoken | JWT sign & verify            |
| dotenv       | Load .env variables          |
| cors         | Allow frontend origin        |

### Frontend

| Package          | Purpose              |
| ---------------- | -------------------- |
| react            | UI library           |
| react-router-dom | Client-side routing  |
| vite             | Dev server & bundler |

---

## 7. Security Notes

- Passwords are never stored in plain text — bcrypt hashes them with 10 salt rounds
- JWT secret must be a strong random string in production
- Tokens expire after 2 minutes — short-lived by design
- CORS is restricted to `http://localhost:5173` — update for production
- Use HTTPS in production to protect tokens in transit
