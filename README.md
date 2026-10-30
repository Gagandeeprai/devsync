# DevSync — Full-Stack Developer Collaboration Platform

> **Academic Course / Lab Submission**: Full Stack Development Skill Lab  
> **Author**: Senior Full-Stack Engineering Candidate  
> **Status**: Verified & Production Ready  
> **License**: MIT

---

## 📌 Executive Summary

**DevSync** is a developer collaboration and project delivery platform inspired by modern engineering tools such as Linear. Built with a focus on high throughput, responsive drag-and-drop workflows, and clean architectural separation of concerns, DevSync allows development teams to manage repositories, coordinate issue tracking, visualize delivery pipelines across a 5-stage Kanban board, and monitor engineering velocity in real time.

All metrics and state transitions are backed by a **PostgreSQL** database managed through **Prisma ORM** with full transaction and relationship cascading.

---

## 🖼️ Application Interface & Screenshots

Real screenshots captured directly from the running application:

### 1. Developer Dashboard
![Dashboard](docs/screenshots/02_dashboard.png)
*Dynamic engineering metrics, segmented task progress breakdown, priority distribution, and real-time activity feed.*

### 2. Interactive Kanban Board
![Kanban Board](docs/screenshots/03_kanban.png)
*Drag-and-drop workflow delivery across Backlog, Todo, In Progress, Review, and Done with instantaneous PostgreSQL persistence.*

### 3. Project Management
![Projects](docs/screenshots/04_projects.png)
*Repository milestones, delivery deadlines with automated overdue warnings, and task completion percentages.*

### 4. Task Management
![Tasks](docs/screenshots/05_tasks.png)
*Searchable, multi-parameter filtered task list with one-click completion checkboxes and assignee indicators.*

### 5. Authentication & 1-Click Access
![Login](docs/screenshots/01_login.png)
*Stateless JWT authentication with bcrypt password hashing and 1-click evaluation profiles for faculty review.*

### 6. Team & Infrastructure Settings
![Settings](docs/screenshots/06_settings.png)
*User profile management, instantaneous team member role switching, and live system architecture telemetry.*

---

## 🏗️ Technology Stack

| Layer | Technologies | Justification & Purpose |
|---|---|---|
| **Frontend Framework** | **React 18** (TypeScript) | Component-driven declarative UI with strict type safety. |
| **Bundler & Dev Server**| **Vite 5** | Sub-second HMR, instant cold start, and optimized Rollup tree-shaking. |
| **Styling & Design** | **Tailwind CSS**, **shadcn/ui** patterns | Dark-mode-first Linear aesthetic (`#090a0f`, `#12131a`), custom surfaces, glowing accents. |
| **State Management** | **Zustand 5** | Lightweight, boilerplate-free state stores for Auth, Projects, Tasks, and UI Modals. |
| **Client Routing** | **React Router 6** | Declarative client-side routing with `ProtectedRoute` guards and URL query parameter sync. |
| **Icons & Utilities** | **Lucide Icons**, **date-fns**, **clsx** | Standard iconography, distance-to-now time formatting, and dynamic class merging. |
| **Backend Runtime** | **Node.js 26**, **Express 4** (TypeScript) | High-performance asynchronous REST API with typed request handlers. |
| **ORM & Database** | **Prisma ORM 5**, **PostgreSQL 18** | Strongly typed SQL query generation, automated schema migrations, and relation cascading. |
| **Authentication** | **JWT (jsonwebtoken)**, **bcryptjs** | Stateless HMAC SHA-256 token authorization with salted bcrypt password hashing. |
| **Input Validation** | **Zod 3** | Runtime schema validation with typed error extraction and boundary limits. |

---

## 🏛️ Architecture & System Design

DevSync is structured as an isolated two-tier client/server architecture with a shared Prisma database layer:

```
skill-lab2/
├── client/                     # Frontend Single Page Application (SPA)
│   ├── src/
│   │   ├── api/                # Axios/Fetch API client with JWT interceptors
│   │   ├── components/
│   │   │   ├── layout/         # AppLayout, Sidebar, Header
│   │   │   ├── modals/         # CreateProjectModal, CreateTaskModal, TaskDetailModal
│   │   │   └── ui/             # Button, Card, Input, Skeleton, EmptyState, Badge, Avatar, ToastContainer
│   │   ├── lib/                # Utility helpers (cn, date-fns formatters, badge styling configs)
│   │   ├── pages/              # Dashboard, Projects, ProjectDetail, Tasks, Kanban, Settings, Login, Register
│   │   ├── store/              # Zustand stores (authStore, projectStore, taskStore, uiStore)
│   │   └── types/              # Domain TypeScript interfaces
│   ├── index.html
│   └── vite.config.ts          # Reverse proxy mapping /api -> http://localhost:5000
│
├── server/                     # Backend REST API Service
│   ├── prisma/
│   │   ├── schema.prisma       # Relational models, constraints, enums, indexes
│   │   ├── migrations/         # Applied migration SQL history
│   │   ├── setup.sql           # Turnkey idempotent PostgreSQL database initialization
│   │   └── seed.ts             # Realistic academic seed data
│   └── src/
│       ├── config/             # Database client singleton and environment variables
│       ├── controllers/        # auth, project, task, dashboard, and user controllers
│       ├── middleware/         # auth (JWT), errorHandler (Zod & Prisma errors)
│       ├── routes/             # Express router declarations
│       └── index.ts            # Application bootstrap with CORS and request logging
│
├── docs/screenshots/           # Verified live system screenshots
├── .env.example                # Unified environment variables template
└── package.json                # Monorepo task orchestration scripts
```

