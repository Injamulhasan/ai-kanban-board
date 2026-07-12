# Kanboard — System Architecture & Flows

This document details the high-level architecture, database schema, and operational lifecycles of the Kanboard application. It serves as a guide to help developers and AI agents understand the codebase design.

---

## 🏛️ High-Level System Architecture

Kanboard uses a **three-tier architecture** containerized via Docker for execution consistency:

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

---

## 💾 Database Schema

The PostgreSQL database stores 6 tables with foreign keys and cascade deletions.

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

---

## 🔄 Core Operational Lifecycles

### 1. Drag-and-Drop Reordering Lifecycle
To ensure performance feels instantaneous, Kanboard uses **optimistic UI updates** combined with backend persistence.

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

### 2. Live Presence Tracking Lifecycle
The real-time collaboration and presence system uses **Socket.IO** rooms to track active users.

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

### 3. Google Gemini AI Generation Flow
The system queries the `gemini-2.0-flash` model using structured JSON prompts.

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
