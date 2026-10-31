# DevSync — Local Setup, Database Configuration & Execution Guide

This document provides exact, reproducible instructions to configure, run, and audit DevSync locally.

---

## 1. Prerequisites & Environment Requirements

| Dependency | Minimum Version | Verified Version | Purpose |
|---|---|---|---|
| **Node.js** | `>=20.x` | `v26.12.1` | JavaScript execution runtime |
| **npm** | `>=10.x` | `10.8.2` | Package manager |
| **PostgreSQL** | `>=15.x` | `16.x` | Relational database server |
| **Google Cloud Account** | Standard | Free Tier | Google OAuth Client ID & Secret |
| **GitHub Account** | Standard | Free Tier | GitHub OAuth App & Webhook Secret |

---

## 2. PostgreSQL Database Setup

1. Start your local PostgreSQL service:
   ```bash
   sudo systemctl start postgresql
   ```
2. Open the PostgreSQL terminal:
   ```bash
   sudo -u postgres psql
   ```
3. Create the database and user with appropriate permissions:
   ```sql
   CREATE USER devsync WITH PASSWORD 'devsync';
   CREATE DATABASE devsync OWNER devsync;
   GRANT ALL PRIVILEGES ON DATABASE devsync TO devsync;
   \q
   ```

---

## 3. Environment Variable Configuration

### Backend Environment Configuration
Copy the template in `devsync/server/.env.example` to `devsync/server/.env`:

```bash
cd /home/gdp/Projects/skill-lab2/devsync/server
cp .env.example .env
```

Ensure the following configuration keys are present:

```env
# Server Runtime
PORT=5000
NODE_ENV=development
CLIENT_URL="http://localhost:5173"

# PostgreSQL Connection String
DATABASE_URL="postgresql://devsync:devsync@127.0.0.1:5432/devsync?schema=public"

# Authentication Security
JWT_SECRET="your-super-secret-devsync-jwt-key-2026"

# GitHub OAuth & Integration
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
GITHUB_CALLBACK_URL="http://localhost:5000/api/github/callback"
GITHUB_WEBHOOK_SECRET="your-devsync-webhook-secret"
GITHUB_TOKEN_ENCRYPTION_KEY="your-32-character-secret-key!"

# Google OAuth 2.0
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"
```

---

## 4. Prisma Setup & Database Synchronization

Navigate to the server directory:
```bash
cd /home/gdp/Projects/skill-lab2/devsync/server

# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Synchronize Database Schema
npx prisma db push

# 4. (Optional) Seed Initial Data
npm run prisma:seed
```

---

## 5. Running the Application in Development Mode

### Terminal 1: Backend Server (Port 5000)
```bash
cd /home/gdp/Projects/skill-lab2/devsync/server
npm run dev
```
*Expected terminal output:*
```text
[09:22:38] [SYSTEM] 🚀 DevSync Server running on http://localhost:5000
```

### Terminal 2: Frontend Client (Port 5173)
```bash
cd /home/gdp/Projects/skill-lab2/devsync/client
npm install
npm run dev
```
*Expected terminal output:*
```text
  VITE v5.4.10  ready in 240 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Access the application in your browser at: **`http://localhost:5173`**

---

## 6. Pre-Configured Demo Accounts for Testing

If the database was seeded using `npm run prisma:seed`, the following accounts are available (Password: `password123`):

| Name | Email | Global Role | Purpose |
|---|---|---|---|
| **Alex Rivers** | `alex@devsync.io` | `LEAD` | Project Owner & Engineering Lead |
| **Sarah Chen** | `sarah@devsync.io` | `DEVELOPER` | Senior Developer & Reviewer |
| **Marcus Vance** | `marcus@devsync.io` | `INTERN` | Contributing Intern |

---

## 7. Production Build Verification

To verify that both frontend and backend compile for production without errors:

```bash
# 1. Build Backend
cd /home/gdp/Projects/skill-lab2/devsync/server
npm run build
# Compiles TypeScript into server/dist/

# 2. Build Frontend
cd /home/gdp/Projects/skill-lab2/devsync/client
npm run build
# Generates production distribution in client/dist/
```

---

## 8. Database Inspection Using pgAdmin 4

To inspect the tables, constraints, foreign keys, and indexes visually:

1. Launch pgAdmin 4 in your browser or desktop.
2. Register a new server connection:
   - **General Tab:** Name: `DevSync Local`
   - **Connection Tab:**
     - Host: `127.0.0.1`
     - Port: `5432`
     - Maintenance Database: `devsync`
     - Username: `devsync`
     - Password: `devsync`
3. Expand **Servers → DevSync Local → Databases → devsync → Schemas → public → Tables**.
4. You will observe the 8 tables:
   - `User`
   - `Project`
   - `ProjectMember`
   - `Task`
   - `Activity`
   - `GitHubConnection`
   - `ProjectRepository`
   - `TaskPullRequest`
5. Right-click any table and choose **View/Edit Data → All Rows** to inspect records in real time.