---

## 🗄️ Database Schema & Relationships

### Entity Relationship Model

```
+-------------------------------------------------------+
|                         User                          |
+-------------------------------------------------------+
| id            : String (UUID, Primary Key)            |
| email         : String (Unique, Indexed)              |
| passwordHash  : String                                |
| name          : String                                |
| avatarUrl     : String?                               |
| role          : UserRole (ADMIN | LEAD | DEVELOPER)   |
| createdAt     : DateTime                              |
| updatedAt     : DateTime                              |
+-------------------------------------------------------+
        | 1                     | 1                 | 1
        | owns                  | creates           | assigned
        v N                     v N                 v N
+--------------------+  +-----------------------------------------------+
|      Project       |  |                     Task                      |
+--------------------+  +-----------------------------------------------+
| id          : UUID |  | id          : String (UUID, Primary Key)      |
| name        : Str  |  | title       : String                          |
| description : Str? |  | description : String?                         |
| status      : Enum |  | status      : TaskStatus (Indexed)            |
| deadline    : Date?|  | priority    : TaskPriority (Indexed)          |
| ownerId     : UUID |  | dueDate     : DateTime?                       |
| createdAt   : Date |  | order       : Float (Kanban Column Position)  |
| updatedAt   : Date |  | projectId   : String (UUID, Foreign Key)      |
+--------------------+  | assigneeId  : String? (UUID, Foreign Key)     |
        | 1             | creatorId   : String (UUID, Foreign Key)      |
        | has           | createdAt   : DateTime                        |
        v N             | updatedAt   : DateTime                        |
+--------------------+  +-----------------------------------------------+
|      Activity      |                          | 1
+--------------------+                          | has
| id        : UUID   |<-------------------------+
| action    : String |
| details   : String |
| userId    : UUID   |
| projectId : UUID?  |
| taskId    : UUID?  |
| createdAt : Date   |
+--------------------+
```

### Relational Constraints
- **Project Ownership**: `Project.ownerId -> User.id` (onDelete: Cascade).
- **Task Association**: `Task.projectId -> Project.id` (onDelete: Cascade). Deleting a project automatically deletes all related tasks and activities.
- **Task Assignment**: `Task.assigneeId -> User.id` (onDelete: SetNull). Removing a user leaves the task assigned as unassigned rather than breaking data integrity.
- **Audit Logging**: `Activity` records user actions with foreign keys to `User`, `Project`, and `Task`.

---

## 📡 REST API Documentation

All routes (except `/api/auth/register`, `/api/auth/login`, and `/api/health`) require a valid JWT passed in the Authorization header: `Bearer <token>`.

### 1. Authentication Endpoints
- `POST /api/auth/register` — Create new user account with bcrypt password hashing.
- `POST /api/auth/login` — Authenticate credentials and receive stateless JWT.
- `GET /api/auth/me` — Retrieve current authenticated user profile.
- `PUT /api/auth/profile` — Update user name and avatar URL.

### 2. Project Endpoints
- `GET /api/projects` — List all projects with aggregated task counts, completed tasks, and completion %.
- `GET /api/projects/:id` — Get project details with associated tasks and lead profile.
- `POST /api/projects` — Create project (`name`, `description`, `status`, `deadline`).
- `PUT /api/projects/:id` — Update project attributes (Enforces Owner, Lead, or Admin permissions).
- `DELETE /api/projects/:id` — Delete project and cascade associated tasks (Enforces Owner, Lead, or Admin permissions).

### 3. Task Endpoints
- `GET /api/tasks` — List tasks with multi-parameter filtering (`projectId`, `status`, `priority`, `assigneeId`, `search`).
- `GET /api/tasks/:id` — Get detailed task information.
- `POST /api/tasks` — Create new task with automatic column ordering.
- `PUT /api/tasks/:id` — Update task details, priority, assignee, and due date.
- `PATCH /api/tasks/:id/status` — Drag-and-drop Kanban status and order update.
- `DELETE /api/tasks/:id` — Delete task (Enforces Creator, Project Owner, Lead, or Admin permissions).

### 4. Dashboard & Team Endpoints
- `GET /api/dashboard/stats` — Real-time PostgreSQL aggregation of total projects, tasks, completed/pending tasks, priority counts, status distribution, and recent audit logs.
- `GET /api/users` — List team members for task assignment.
- `GET /api/health` — Service healthcheck.

---

## ⚙️ Installation & Local Setup

### Prerequisites
- **Node.js** (v18.x or v20.x+)
- **PostgreSQL** (v14+) running locally on port `5432`

