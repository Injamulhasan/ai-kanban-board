# Kanboard — Developer to Deployment Guide

This document is an in-depth reference log detailing the complete engineering lifecycle of the Kanboard application. It compiles all design decisions, architectural considerations, troubleshooting history, configuration solutions, and deployment procedures.

---

## 📖 Table of Contents
1. [Application Architecture & Lifecycles](#1-application-architecture--lifecycles)
2. [Local Development vs. Production Environments](#2-local-development-vs-production-environments)
3. [Why Caddy and Not Alternatives?](#3-why-caddy-and-not-alternatives)
4. [Why PM2 is Unnecessary in Docker](#4-why-pm2-is-unnecessary-in-docker)
5. [Docker on Azure VM: Tradeoffs & Scaling](#5-docker-on-azure-vm-tradeoffs--scaling)
6. [Resolved Technical Challenges & Fixes](#6-resolved-technical-challenges--fixes)
7. [Manual Deployment Runbook](#7-manual-deployment-runbook)
8. [Automated Deployment Solution (CI/CD via GitHub Actions)](#8-automated-deployment-solution-cicd-via-github-actions)

---

## 1. Application Architecture & Lifecycles

Kanboard is built as a monorepo consisting of:
*   **Frontend**: React (Vite, TailwindCSS, `@dnd-kit/sortable`).
*   **Backend**: Express.js REST API with Socket.IO for WebSocket events.
*   **Database**: PostgreSQL.
*   **AI Integration**: Google Gemini SDK (`gemini-2.0-flash`).

### Core User Flows:
1.  **Register/Login**: Users create an account. Password is encrypted using `bcrypt` (12 rounds) on the backend. The backend issues a JWT containing the user ID, name, and email. The frontend stores this JWT in `localStorage` and appends it as a Bearer token in Axios HTTP headers.
2.  **Board Access & Real-Time Sync**: When a user enters a board, a Socket.IO connection is initialized. The socket handshakes with the backend using the JWT. Upon joining, the client enters a virtual Socket.IO room named `board:<id>` to isolate communication.
3.  **Presence**: Other users joining the same board emit `presence:join` events. An active connection list is synchronized on the client to show who is currently working on the board.

---

## 2. Local Development vs. Production Environments

Professional development requires strict isolation between your local environment (development) and the cloud environment (production):

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

### Why we use Docker locally:
1.  **Isolation**: Instead of installing PostgreSQL directly on Windows (which leaves persistent background services running), Docker runs PostgreSQL inside an isolated sandbox.
2.  **Seed Capability**: Running `npm run seed` drops and recreates tables locally within 1 second. This allows developers to test code without risking cloud data.
3.  **Consistency**: Docker ensures the PostgreSQL engine running on your local machine behaves identically to the one on the Azure server.

---

## 3. Why Caddy and Not Alternatives?

We use Caddy as our production web server and reverse proxy on the Azure VM. Here is how Caddy compares to other technologies:

| Web Server | Strengths | Weaknesses | Why we did/didn't choose it |
| :--- | :--- | :--- | :--- |
| **Caddy** | <ul><li>Automatic HTTPS (Let's Encrypt out-of-the-box)</li><li>Super clean config syntax</li><li>Built-in WebSocket support</li></ul> | <ul><li>Slightly smaller community than Nginx</li></ul> | **Chosen**: Extremely simple to set up, handles Socket.IO without manual WebSocket headers, and automatically manages SSL for domains. |
| **Nginx** | <ul><li>Industry standard</li><li>High performance</li><li>Extremely low memory footprint</li></ul> | <ul><li>Verbose configurations</li><li>Websockets require manual HTTP header overrides</li><li>SSL requires installing certbot and configuring cron jobs</li></ul> | **Alternative**: Great for high-traffic, but requires significantly more configuration overhead than Caddy. |
| **Traefik** | <ul><li>Auto-discovers containers using Docker labels</li><li>Designed for microservices</li></ul> | <ul><li>Cannot serve static files directly (requires Nginx or Caddy behind it to serve `/dist`)</li></ul> | **Not Chosen**: Too complex for a single-VM monorepo deployment. |
| **Express** | <ul><li>Allows a single container setup</li></ul> | <ul><li>Node.js is single-threaded; serving large static assets blocks the CPU and degrades API/WebSocket speeds</li></ul> | **Not Chosen**: Violates the separation of concerns. Static assets should always be offloaded to a compiled web server. |

---

## 4. Why PM2 is Unnecessary in Docker

In standard VM deployments (bare-metal Node deployments), PM2 is mandatory to prevent the node process from terminating when you log out of the SSH session. In Docker, **PM2 is redundant** because:

1.  **Container Supervision**: Docker acts as the supervisor. The `restart: always` directive in `docker-compose.prod.yml` ensures that if the node process crashes inside the container, Docker automatically restarts the container.
2.  **Daemonization**: Running `docker compose up -d` detaches the process, running it in the background natively.
3.  **Logs**: Docker captures `stdout` and `stderr` natively. You inspect logs via `docker logs kanboard-backend` rather than `pm2 logs`.

---

## 5. Docker on Azure VM: Tradeoffs & Scaling

### Advantages of Azure VM + Docker:
*   **Infrastructure Ownership**: You get complete root access to the OS, allowing you to tweak PostgreSQL parameters, inspect network logs, and configure security tools.
*   **Scalability**:
    *   **Vertical**: You can upgrade the VM size (e.g. from B1s to D2s) in 1 click. Docker automatically adapts to the new CPU and RAM without configuration edits.
    *   **Horizontal**: You can host your PostgreSQL database on a managed instance (like Supabase or Azure Database for PostgreSQL) and run multiple backend containers behind an Azure Load Balancer.

### Drawbacks:
*   **Manual Security**: You are responsible for upgrading the Ubuntu OS, patching vulnerabilities, and firewall configurations.
*   **Single Point of Failure**: If the single VM goes down, your database and web server both go offline.

---

## 6. Resolved Technical Challenges & Fixes

During the development and integration phase, we resolved three critical issues.

### Fix 1: Login Credentials Autofill Mismatch
*   **Issue**: The frontend "Use demo account" button was hardcoded to autofill `alex@timetoprogram.com` from the mock data, whereas the database seed script populated `alex@kanboard.dev`. This returned "Invalid credentials" when logging in.
*   **Solution**: Modified [Login.jsx](file:///f:/personal-projects/ai-kanban-board/src/pages/Login.jsx#L17-L19) to autofill the correct email `alex@kanboard.dev`:
    ```javascript
    const fillDemo = () =>
      setForm({ email: "alex@kanboard.dev", password: "Test@1234" });
    ```

### Fix 2: Lost Express Route Parameters (`mergeParams`)
*   **Issue**: Accessing nested routes (like column creation and task moves) returned `null value in column "board_id" violates not-null constraint`. Express routers do not merge parameters from parent routers by default, so `req.params.boardId` was undefined.
*   **Solution**: Updated the parent router mounts in [boards.js](file:///f:/personal-projects/ai-kanban-board/server/src/routes/boards.js#L30-L33) to use the parameter name `:boardId` instead of `:id`. This enabled Express's `mergeParams: true` inside the child routers to capture the ID automatically:
    ```diff
    -router.use("/:id/tasks", requireBoardMember, taskRoutes);
    +router.use("/:boardId/tasks", requireBoardMember, taskRoutes);
    ```

### Fix 3: Caddy `try_files` Overwriting POST Requests (405 Error)
*   **Issue**: Login requests to the live server returned `Request failed with status code 405`. In Caddy, `try_files` is evaluated *before* `reverse_proxy` by default. Caddy rewrote `/api/auth/login` to the static `/index.html` file, and then the static file server threw a 405 error because POST is not allowed on static files.
*   **Solution**: Grouped Caddy routes into mutually exclusive `handle` blocks in the [Caddyfile](file:///f:/personal-projects/ai-kanban-board/Caddyfile#L1-L20) so `/api/*` and `/socket.io/*` bypass the static file server entirely:
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

## 7. Manual Deployment Runbook

Follow these commands to deploy updates manually.

### 1. Build Frontend Locally
On your local PC, update the [.env](file:///f:/personal-projects/ai-kanban-board/.env) file with the VM public IP:
```env
VITE_API_URL=http://<YOUR_VM_PUBLIC_IP>/api
VITE_SOCKET_URL=http://<YOUR_VM_PUBLIC_IP>
```
Then run the build:
```bash
npm run build
```

### 2. Compress and Upload files
Zip only the deployable assets (excluding local `node_modules`):
```powershell
powershell -Command "Compress-Archive -Path server/src, server/package.json, server/package-lock.json, server/Dockerfile, dist, docker-compose.prod.yml, Caddyfile -DestinationPath deploy.zip -Force"
```
Transfer the archive to the VM:
```bash
scp -i "C:\path\to\key.pem" deploy.zip kanboard@<YOUR_VM_PUBLIC_IP>:~/kanboard/deploy.zip
```

### 3. Deploy on the VM
SSH into the VM, extract files, organize the folders, and restart Docker:
```bash
ssh -i "C:\path\to\key.pem" kanboard@<YOUR_VM_PUBLIC_IP>

# Inside the VM:
cd ~/kanboard
unzip -o deploy.zip && rm deploy.zip
mkdir -p server && mv src package.json package-lock.json Dockerfile server/
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 8. Automated Deployment Solution (CI/CD via GitHub Actions)

To automate deployments so your VM updates whenever you push code to GitHub:

1.  **Add GitHub Secrets**: In your GitHub Repository Settings → **Secrets and Variables** → **Actions**, add a new secret named `SSH_PRIVATE_KEY` and paste the contents of your `kanboard-vm_key.pem` private key.
2.  **Add the Workflow File**: Create a new file at `.github/workflows/deploy.yml` with the following configuration:

#### [NEW] [.github/workflows/deploy.yml](file:///f:/personal-projects/ai-kanban-board/.github/workflows/deploy.yml)
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
*(Make sure to also add `VM_PUBLIC_IP` as a GitHub secret with the value `104.214.171.72`).*
