# Kanboard — Agent Context & Takeover Guide

Welcome, Agent! This document is designed to help you quickly understand the Kanboard codebase, its patterns, and how to safely extend, modify, or debug it.

---

## 🛠️ Tech Stack & Key Files

Kanboard is a containerized PERN-stack monorepo:
*   **Frontend**: React (Vite) + TailwindCSS 4 (using `@tailwindcss/vite` plugin).
*   **Backend**: Node.js + Express.js + Socket.IO (version 4).
*   **Database**: PostgreSQL 17 (pg driver).
*   **AI Engine**: Google Gemini API (`@google/generative-ai` SDK using `gemini-2.0-flash`).

### Critical Entry Points:
*   [Root package.json](file:///f:/personal-projects/ai-kanban-board/package.json): Root scripts. Runs `concurrently` to boot both dev servers.
*   [Vite config](file:///f:/personal-projects/ai-kanban-board/vite.config.js): Handles React compiling and Tailwind integration.
*   [Backend index.js](file:///f:/personal-projects/ai-kanban-board/server/src/index.js): Express app server bootstrap and Socket.IO initialization.
*   [Socket module](file:///f:/personal-projects/ai-kanban-board/server/src/socket.js): Event handlers, authentication handshake, and presence mappings.
*   [API Client (Frontend)](file:///f:/personal-projects/ai-kanban-board/src/lib/api.js): Axios HTTP requests. Signature matches the mock API logic.
*   [Socket Client (Frontend)](file:///f:/personal-projects/ai-kanban-board/src/lib/socket.js): Websocket connections and event listeners.

---

## 💡 Code Patterns & Coding Guidelines

### 1. Unified Route Param Naming:
To ensure `mergeParams: true` works correctly in Express nested routers, always mount sub-routes using the exact segment name defined in the controllers.
*   *Correct mount pattern*:
    ```javascript
    router.use("/:boardId/tasks", requireBoardMember, taskRoutes);
    ```
*   *Access in task controller*: `req.params.boardId` (instead of `id` or `id` being lost).

### 2. Multi-Tenant Guard:
Every route mutating or fetching board-specific data must be guarded by `requireBoardMember` in `boards.js`. This automatically verifies that the authenticated user (`req.user.id`) is listed in the `board_members` table for the matching board.

### 3. Websocket Broadcasts:
After any database mutation inside a controller (e.g. creating/updating a task or column), you must broadcast the change to the corresponding board's Socket.IO room.
*   *Example*:
    ```javascript
    getIO().to(`board:${boardId}`).emit("task:created", task);
    ```

### 4. Floating-Point Positions (Drag & Drop):
Tasks and columns are sorted by the `position` column. Do not use integer-based ranking (1, 2, 3) or trigger bulk position updates.
*   When a card is dropped between card A (position `X`) and card B (position `Y`), calculate the new position as `(X + Y) / 2`.
*   This ensures `O(1)` updates on the database.

---

## 🚀 Environment & Verification

### Local Database Actions
*   To start PostgreSQL container: `docker compose up -d`
*   To reset & seed tables: `npm run seed --prefix server`

### Starting Dev Servers
*   Run `npm run dev` in the root workspace. This starts:
    *   Vite frontend on `http://localhost:5173`
    *   Express backend on `http://localhost:5050`

---

## 🚀 CI/CD & Deployment

Deployments to the production Azure Virtual Machine (`104.214.171.72`) are fully automated via GitHub Actions.

*   **Workflow File**: [.github/workflows/deploy.yml](file:///f:/personal-projects/ai-kanban-board/.github/workflows/deploy.yml)
*   **Trigger**: Pushes to `main` branch.
*   **Production Secrets Required** (stored in GitHub Repository Secrets):
    *   `VM_PUBLIC_IP`: The IP address of the target VM.
    *   `SSH_PRIVATE_KEY`: The RSA private key (.pem) used to authenticate SSH connection.
*   **Docker context**: Caddy acts as the frontend server and API reverse proxy on the VM. Caddy config is handled in the root [Caddyfile](file:///f:/personal-projects/ai-kanban-board/Caddyfile).

---

## 🔔 Real-time Notifications & AI Features (Added 2026-07-15)

### 1. Robust AI Wrapper & Latency Optimizations
All Gemini integrations (task generation, breakdown, sprint summary) are optimized for speed, reliability, and clean error handling:
* **Model Selection**: Loaded dynamically via `process.env.GEMINI_MODEL`, defaulting to `gemini-3.5-flash` or the high-speed `gemini-flash-lite-latest`.
* **JSON Mode**: Forced output to `responseMimeType: "application/json"` at the model initialization level to speed up token generation and ensure parsing reliability.
* **Auto-Retry & Backoff**: The `safeGenerateContent` wrapper in `server/src/services/ai.js` catches temporary `503 Service Unavailable` or `429 Rate Limit` errors and automatically retries with exponential backoff (e.g., 1s, then 2s, then 4s).
* **Parallel DB Writes**: Task generation inserts cards concurrently using `Promise.all` to minimize round-trip database latency.
* **CORS Error Interception**: Gemini connection errors are caught and converted to specific user-facing `AppError` payloads, while `server/src/index.js` dynamically accepts both `localhost` and `127.0.0.1` origins, avoiding generic browser `"Network Error"` blockages.

### 2. Live Notifications System
Notifications are broadcast globally via activities and Socket.IO:
* **Backend Endpoint**: `GET /api/users/notifications` (in `server/src/routes/users.js`) fetches recent activities across all boards the logged-in user belongs to.
* **WebSockets Room Auto-Join**: Upon connection, the socket server in `server/src/socket.js` queries the database and automatically calls `socket.join("board:<boardId>")` for every board the user belongs to. This ensures they receive live `activity:new` broadcasts globally.
* **Frontend Topbar Component**: [Topbar.jsx](file:///f:/personal-projects/ai-kanban-board/src/components/layout/Topbar.jsx) features an interactive popover showing notifications. It tracks read/unread counts using a client-side `localStorage` timestamp per user, incrementing counts instantly upon receiving socket messages.