### Step 1: Database Setup
Ensure PostgreSQL is active. You can initialize the database using the provided SQL setup script:
```bash
psql -U postgres -f server/prisma/setup.sql
```
*(Alternatively, create database manually: `createdb devsync`)*

### Step 2: Environment Variables
Create `.env` in `server/` (or copy from `server/.env.example`):
```bash
cp server/.env.example server/.env
```
Ensure database credentials match your PostgreSQL instance:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://devsync:devsync@127.0.0.1:5432/devsync?schema=public"
JWT_SECRET="super-secret-devsync-jwt-key-2026-very-secure"
CLIENT_URL="http://localhost:5173"
```

Create `.env` in `client/` (or copy from `client/.env.example`):
```bash
cp client/.env.example client/.env
```
```env
VITE_API_BASE_URL="/api"
```

### Step 3: Install Dependencies
From the repository root:
```bash
npm run install:all
```

### Step 4: Run Migrations & Database Seed
```bash
# Apply schema migration to PostgreSQL
npm run prisma:migrate

# Seed demo developers, projects, and tasks
npm run prisma:seed
```

### Step 5: Start the Application
Run both backend and frontend concurrently:

In Terminal 1 (Backend API):
```bash
npm run server
# Output: 🚀 DevSync Server running on http://localhost:5000
```

In Terminal 2 (Frontend Client):
```bash
npm run client
# Output: ➜  Local:   http://localhost:5173/
```

Access the application in your browser at: **`http://localhost:5173`**

---

## 🎓 Demonstration Sequence for Faculty Review

Use this 2-minute walkthrough to demonstrate all required full-stack competencies:

1. **Authentication & Quick Access**:
   - Open `http://localhost:5173/login`.
   - Click the **"Alex Rivers (Lead Architect)"** 1-click login button (or type `alex@devsync.io` / `password123`).
   - Observe immediate authentication, JWT storage, and redirection to the protected Dashboard.

2. **Dashboard Overview**:
   - Point out the 4 KPI cards populated from PostgreSQL: Total Projects, Total Tasks, Completed Tasks, Pending Tasks.
   - Show the segmented progress bar visualising distribution across `Backlog`, `Todo`, `In Progress`, `Review`, and `Done`.
   - Point out the real-time activity stream on the bottom-left showing live database audit entries.

3. **Project Management (CRUD)**:
   - Navigate to **"My Projects"** via the sidebar.
   - Click **"+ New Project"**, enter `Cloud Event Broker`, set status to `In Progress`, pick a deadline, and submit.
   - Observe instant creation and toast notification.
   - Click the edit icon to change the project status to `Planning`.
   - Click into the project to inspect the dedicated project detail view.

4. **Task Management & Assignment**:
   - Navigate to **"My Tasks"**.
   - Filter by status, priority, or project dropdown.
   - Click **"+ New Task"**, create `Implement Distributed Rate Limiter`, select project `Cloud Event Broker`, assign to **Sarah Chen**, and set priority to `Urgent`.
   - Click the checkmark on any task to toggle between completed and incomplete, observing the count update.

5. **Interactive Drag-and-Drop Kanban Board**:
   - Navigate to **"Kanban Board"**.
   - Pick up any task card from **Todo** and smoothly drag it into **In Progress** or **Review**.
   - Drop the card: observe optimistic UI placement and immediate background persistence via `PATCH /api/tasks/:id/status`.
   - Refresh the page (`Ctrl+R` / `Cmd+R`) to demonstrate that the task remains in its new column and order in PostgreSQL.

6. **Team Collaboration & Settings**:
   - Navigate to **"Settings"**.
   - Show the active PostgreSQL database and server status.
   - Switch active user from **Alex Rivers** to **Sarah Chen** using the 1-click user switcher to demonstrate multi-user role simulation.
   - Click the Logout icon in the sidebar footer to confirm secure token removal and redirection back to Login.

---

## 📊 Feature Status & Transparency Report

### ✅ Fully Implemented & Verified
- [x] JWT Authentication with secure token expiration and route protection.
- [x] Password hashing with salted bcrypt.
- [x] Authorization and ownership checks (non-owners cannot delete another user's project).
- [x] Full CRUD operations for Projects with cascade task handling.
- [x] Full CRUD operations for Tasks with priority, due date, and user assignment.
- [x] Drag-and-drop Kanban workflow persisting column moves to PostgreSQL.
- [x] Real-time Dashboard KPI metrics, progress distribution, and audit activity stream.
- [x] Search and multi-parameter filtering across all views.
- [x] Centralized error handling for Zod validation and Prisma constraints.
- [x] Fully responsive, dark-mode Linear interface with toasts, modals, and skeletons.
- [x] Automated Prisma database migrations and comprehensive seed data.

### ⚠️ Known Limitations & Future Roadmap
1. **Real-time Live Sockets**: Current architecture uses REST polling/refetching on state mutation. Full WebSocket integration (e.g., Socket.io) for live cursor/board presence is reserved for v2.1.
2. **File Attachments**: Tasks currently support markdown descriptions and external URLs; direct binary S3 object uploads are not yet implemented.
3. **Session Revocation**: JWT tokens are stateless; revoking a token before its 7-day expiration requires a Redis blocklist or token rotation strategy.
