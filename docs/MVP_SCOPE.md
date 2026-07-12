# Kanboard — MVP Functional Scope

This document defines the functional scope implemented in the Minimum Viable Product (MVP) of the Kanboard application.

---

## 🎯 Core Features in Scope

### 1. User Authentication
*   User registration with validated parameters (Name, unique Email, secure Password).
*   Password security using hashing (`bcrypt`).
*   Session security via signed JWT (JSON Web Tokens).
*   Automatic token re-validation on page refreshes.
*   Security route guards on React router (`/dashboard` and `/board/*` require login).

### 2. Boards Management
*   Create new boards with a title, optional description, and a primary brand color.
*   Rename and recolor boards dynamically.
*   Delete boards (cascades deletion to members, columns, tasks, and activities).
*   Differentiated dashboard sections: "My Boards" (boards you own) and "Shared with You" (boards you were invited to).
*   Live counts of active tasks per board shown on the dashboard.

### 3. Columns Pipeline
*   Add, rename, and delete columns on a board.
*   Custom sort ordering per column using floating-point positions.

### 4. Tasks (Tickets)
*   Full CRUD operations on task cards.
*   Detailed modal display:
    *   Title and rich text description.
    *   Priority indicator (checks: `low`, `medium`, `high`, `urgent`).
    *   Due date calendar selector.
    *   Assignee dropdown listing verified board members.
*   Midpoint floating-point calculations for `O(1)` drag-and-drop ordering persistence.

### 5. Collaboration & Sharing
*   Team members panel: search users by email.
*   Invite members to boards with specific role designations:
    *   `owner`: Full board modification, deleting the board, administrative rights.
    *   `admin`: Invite new members, change member roles, update board details, edit columns/tasks.
    *   `member`: Create, edit, move, and assign tasks. Cannot rename columns, modify board details, or invite others.
*   Activity logs feed showing recent actions on the board.

### 6. Google Gemini AI Engine
*   **AI Task Generator**: Create structured task backlogs inside a board based on a text prompt goal.
*   **AI Task Breakdown**: Deconstruct a task card description into a subtask checklist inside the modal.
*   **AI Board Summary**: Analyze current status, completed tickets, active work, and blocker warnings to output a roadmap summary.

---

## 🚫 Out of Scope (Future Roadmap)

These features were intentionally excluded from the MVP to focus on reliability:
*   **OAuth Single Sign-On**: Log in with Google, GitHub, or Microsoft.
*   **Attachments File Upload**: Uploading PNG/PDF attachments directly inside the task modal.
*   **Comments System**: Interactive comments feed inside the task modal with @mentions.
*   **Time Tracking**: Start/stop timer on task cards.
*   **Gantt Chart & Calendar Views**: Alternative visual timelines of the boards.
*   **Email Notifications**: Send emails when tasks are assigned or comments are added.
