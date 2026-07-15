# Kanboard — Database Schema & Indexes

Kanboard uses a relational database schema designed in PostgreSQL. This document outlines the tables, data types, constraints, and optimization indexes.

---

## 📊 Table Specifications

### 1. `users`
Stores user profile information and authentication credentials.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` | Unique user identifier. |
| `name` | `VARCHAR(200)` | `NOT NULL` | Full name of the user. |
| `email` | `VARCHAR(320)` | `NOT NULL`, `UNIQUE` | Unique email for authentication. |
| `password` | `VARCHAR(200)` | `NOT NULL` | Bcrypt-hashed password. |
| `avatar_url` | `TEXT` | `NULL` | Optional link to user avatar image. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Registration timestamp. |

### 2. `boards`
Defines Kanban workspaces.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` | Unique board identifier. |
| `title` | `VARCHAR(200)` | `NOT NULL` | Board title. |
| `description` | `TEXT` | `NULL` | Board purpose or metadata. |
| `color` | `VARCHAR(20)` | default `#2f8159` | Primary aesthetic color (hex code). |
| `owner_id` | `UUID` | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE` | Creator of the board. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Last modification timestamp. |

### 3. `board_members`
Intermediate lookup table mapping users to boards with specific permissions.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `board_id` | `UUID` | `PRIMARY KEY`, `REFERENCES boards(id) ON DELETE CASCADE` | The target board. |
| `user_id` | `UUID` | `PRIMARY KEY`, `REFERENCES users(id) ON DELETE CASCADE` | The member user. |
| `role` | `VARCHAR(20)` | default `member`, check (`owner`, `admin`, `member`) | Access rights of the member. |
| `joined_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Join timestamp. |

### 4. `columns`
Represents stages in the Kanban pipeline.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` | Unique column identifier. |
| `board_id` | `UUID` | `NOT NULL`, `REFERENCES boards(id) ON DELETE CASCADE` | The parent board. |
| `title` | `VARCHAR(200)` | `NOT NULL` | Stage name (e.g. "Todo"). |
| `task_ids` | `UUID[]` | default `{}` | Array of task IDs defining card order inside the column. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Creation timestamp. |

### 5. `tasks`
Stores actionable tickets.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` | Unique task identifier. |
| `board_id` | `UUID` | `NOT NULL`, `REFERENCES boards(id) ON DELETE CASCADE` | The parent board. |
| `column_id` | `UUID` | `NOT NULL`, `REFERENCES columns(id) ON DELETE CASCADE` | Current pipeline stage. |
| `title` | `VARCHAR(500)` | `NOT NULL` | Task summary. |
| `description` | `TEXT` | `NULL` | Detailed description or subtasks list. |
| `priority` | `VARCHAR(20)` | default `medium`, check (`low`, `medium`, `high`, `urgent`) | Importance ranking. |
| `due_date` | `DATE` | `NULL` | Task deadline. |
| `assignee_id` | `UUID` | `REFERENCES users(id) ON DELETE SET NULL` | Assigned teammate. |
| `created_by` | `UUID` | `REFERENCES users(id) ON DELETE SET NULL` | Task creator. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Modification timestamp. |

### 6. `activities`
Tracks system events for board audit trails.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` | Unique activity identifier. |
| `board_id` | `UUID` | `NOT NULL`, `REFERENCES boards(id) ON DELETE CASCADE` | Affected board. |
| `user_id` | `UUID` | `REFERENCES users(id) ON DELETE SET NULL` | User who triggered the action. |
| `action` | `VARCHAR(100)` | `NOT NULL` | Event type (e.g. `task.created`). |
| `message` | `TEXT` | `NOT NULL` | Description of the action (human readable). |
| `meta` | `JSONB` | default `{}` | Optional payload (old/new values). |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Event timestamp. |

---

## ⚡ Performance Optimization Indexes

To ensure queries remain fast as data grows, the following database indexes are applied:

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
