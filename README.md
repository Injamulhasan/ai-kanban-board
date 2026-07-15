# Kanboard — AI-Powered Kanban Board

Kanboard is a production-ready, full-stack Kanban board featuring real-time collaboration, drag-and-drop task organization, presence tracking, and built-in AI helpers powered by Google Gemini.

Designed with a premium, minimalist light aesthetic, Kanboard runs on a PERN stack (PostgreSQL, Express, React, Node) containerized via Docker and deployed on an Azure Virtual Machine.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
*   Node.js (v20+)
*   Docker & Docker Compose

### Running the App
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Injamulhasan/ai-kanban-board.git
    cd ai-kanban-board
    ```
2.  **Start the Local PostgreSQL Database**:
    ```bash
    docker compose up -d
    ```
3.  **Set Up Environment Files**:
    *   **Backend (`server/.env`)**:
        ```env
        DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kanboard
        JWT_SECRET=your-secret-key
        GEMINI_API_KEY=your-gemini-api-key
        PORT=5050
        CLIENT_URL=http://localhost:5173
        ```
    *   **Frontend (`.env`)**:
        ```env
        VITE_API_URL=http://localhost:5050/api
        VITE_SOCKET_URL=http://localhost:5050
        ```
4.  **Install Dependencies & Generate Prisma Client**:
    *   Install root & frontend dependencies: `npm install`
    *   Install backend dependencies: `npm install --prefix server`
    *   Generate local Prisma Client: `npx --prefix server prisma generate`
5.  **Seed the Database**:
    ```bash
    npm --prefix server run seed
    ```
6.  **Launch the Application**:
    ```bash
    npm run dev
    ```
    *This starts both the React frontend (on port 5173) and the Express backend (on port 5050) concurrently.*

7.  **Log In**:
    *   **Email**: `alex@kanboard.dev`
    *   **Password**: `Test@1234`

---

## 📂 Project Directory Structure

```
ai-kanban-board/
├── Caddyfile                   # Production web server proxy config
├── Dockerfile                  # Multi-stage Dockerfile for React and Caddy
├── docker-compose.yml          # Local database compose configuration
├── docker-compose.prod.yml     # Production full-stack compose configuration
├── package.json                # Root frontend scripts & concurrently setup
├── docs/                       # Developer documentation & system context
│   ├── AGENT_CONTEXT.md        # Agent takeover guide & context
│   ├── DATABASE_SCHEMA.md      # Database tables and indexes reference
│   └── architecture.md         # System flows and architecture
├── server/                     # Backend API Server
│   ├── Dockerfile              # Production backend container build script
│   ├── prisma/                 # Prisma ORM Schema folder
│   ├── prisma.config.ts        # Prisma configurations
│   ├── package.json            # Server script configurations & dependencies
│   └── src/                    # Backend source code (Controllers, Services, Routes, DB)
└── src/                        # Frontend source code
    ├── store/                  # Redux Toolkit store and slices configuration
    ├── components/             # React visual components
    └── hooks/                  # Custom React hooks (useBoard, etc.)
```

---

## 🚀 Deployment (CI/CD)

The application is deployed on an **Azure VM** (Ubuntu) using **Docker**, **Caddy**, and **Redis**. The deployment is fully automated via **GitHub Actions**.

### Triggering a Deploy
Pushes to the `main` branch trigger a GitHub Actions runner that:
1.  Zips the source code, configurations, and environment variables into `deploy.zip`.
2.  Uploads the archive to the Azure VM via SSH (`scp`).
3.  Logs in to the VM, extracts the files, and rebuilds the containers (`docker compose -f docker-compose.prod.yml up -d --build`). The frontend Vite build and Prisma client generation are executed entirely inside the multi-stage Docker build process on the target VM, avoiding local runner compilation overhead.

*For details on how to set up the repository secrets (`SSH_PRIVATE_KEY` and `VM_PUBLIC_IP`), read the [CI/CD Automation Documentation](file:///f:/personal-projects/ai-kanban-board/kanboard.md#15-automating-my-deployment-with-cicd).*

---

## 📘 Developer Resources

*   For an in-depth understanding of the database schema, frontend-backend lifecycles, and network architecture, refer to the [System Architecture Document](file:///f:/personal-projects/ai-kanban-board/docs/architecture.md).
*   For the complete history of technical challenges, fixes, manual deployment scripts, and automated GitHub Actions guides, read the consolidated [Kanboard Developer & Deployment Guide](file:///f:/personal-projects/ai-kanban-board/kanboard.md).
