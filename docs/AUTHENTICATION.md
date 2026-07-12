# Kanboard — Authentication System Specification

This document details the design, security measures, and implementation details of Kanboard's user authentication system.

---

## 🔒 Security Infrastructure

Authentication is built around **JSON Web Tokens (JWT)** and **bcrypt** password hashing.

*   **Algorithm**: HMAC SHA-256 for signing tokens.
*   **Bcrypt Rounds**: 12 salt rounds for password hashing during registration.
*   **Token Payload**: `{ id, email, name }` (never stores passwords or sensitive database columns).
*   **Token Storage**: Saved locally in the browser's `localStorage` under the key `kanban_token`.

---

## 🔄 Authentication Flows

### 1. Registration (`POST /api/auth/register`)
1.  Client submits `{ name, email, password }`.
2.  Backend sanitizes parameters, verifies email is not already registered.
3.  Password is encrypted using `bcrypt.hash(password, 12)`.
4.  User row is inserted into `users` table.
5.  A default welcome board is optionally generated for the user.
6.  A JWT is generated using `jwt.sign()`.
7.  Backend responds with `{ user: { id, name, email }, token }`.

### 2. Login (`POST /api/auth/login`)
1.  Client submits `{ email, password }`.
2.  Backend queries database for the user row by email.
3.  Backend compares submitted password with stored hash using `bcrypt.compare()`.
4.  On match, generates JWT token.
5.  Responds with `{ user, token }`.

### 3. Auto-Login on Refresh (`GET /api/auth/me`)
1.  React client loads. [AuthContext.jsx](file:///f:/personal-projects/ai-kanban-board/src/context/AuthContext.jsx) checks for `kanban_token` in `localStorage`.
2.  If token exists, it makes an HTTP GET request to `/api/auth/me` with header `Authorization: Bearer <token>`.
3.  The `authenticate` middleware in [auth.js](file:///f:/personal-projects/ai-kanban-board/server/src/middleware/auth.js) intercepts the request:
    *   Verifies token signature using `JWT_SECRET`.
    *   Extracts user details from payload and attaches to `req.user`.
4.  Controller fetches fresh user details from the database and returns `{ user }`.
5.  If token is expired or invalid, server returns `401 Unauthorized` and the frontend clears the token from storage.

---

## ⚡ WebSocket Handshake Authentication

Socket.IO connections are authenticated during the initial connection handshake.

1.  When a user logs in successfully, the frontend socket manager calls `connectSocket()`.
2.  The client passes the JWT token inside the `auth` payload:
    ```javascript
    const socket = io(URL, {
      auth: { token: getToken() }
    });
    ```
3.  The Socket.IO backend runs a middleware on connection:
    ```javascript
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      // Verifies token...
      socket.user = { id, name, email };
      next();
    });
    ```
4.  If authentication fails, the connection is rejected. This ensures only authenticated users can join board rooms.
