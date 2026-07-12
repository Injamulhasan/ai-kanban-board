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
