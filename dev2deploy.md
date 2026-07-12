# Kanboard — My Complete Build & Deployment Documentation

**An AI-Powered, Real-Time Kanban Board — PERN Stack, Dockerized, Deployed on Azure**

> This is my consolidated engineering journal for Kanboard — everything from the product vision I started with, through the architecture and data model I designed, the UI system I built, the bugs I hit and fixed, all the way to how I actually deploy it to production. I wrote this so that six months from now (or anyone picking this project up) can read one document and understand not just *what* the system does, but *why* I made the decisions I made.

---

## 📖 Table of Contents

1. [My Vision for This Project](#1-my-vision-for-this-project)
2. [Quick Start — Running It Locally](#2-quick-start--running-it-locally)
3. [Project Structure](#3-project-structure)
4. [System Architecture](#4-system-architecture)
5. [Database Schema](#5-database-schema)
6. [Authentication System](#6-authentication-system)
7. [Business Rules & Access Control](#7-business-rules--access-control)
8. [MVP Scope — What I Built vs. What I Deferred](#8-mvp-scope--what-i-built-vs-what-i-deferred)
9. [UI & Design System](#9-ui--design-system)
10. [User Journey & Flows](#10-user-journey--flows)
11. [How I Think About the Codebase (Patterns I Follow)](#11-how-i-think-about-the-codebase-patterns-i-follow)
12. [From Development to Deployment](#12-from-development-to-deployment)
13. [Bugs I Hit and How I Fixed Them](#13-bugs-i-hit-and-how-i-fixed-them)
14. [My Manual Deployment Runbook](#14-my-manual-deployment-runbook)
15. [Automating My Deployment with CI/CD](#15-automating-my-deployment-with-cicd)
16. [Closing Notes](#16-closing-notes)

---

## 1. My Vision for This Project

I built Kanboard because I was frustrated with existing project management tools. My vision was to create a **premium, AI-native collaboration platform** that eliminates the friction of project management — combining clean aesthetics with real-time, multi-tenant collaboration and Google Gemini AI, so that teams can go from **"idea to structured execution"** in seconds.

### The problem I was trying to solve

I noticed that traditional tools like Jira or Trello suffer from two problems I wanted to avoid:

1. **The Blank Slate Problem** — creating a new board normally means manually mapping out tasks, writing detailed tickets, assessing priorities, and assigning deadlines. That mental friction delays project kickoffs, and I wanted to remove it.
2. **Visual Noise** — most modern tools are cluttered with heavy configuration, custom fields, and constant notifications. I wanted the opposite: something calm and focused.

### The three principles I designed around

**A. AI-native workflows, not an afterthought.** I didn't want AI bolted on as a chat sidebar. Instead, I integrated it directly into the core workflow — I built an **AI Task Generator** so that instead of spending hours writing cards, I can give it a goal like *"Build a Stripe payment system"* and it immediately populates a complete roadmap. I also built an **AI Sprint Summary** that acts like an automated project manager, summarizing priorities and risks in one click, so I never have to stare at a big board wondering what's blocked.

**B. Exceptional visual design, with restraint.** I believe tool aesthetics directly affect how productive and focused I feel while using something every day, so I designed a curated premium light theme: soft lavender off-white pages to reduce eye strain, surfaces that visually "float" with subtle layered shadows, restrained and purposeful accent colors, generous rounded corners, and modern display typography (Space Grotesk + Inter).

**C. Multi-tenant, real-time speed.** I didn't want project management to require manual page refreshes. Every drag, drop, and edit I make propagates to all board members in under 100ms, which keeps remote teams aligned during live planning sessions.

### Who I'm building this for

- **Software engineers and founders** who want to spin up a quick, structured roadmap for a side project or startup without configuring Jira.
- **Product managers** who need a clean, distraction-free interface to brainstorm user stories and organize workflows visually.
- **Small agile teams** working remotely who need synchronous collaboration.

---

## 2. Quick Start — Running It Locally

This is how I get the app running on my own machine.

### Prerequisites

- Node.js (v20+)
- Docker & Docker Compose

### Steps I follow

**1. Clone my repository:**
```bash
git clone https://github.com/Injamulhasan/ai-kanban-board.git
cd ai-kanban-board
```

**2. Start my local PostgreSQL database:**
```bash
docker compose up -d
```

**3. Set up my environment files:**

Backend (`server/.env`):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kanboard
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
PORT=5050
CLIENT_URL=http://localhost:5173
```

Frontend (`.env`):
```env
VITE_API_URL=http://localhost:5050/api
VITE_SOCKET_URL=http://localhost:5050
```

**4. Install my dependencies:**
```bash
npm install                      # root & frontend
npm install --prefix server      # backend
```

**5. Seed my database:**
```bash
npm --prefix server run seed
```

**6. Launch the application:**
```bash
npm run dev
```
This starts both my React frontend (port `5173`) and my Express backend (port `5050`) concurrently.

**7. Log in with my demo account:**
- **Email:** `alex@kanboard.dev`
- **Password:** `Test@1234`

---

## 3. Project Structure

This is how I've organized my repository:

```
ai-kanban-board/
├── Caddyfile                   # Production web server config
├── docker-compose.yml          # Local database compose configuration
├── docker-compose.prod.yml     # Production full-stack compose configuration
├── package.json                # Root frontend scripts & concurrently setup
├── docs/                       # My developer documentation & system context
│   ├── dev2deploy.md           # My detailed developer-to-deployment guide
│   └── architecture.md         # My system flows and architecture notes
├── server/                     # My backend API server
│   ├── Dockerfile              # Production backend container build script
│   ├── package.json            # Server script configurations & dependencies
│   └── src/                    # My backend source (Controllers, Services, Routes, DB)
└── src/                        # My frontend source (React Components, Hooks, Context)
```

---

## 4. System Architecture

### 4.1 The stack I chose

I built Kanboard as a monorepo:

- **Frontend:** React (Vite, TailwindCSS, `@dnd-kit/sortable`)
- **Backend:** Express.js REST API with Socket.IO for WebSocket events
- **Database:** PostgreSQL
- **AI Integration:** Google Gemini SDK (`gemini-2.0-flash`)

### 4.2 High-level architecture

I containerized everything as a three-tier architecture for execution consistency:

```mermaid
graph TD
    Client[Browser Client - React SPA]
    WebServer[Caddy Web Server - Reverse Proxy]
    API[Express Server - Backend API]
    DB[(PostgreSQL Database)]
    Gemini[Google Gemini API]

    Client -->|Port 80/443: HTTP / WS| WebServer
    WebServer -->|Static files| Client
    WebServer -->|Proxy API to Port 5050| API
    WebServer -->|Proxy WebSockets to Port 5050| API
    API -->|Port 5432| DB
    API -->|HTTPS Request| Gemini
```

### 4.3 My core user flows

**Register / Login:** I have users create an account, and I encrypt their password using `bcrypt` (12 rounds) on the backend. My backend issues a JWT containing the user ID, name, and email. My frontend stores this JWT in `localStorage` and appends it as a Bearer token in my Axios HTTP headers.

**Board access & real-time sync:** When a user enters a board, I initialize a Socket.IO connection. The socket handshakes with my backend using the JWT. Upon joining, the client enters a virtual Socket.IO room named `board:<id>` so I can isolate communication per board.

**Presence:** When other users join the same board, they emit `presence:join` events. I keep an active connection list synchronized on the client so I can show who's currently working on the board.

### 4.4 Local development vs. production — how I keep them isolated

I made a strict rule for myself: never let local and production environments blur together.

```
┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│        LOCAL DEVELOPMENT        │        │      AZURE PRODUCTION VM        │
├─────────────────────────────────┤        ├─────────────────────────────────┤
│ API URL: http://localhost:5050  │        │ API URL: http://<VM_IP>/api     │
│ DB Host: localhost (Docker)     │        │ DB Host: database (Internal net)│
│ SSL: None                       │        │ SSL: None (Handles HTTP on 80)  │
│ Env: server/.env                │        │ Env: VM server/.env             │
└─────────────────────────────────┘        └─────────────────────────────────┘
```

**Why I run Docker locally:**

1. **Isolation** — instead of installing PostgreSQL directly on my Windows machine (which leaves persistent background services running), I run PostgreSQL inside an isolated Docker sandbox.
2. **Seed capability** — running `npm run seed` drops and recreates my tables locally within a second, so I can test freely without ever risking my cloud data.
3. **Consistency** — Docker guarantees the PostgreSQL engine on my local machine behaves identically to the one running on my Azure server.

### 4.5 Core operational lifecycles I designed

**Drag-and-drop reordering.** I use optimistic UI updates combined with backend persistence so dragging feels instantaneous:

```mermaid
sequenceDiagram
    participant User as User UI
    participant Hook as useBoard.js
    participant Server as Express API
    participant DB as PostgreSQL
    participant Room as Socket.IO Room

    User->>Hook: Drag card from Column A to Column B
    Note over Hook: Calculate new position parameter (midpoint between adjacent cards)
    Hook->>User: Instantly update UI (Optimistic update)
    Hook->>Server: HTTP PATCH /api/boards/:id/tasks/:taskId/move { column_id, position }
    Server->>DB: UPDATE tasks SET column_id = $1, position = $2 WHERE id = $3
    DB->>Server: Return updated task
    Server->>Room: Broadcast "task:moved" event to all members in board room
    Server->>Hook: HTTP 200 Response
    Note over User: If request fails, roll UI back to original state
```

**Live presence tracking.** I use Socket.IO rooms to track who's actively viewing a board:

```mermaid
sequenceDiagram
    participant Client as React Client
    participant Socket as Socket.IO Client
    participant Server as Socket.IO Server
    participant Presence as Presence Manager

    Client->>Socket: Join Board (Board ID)
    Socket->>Server: Emit "board:join" (boardId)
    Note over Server: Authenticate socket JWT token
    Server->>Server: Join socket to room "board:<boardId>"
    Server->>Presence: Add user to board presence mapping
    Server->>Client: Emit "presence:sync" (current active user list)
    Server->>Client: Broadcast "presence:join" (user details) to other sockets in room
    Client->>Client: Render presence avatars in top navigation bar
```

**Google Gemini AI generation flow.** I query the `gemini-2.0-flash` model using structured JSON prompts:

```mermaid
sequenceDiagram
    participant Client as React Client
    participant API as Express API
    participant Gemini as Gemini API
    participant DB as PostgreSQL

    Client->>API: POST /api/boards/:id/ai/generate-tasks { goal, count }
    Note over API: Compile prompt enforcing structured JSON response shapes
    API->>Gemini: Request generateContent (Prompt text)
    Gemini->>API: Return JSON-formatted response
    Note over API: Parse and validate JSON list
    API->>DB: Batch INSERT generated tasks into Column 1
    DB->>API: Return inserted records
    API->>Client: Return list of created tasks (HTTP 200)
```

### 4.6 Why I chose Caddy over the alternatives

I use Caddy as my production web server and reverse proxy on my Azure VM. Here's the comparison I made when deciding:

| Web Server | Strengths | Weaknesses | My Decision |
| :--- | :--- | :--- | :--- |
| **Caddy** | Automatic HTTPS (Let's Encrypt out-of-the-box); super clean config syntax; built-in WebSocket support | Slightly smaller community than Nginx | **I chose this.** Extremely simple to set up, handles Socket.IO without manual WebSocket headers, and automatically manages SSL for domains. |
| **Nginx** | Industry standard; high performance; extremely low memory footprint | Verbose configs; WebSockets need manual HTTP header overrides; SSL requires installing certbot + cron jobs | I considered this as my alternative — great for high traffic, but more configuration overhead than I wanted. |
| **Traefik** | Auto-discovers containers via Docker labels; designed for microservices | Can't serve static files directly (needs Nginx/Caddy behind it for `/dist`) | I didn't choose this — too complex for my single-VM monorepo deployment. |
| **Express** | Allows a single container setup | Node.js is single-threaded; serving large static assets blocks the CPU and degrades my API/WebSocket speed | I didn't choose this — it violates separation of concerns; I always want static assets offloaded to a compiled web server. |

### 4.7 Why I don't run PM2 inside Docker

In a standard bare-metal VM deployment, PM2 would be mandatory to keep the Node process alive after I log out of SSH. But inside Docker, I treat PM2 as redundant, because:

1. **Container supervision** — Docker itself acts as my supervisor. The `restart: always` directive in my `docker-compose.prod.yml` means that if the Node process crashes inside the container, Docker automatically restarts the container for me.
2. **Daemonization** — running `docker compose up -d` detaches the process and runs it in the background natively.
3. **Logs** — Docker captures `stdout`/`stderr` natively, so I inspect logs with `docker logs kanboard-backend` instead of `pm2 logs`.

### 4.8 Docker on Azure VM — the tradeoffs I accepted

**Advantages I get:**

- **Infrastructure ownership** — I have complete root access to the OS, so I can tweak PostgreSQL parameters, inspect network logs, and configure security tools myself.
- **Vertical scalability** — I can upgrade my VM size (e.g. B1s → D2s) in one click, and Docker adapts automatically to the new CPU/RAM without any config edits.
- **Horizontal scalability** — I have the option to host my PostgreSQL on a managed instance (like Supabase or Azure Database for PostgreSQL) and run multiple backend containers behind an Azure Load Balancer.

**Drawbacks I accept:**

- **Manual security** — I'm responsible for upgrading the Ubuntu OS, patching vulnerabilities, and configuring the firewall myself.
- **Single point of failure** — if my single VM goes down, both my database and web server go offline together.

---

## 5. Database Schema

I designed a relational schema in PostgreSQL with 6 tables, foreign keys, and cascading deletions.

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar name
        varchar email UK
        varchar password
        text avatar_url
        timestamptz created_at
    }
    BOARDS {
        uuid id PK
        varchar title
        text description
        varchar color
        uuid owner_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    BOARD_MEMBERS {
        uuid board_id PK, FK
        uuid user_id PK, FK
        varchar role
        timestamptz joined_at
    }
    COLUMNS {
        uuid id PK
        uuid board_id FK
        varchar title
        double_precision position
        timestamptz created_at
    }
    TASKS {
        uuid id PK
        uuid board_id FK
        uuid column_id FK
        varchar title
        text description
        varchar priority
        date due_date
        double_precision position
        uuid assignee_id FK
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    ACTIVITIES {
        uuid id PK
        uuid board_id FK
        uuid user_id FK
        varchar action
        text message
        jsonb meta
        timestamptz created_at
    }

    USERS ||--o{ BOARDS : owns
    USERS ||--o{ BOARD_MEMBERS : member_of
    BOARDS ||--|{ BOARD_MEMBERS : has
    BOARDS ||--|{ COLUMNS : contains
    BOARDS ||--|{ TASKS : contains
    COLUMNS ||--o{ TASKS : holds
    BOARDS ||--o{ ACTIVITIES : logs
    USERS ||--o{ TASKS : assigned_to
```

### 5.1 `users`

My table for storing user profile information and authentication credentials.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` | Unique user identifier |
| `name` | `VARCHAR(200)` | `NOT NULL` | Full name of the user |
| `email` | `VARCHAR(320)` | `NOT NULL`, `UNIQUE` | Unique email for authentication |
| `password` | `VARCHAR(200)` | `NOT NULL` | Bcrypt-hashed password |
| `avatar_url` | `TEXT` | `NULL` | Optional link to user avatar image |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Registration timestamp |

### 5.2 `boards`

My table defining Kanban workspaces.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` | Unique board identifier |
| `title` | `VARCHAR(200)` | `NOT NULL` | Board title |
| `description` | `TEXT` | `NULL` | Board purpose or metadata |
| `color` | `VARCHAR(20)` | default `#2f8159` | Primary aesthetic color (hex code) |
| `owner_id` | `UUID` | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE` | Creator of the board |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Last modification timestamp |

### 5.3 `board_members`

My intermediate lookup table mapping users to boards with specific permissions.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `board_id` | `UUID` | `PRIMARY KEY`, `REFERENCES boards(id) ON DELETE CASCADE` | The target board |
| `user_id` | `UUID` | `PRIMARY KEY`, `REFERENCES users(id) ON DELETE CASCADE` | The member user |
| `role` | `VARCHAR(20)` | default `member`, check (`owner`, `admin`, `member`) | Access rights of the member |
| `joined_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Join timestamp |

### 5.4 `columns`

My table representing stages in the Kanban pipeline.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` | Unique column identifier |
| `board_id` | `UUID` | `NOT NULL`, `REFERENCES boards(id) ON DELETE CASCADE` | The parent board |
| `title` | `VARCHAR(200)` | `NOT NULL` | Stage name (e.g. "Todo") |
| `position` | `DOUBLE PRECISION` | `NOT NULL`, default `1000` | Sorting order within the board |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Creation timestamp |

### 5.5 `tasks`

My table for storing actionable tickets.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` | Unique task identifier |
| `board_id` | `UUID` | `NOT NULL`, `REFERENCES boards(id) ON DELETE CASCADE` | The parent board |
| `column_id` | `UUID` | `NOT NULL`, `REFERENCES columns(id) ON DELETE CASCADE` | Current pipeline stage |
| `title` | `VARCHAR(500)` | `NOT NULL` | Task summary |
| `description` | `TEXT` | `NULL` | Detailed description or subtasks list |
| `priority` | `VARCHAR(20)` | default `medium`, check (`low`, `medium`, `high`, `urgent`) | Importance ranking |
| `due_date` | `DATE` | `NULL` | Task deadline |
| `position` | `DOUBLE PRECISION` | `NOT NULL`, default `1000` | Sorting order within the column |
| `assignee_id` | `UUID` | `REFERENCES users(id) ON DELETE SET NULL` | Assigned teammate |
| `created_by` | `UUID` | `REFERENCES users(id) ON DELETE SET NULL` | Task creator |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Modification timestamp |

### 5.6 `activities`

My table for tracking system events for board audit trails.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` | Unique activity identifier |
| `board_id` | `UUID` | `NOT NULL`, `REFERENCES boards(id) ON DELETE CASCADE` | Affected board |
| `user_id` | `UUID` | `REFERENCES users(id) ON DELETE SET NULL` | User who triggered the action |
| `action` | `VARCHAR(100)` | `NOT NULL` | Event type (e.g. `task.created`) |
| `message` | `TEXT` | `NOT NULL` | Description of the action (human readable) |
| `meta` | `JSONB` | default `{}` | Optional payload (old/new values) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Event timestamp |

### 5.7 Performance indexes I added

To keep my queries fast as data grows, I applied these indexes:

```sql
-- Speeds up board membership verification & dashboard loading
CREATE INDEX idx_board_members_user ON board_members(user_id);

-- Optimizes column listing for active boards
CREATE INDEX idx_columns_board     ON columns(board_id);

-- Speeds up task listing & cards rendering
CREATE INDEX idx_tasks_board       ON tasks(board_id);
CREATE INDEX idx_tasks_column      ON tasks(column_id);

-- Speeds up My Tasks panel loading (filter by assignee)
CREATE INDEX idx_tasks_assignee    ON tasks(assignee_id);

-- Speeds up activity feed loading (latest events first)
CREATE INDEX idx_activities_board  ON activities(board_id, created_at DESC);

-- Optimizes user verification during login
CREATE INDEX idx_users_email       ON users(email);
```

---

## 6. Authentication System

I built my authentication around **JSON Web Tokens (JWT)** and **bcrypt** password hashing.

### 6.1 Security infrastructure

- **Algorithm:** HMAC SHA-256 for signing tokens
- **Bcrypt rounds:** 12 salt rounds for password hashing during registration
- **Token payload:** `{ id, email, name }` (I never store passwords or sensitive DB columns in the token)
- **Token storage:** Saved in the browser's `localStorage` under the key `kanban_token`

### 6.2 Registration flow — `POST /api/auth/register`

1. Client submits `{ name, email, password }`.
2. My backend sanitizes the parameters and verifies the email isn't already registered.
3. I encrypt the password using `bcrypt.hash(password, 12)`.
4. I insert the user row into the `users` table.
5. I optionally generate a default welcome board for the user.
6. I generate a JWT using `jwt.sign()`.
7. My backend responds with `{ user: { id, name, email }, token }`.

### 6.3 Login flow — `POST /api/auth/login`

1. Client submits `{ email, password }`.
2. My backend queries the database for the user row by email.
3. I compare the submitted password against the stored hash using `bcrypt.compare()`.
4. On a match, I generate a JWT token.
5. I respond with `{ user, token }`.

### 6.4 Auto-login on refresh — `GET /api/auth/me`

1. When my React client loads, `AuthContext.jsx` checks for `kanban_token` in `localStorage`.
2. If a token exists, it makes an HTTP GET request to `/api/auth/me` with header `Authorization: Bearer <token>`.
3. My `authenticate` middleware (`server/src/middleware/auth.js`) intercepts the request: it verifies the token signature using `JWT_SECRET`, extracts the user details from the payload, and attaches them to `req.user`.
4. My controller fetches fresh user details from the database and returns `{ user }`.
5. If the token is expired or invalid, I return `401 Unauthorized` and my frontend clears the token from storage.

### 6.5 WebSocket handshake authentication

I also authenticate my Socket.IO connections during the initial handshake:

1. When a user logs in successfully, my frontend socket manager calls `connectSocket()`.
2. The client passes the JWT token inside the `auth` payload:
   ```javascript
   const socket = io(URL, {
     auth: { token: getToken() }
   });
   ```
3. My Socket.IO backend runs a middleware on connection:
   ```javascript
   io.use((socket, next) => {
     const token = socket.handshake.auth?.token;
     // Verifies token...
     socket.user = { id, name, email };
     next();
   });
   ```
4. If authentication fails, I reject the connection. This ensures only authenticated users can join board rooms.

---

## 7. Business Rules & Access Control

### 7.1 Role-based access control (RBAC)

Every board member I create is assigned a specific role (`owner`, `admin`, or `member`). Here's the permission matrix I enforce:

| Feature / Action | Owner | Admin | Member |
| :--- | :---: | :---: | :---: |
| Delete Board | ✅ | ❌ | ❌ |
| Transfer Ownership | ✅ | ❌ | ❌ |
| Rename / Recolor Board | ✅ | ✅ | ❌ |
| Invite New Members | ✅ | ✅ | ❌ |
| Remove Members (Self) | ✅ (must transfer ownership first) | ✅ | ✅ |
| Remove Other Members | ✅ | ✅ (cannot remove owner) | ❌ |
| Change Member Roles | ✅ | ✅ (cannot change owner) | ❌ |
| Create / Delete Columns | ✅ | ✅ | ❌ |
| Rename Columns | ✅ | ✅ | ❌ |
| Reorder Columns | ✅ | ✅ | ❌ |
| Create / Delete Tasks | ✅ | ✅ | ✅ |
| Edit Task Content / Assign | ✅ | ✅ | ✅ |
| Move Tasks (Drag & Drop) | ✅ | ✅ | ✅ |
| Use Gemini AI Functions | ✅ | ✅ | ✅ |

### 7.2 Data integrity & validation rules I enforce

**Board & column constraints:**
- Every board must have at least one owner — I never allow the owner's membership row to be deleted unless another member has already been promoted to owner.
- Column names must be unique within the same board (case-insensitive) — I don't allow two columns named "Todo" on the same board.
- Positions of columns and tasks are computed as double-precision floating-point numbers. If the gap between two items shrinks below `1e-9`, I automatically trigger a re-spacing transaction that resets positions to intervals of `1000`.

**Task assignment constraints:**
- A task can only be assigned to a user who is an active member of that task's parent board — I filter the assignee dropdown on the backend to enforce this.
- If I remove a board member, I set `assignee_id = NULL` on any tasks that were assigned to them on that board (enforced via database constraints and services).

**AI safety & rate limits:**
- I cap Gemini AI requests at **15 requests per minute** per user to prevent cost inflation.
- AI-generated tasks are capped at a maximum of **15 tasks** per request.
- Task descriptions generated by my breakdown service are limited to **500 characters** to conserve token usage.

---

## 8. MVP Scope — What I Built vs. What I Deferred

### 8.1 Core features I shipped in the MVP

**User Authentication**
- Registration with validated parameters (Name, unique Email, secure Password)
- Password security via `bcrypt` hashing
- Session security via signed JWT
- Automatic token re-validation on page refresh
- Route guards on `/dashboard` and `/board/*`

**Boards Management**
- Create boards with title, optional description, and a primary brand color
- Rename and recolor boards dynamically
- Delete boards (cascades to members, columns, tasks, activities)
- Dashboard sections split into "My Boards" and "Shared with You"
- Live counts of active tasks per board on the dashboard

**Columns Pipeline**
- Add, rename, delete columns on a board
- Custom sort ordering per column using floating-point positions

**Tasks (Tickets)**
- Full CRUD on task cards
- Detailed modal: title, rich text description, priority (`low`/`medium`/`high`/`urgent`), due date selector, assignee dropdown
- Midpoint floating-point calculations for `O(1)` drag-and-drop ordering persistence

**Collaboration & Sharing**
- Team members panel with search-by-email
- Invite members with role designations (`owner`, `admin`, `member`, each scoped per §7.1)
- Activity logs feed showing recent board actions

**Google Gemini AI Engine**
- **AI Task Generator** — creates a structured task backlog from a text prompt goal
- **AI Task Breakdown** — deconstructs a task's description into a subtask checklist inside the modal
- **AI Board Summary** — analyzes status, completed tickets, active work, and blockers into a roadmap summary

### 8.2 What I deliberately left out of the MVP

I excluded these to keep my focus on reliability first:

- OAuth Single Sign-On (Google, GitHub, Microsoft)
- File attachment uploads (PNG/PDF) inside the task modal
- Comments system with @mentions
- Time tracking (start/stop timers on cards)
- Gantt chart & calendar views
- Email notifications for assignments/comments

---

## 9. UI & Design System

### 9.1 My theme & color system

I use a curated, premium light theme, and I deliberately avoid generic colors (plain red, plain blue) — everything routes through my design tokens.

| Token | Value | Usage |
|---|---|---|
| `bg-page` | `#f8f7fa` | Soft, calming lavender off-white page background |
| `bg-surface` | `#ffffff` | Pure white — surfaces should look like they float above the page |
| `text-brand` | `#635bff` | Vibrant indigo/lavender brand accent |
| `text-ink` | `#0e0d12` | Pitch black — headings, titles |
| `text-muted` | `#5c5a66` | Soft charcoal — labels, metadata, body text |
| `text-faint` | `#a2a0ab` | Warm gray — inactive icons, placeholders |
| `border-line` | `#efedf5` | Thin, crisp borders |

**Shadows — restraint plus depth.** I never use harsh, dark shadows; I always use soft, multi-layered shadows to convey elevation:

```css
--shadow-soft: 0 2px 8px -1px rgba(14, 13, 18, 0.03), 0 8px 24px -4px rgba(14, 13, 18, 0.05);
--shadow-brand: 0 4px 14px 0 rgba(99, 91, 255, 0.35);
```

### 9.2 Typography

I combine a modern display typeface with a highly legible body typeface:

1. **Display font (headers, titles): Space Grotesk** — used for board headers, card titles, hero text; confident, slightly geometric, tight tracking.
2. **Body font (paragraphs, code, details): Inter** — clean and highly legible at small sizes.

**Font styles I use consistently:**
- Page Heading: `font-display text-2xl font-bold tracking-tight text-ink`
- Task Card Title: `font-display text-sm font-semibold text-ink`
- Metadata Label: `font-sans text-xs font-medium text-muted`

### 9.3 Spacing & layout rules

- **Border radius:** I use generous rounding throughout —
  - Cards & Modals: `rounded-3xl` (24px)
  - Buttons & Inputs: `rounded-full` (9999px) or `rounded-2xl` (16px) for larger buttons
  - Avatars: `rounded-full`
- **Layout container:**
  - Sidebar: collapsible, `w-64` expanded / `w-16` collapsed
  - Board wrapper: horizontal scrolling list, padding `px-6 py-6`
- **Micro-interactions:**
  - Hovering over any card: subtle upward translation + deepened shadow — `transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]`
  - Buttons scale down slightly when pressed — `active:scale-[0.98] transition-transform`

---

## 10. User Journey & Flows

### 10.1 The standard journey I designed

```mermaid
graph TD
    A[Landing Page] -->|Click Register| B[Register Account]
    B -->|Automatic Redirect| C[Dashboard Workspace]
    C -->|Click Create Board| D[Configure Board Modal]
    D -->|Create| E[Board Workspace]
    E -->|Click AI Tasks| F[Gemini Generation]
    F -->|Insert| G[Tasks Hydrated]
    G -->|Drag & Drop| H[Sprint Progress]
    G -->|Click Card| I[Task Modal - Assign / Due Date]
    E -->|Click Share| J[Invite Members]
```

### 10.2 Scenario 1 — Onboarding & my first board

1. **Registration:** A new user visits `http://localhost:5173/` and sees my landing page highlighting the Gemini AI features.
2. **Account creation:** They click "Start now" and enter name, email, and password. On successful registration, the JWT is saved and the client transitions to `/dashboard`.
3. **Create board:** They click **Create Board**. A modal asks for Title (e.g. "Q3 Launch Plan"), Description ("Launch roadmap"), and Color Theme (e.g. violet).
4. **Auto-redirect:** The new board is created, and the user is redirected to `/board/:id`. I automatically create four default columns: `Todo`, `In Progress`, `Review`, `Done`.

### 10.3 Scenario 2 — Planning with AI

1. **Generate backlog:** On an empty board, the user clicks **AI Tasks**.
2. **Input goal:** A prompt modal asks "What is your project goal?" — they enter *"Create a mobile delivery application"*.
3. **Draft roadmap:** They select a task count (e.g. 8) and click **Generate**. My Express server contacts Gemini, receives a parsed list, and inserts the tasks into the `Todo` column.
4. **Deconstruct a task:** They click the generated card "Set up Google Maps integration", opening the task modal, then click **AI Breakdown**.
5. **Subtasks check:** Gemini generates 5 subtasks (e.g. "Get API key", "Install SDK", "Configure permissions"), which I append to the task's description as a checkable markdown checklist.

### 10.4 Scenario 3 — Real-time team collaboration

1. **Invite member:** The user clicks **Members** in the board's top bar, searches `diego@kanboard.dev`, and invites him as an `Admin`.
2. **Teammate joins:** Diego logs in on his own machine. Under "Shared with You" on his dashboard, he sees the new board and opens it.
3. **Live presence:** Diego's avatar appears in the top navigation bar of the first user's browser, showing that Diego is active on this board.
4. **Task assignment:** The first user opens the "Maps Integration" task and assigns it to **Diego Santos**. Diego's browser updates in real time, showing his avatar on the card.
5. **Move task:** Diego drags the card from `Todo` into `In Progress`. It slides across the first user's screen automatically.

---

## 11. How I Think About the Codebase (Patterns I Follow)

I wrote this section as a reminder to myself (and anyone else touching the code) about the conventions I've committed to, so I don't accidentally break them later.

### 11.1 Critical entry points I always check first

- **Root `package.json`** — root scripts; runs `concurrently` to boot both dev servers.
- **`vite.config.js`** — handles React compiling and Tailwind integration.
- **`server/src/index.js`** — my Express app server bootstrap and Socket.IO initialization.
- **`server/src/socket.js`** — event handlers, authentication handshake, and presence mappings.
- **`src/lib/api.js`** — my Axios HTTP client; signature matches the mock API logic.
- **`src/lib/socket.js`** — WebSocket connections and event listeners on the frontend.

### 11.2 Unified route param naming

To make sure `mergeParams: true` works correctly in my Express nested routers, I always mount sub-routes using the exact segment name my controllers expect.

**Correct mount pattern:**
```javascript
router.use("/:boardId/tasks", requireBoardMember, taskRoutes);
```
**Access in the task controller:** `req.params.boardId` (not `id`, and not lost).

### 11.3 Multi-tenant guard

Every route that mutates or fetches board-specific data must be guarded by `requireBoardMember` in `boards.js`. This automatically verifies that the authenticated user (`req.user.id`) is listed in the `board_members` table for the matching board. I never skip this, even for "read-only" routes.

### 11.4 WebSocket broadcasts

After any database mutation inside a controller (creating/updating a task or column), I always broadcast the change to the corresponding board's Socket.IO room:

```javascript
getIO().to(`board:${boardId}`).emit("task:created", task);
```

### 11.5 Floating-point positions for drag & drop

Tasks and columns are sorted by the `position` column. I never use integer-based ranking (1, 2, 3, ...) and I never trigger bulk position updates. When a card is dropped between card A (position `X`) and card B (position `Y`), I calculate the new position as `(X + Y) / 2`. This gives me `O(1)` updates on the database.

### 11.6 Local database actions I use day-to-day

- Start PostgreSQL container: `docker compose up -d`
- Reset & seed tables: `npm run seed --prefix server`

### 11.7 Starting my dev servers

I run `npm run dev` in the root workspace, which starts:
- Vite frontend on `http://localhost:5173`
- Express backend on `http://localhost:5050`

---

## 12. From Development to Deployment

This section is my in-depth reference log of the complete engineering lifecycle — every design decision, architectural consideration, and troubleshooting history I went through on the way to a working production deployment.

I already covered the architecture, the Caddy decision, the PM2 decision, and the Docker/Azure tradeoffs in [§4](#4-system-architecture) above. What follows is everything else I learned along the way: the bugs I actually hit, my manual deployment steps, and how I eventually automated the whole thing.

---

## 13. Bugs I Hit and How I Fixed Them

During development and integration, I ran into three issues that took real debugging time. I'm documenting them here so I never have to re-diagnose them from scratch.

### 13.1 Fix 1 — Login credentials autofill mismatch

**What went wrong:** My frontend's "Use demo account" button was hardcoded to autofill `alex@timetoprogram.com` from old mock data, but my database seed script actually populated `alex@kanboard.dev`. This meant clicking the demo button returned "Invalid credentials" every time.

**How I fixed it:** I updated `Login.jsx` to autofill the correct email:
```javascript
const fillDemo = () =>
  setForm({ email: "alex@kanboard.dev", password: "Test@1234" });
```

### 13.2 Fix 2 — Lost Express route parameters (`mergeParams`)

**What went wrong:** Accessing nested routes (like column creation and task moves) returned `null value in column "board_id" violates not-null constraint`. I eventually traced this to the fact that Express routers don't merge parent-router parameters by default, so `req.params.boardId` was coming back `undefined`.

**How I fixed it:** I updated the parent router mounts in `boards.js` to use the parameter name `:boardId` instead of `:id`. This let Express's `mergeParams: true` correctly capture the ID inside my child routers:
```diff
-router.use("/:id/tasks", requireBoardMember, taskRoutes);
+router.use("/:boardId/tasks", requireBoardMember, taskRoutes);
```
This is now enshrined as a hard rule for myself — see [§11.2](#112-unified-route-param-naming).

### 13.3 Fix 3 — Caddy `try_files` overwriting POST requests (405 error)

**What went wrong:** Login requests on my live server returned `Request failed with status code 405`. I dug in and found that in Caddy, `try_files` is evaluated *before* `reverse_proxy` by default. Caddy was rewriting `/api/auth/login` to the static `/index.html` file, and then the static file server threw a 405 because POST isn't allowed on static files.

**How I fixed it:** I grouped my Caddy routes into mutually exclusive `handle` blocks so `/api/*` and `/socket.io/*` bypass the static file server entirely:
```caddy
:80 {
    handle /api/* {
        reverse_proxy backend:5050
    }
    handle /socket.io/* {
        reverse_proxy backend:5050
    }
    handle {
        root * /usr/share/caddy
        try_files {path} /index.html
        file_server
    }
}
```

---

## 14. My Manual Deployment Runbook

These are the exact commands I run to deploy updates manually.

### Step 1 — Build my frontend locally

On my local PC, I update `.env` with the VM's public IP:
```env
VITE_API_URL=http://<YOUR_VM_PUBLIC_IP>/api
VITE_SOCKET_URL=http://<YOUR_VM_PUBLIC_IP>
```
Then I run the build:
```bash
npm run build
```

### Step 2 — Compress and upload my files

I zip only the deployable assets (excluding local `node_modules`):
```powershell
powershell -Command "Compress-Archive -Path server/src, server/package.json, server/package-lock.json, server/Dockerfile, dist, docker-compose.prod.yml, Caddyfile -DestinationPath deploy.zip -Force"
```
Then I transfer the archive to my VM:
```bash
scp -i "C:\path\to\key.pem" deploy.zip kanboard@<YOUR_VM_PUBLIC_IP>:~/kanboard/deploy.zip
```

### Step 3 — Deploy on the VM

I SSH into the VM, extract the files, organize the folders, and restart Docker:
```bash
ssh -i "C:\path\to\key.pem" kanboard@<YOUR_VM_PUBLIC_IP>

# Inside the VM:
cd ~/kanboard
unzip -o deploy.zip && rm deploy.zip
mkdir -p server && mv src package.json package-lock.json Dockerfile server/
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 15. Automating My Deployment with CI/CD

To stop doing the manual runbook every time, I set up GitHub Actions so my VM updates automatically whenever I push to `main`.

### Step 1 — Add my GitHub secrets

In my GitHub repository settings → **Secrets and Variables** → **Actions**, I added:
- `SSH_PRIVATE_KEY` — the contents of my `kanboard-vm_key.pem` private key
- `VM_PUBLIC_IP` — my VM's public IP (`104.214.171.72`)

### Step 2 — My workflow file

I created `.github/workflows/deploy.yml`:

```yaml
name: Deploy Kanboard to Azure VM

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set Up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install Frontend Dependencies
        run: npm ci

      - name: Build Frontend Assets
        env:
          VITE_API_URL: http://${{ secrets.VM_PUBLIC_IP }}/api
          VITE_SOCKET_URL: http://${{ secrets.VM_PUBLIC_IP }}
        run: npm run build

      - name: Create Deploy Zip
        run: zip -r deploy.zip server/src server/package.json server/package-lock.json server/Dockerfile dist docker-compose.prod.yml Caddyfile

      - name: Copy Files to Azure VM via SSH
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VM_PUBLIC_IP }}
          username: kanboard
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "deploy.zip"
          target: "~/kanboard/"

      - name: Execute Deploy Commands on VM
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VM_PUBLIC_IP }}
          username: kanboard
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/kanboard
            unzip -o deploy.zip && rm deploy.zip
            mkdir -p server && mv src package.json package-lock.json Dockerfile server/
            docker compose -f docker-compose.prod.yml up -d --build
```

Now every push to `main` triggers: build my frontend → zip the deployable assets → copy them to my VM over SSH → extract and restart my Docker containers, with zero manual steps on my end.

---

## 16. Closing Notes

This document is my attempt to capture not just what Kanboard *is*, but the reasoning behind every major decision I made — why I chose Caddy over Nginx, why PM2 doesn't belong inside my Docker setup, why I split roles into owner/admin/member the way I did, and every bug that taught me something about my own stack.

If I come back to this project later, or hand it off to someone else, my hope is that reading this top to bottom gives them (or future me) the same mental model I was carrying while I built it — not just the "how," but the "why."