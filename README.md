# DevSync — Full-Stack Developer Collaboration Platform

DevSync is a modern, high-performance developer collaboration and project tracking platform inspired by Linear. Built with a sleek dark-mode-first aesthetic, DevSync enables engineering teams to coordinate roadmaps, track tasks on an interactive drag-and-drop Kanban board, and monitor delivery velocity with real-time audit logging.

---

## 🌟 Key Features

### 1. Authentication & Security
- **JWT Authentication**: Stateless token authorization with 7-day expiration.
- **bcrypt Password Hashing**: Salted secure hashing for developer credentials.
- **Protected Routes**: React client-side route guards with automatic session verification and 401 interceptors.
- **Role-Based Profiles**: Support for `ADMIN`, `LEAD`, and `DEVELOPER` permissions.
- **1-Click Demo Profiles**: Pre-configured demo logins for immediate evaluation without typing.

### 2. Engineering Dashboard
- **KPI Metrics**: Total Projects, Total Tasks, Completed Tasks, Pending Tasks, and Overall Completion Rate (%).
- **Progress Distribution**: Segmented visual progress bar across Backlog, Todo, In Progress, Review, and Done.
- **Priority Breakdown**: Visual priority indicators for Urgent, High, Medium, and Low issues.
- **Real-Time Activity Feed**: Live audit stream recording team actions (e.g. project creation, task completion, column movements).
- **Active Projects Overview**: Snapshot of current repositories with completion percentages and target deadlines.

### 3. Project Management (Full CRUD)
- Create, view, edit, and delete projects.
- Support for project descriptions, target deadlines with overdue tracking, and status tags (`PLANNING`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`).
- Individual project view with dedicated project-scoped Kanban boards and task lists.

### 4. Task Management (Full CRUD)
- Create, inspect, edit, and delete tasks.
- Assign tasks to team members with visual avatar indicators.
- Priority levels: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- Due dates with automatic overdue warnings.
- One-click completion checkbox with immediate state persistence.
- Search and multi-filter by Project, Priority, Status, and title/description keywords.

### 5. Interactive Kanban Board
- 5 Standard Columns: **Backlog**, **Todo**, **In Progress**, **Review**, **Done**.
- **Drag-and-Drop Column Transitions**: Fluid drag-and-drop task movement with optimistic UI updates and instant PostgreSQL persistence (`PATCH /api/tasks/:id/status`).
- Quick `+` button in each column header to add tasks directly into that status.
- Filter Kanban view across all projects or isolate a single project.

### 6. User Interface & Polish
- **Linear-Inspired Dark Mode**: Default deep zinc/slate palette (`#090a0f`, `#12131a`) with crisp borders (`#232530`) and glowing brand accents.
- **Toast Notifications**: Non-intrusive floating toasts for success, error, and info events.
- **Modal Dialogs**: Smooth modal overlays with backdrop blur for project/task creation and editing.
- **Empty States & Skeletons**: Friendly empty states with direct call-to-actions when no records match.

---

## 🏗️ Architecture & Technology Stack

```
skill-lab2/
├── client/                     # React 18 + Vite Frontend
│   ├── src/
│   │   ├── api/                # API client with JWT interceptors
│   │   ├── components/         # Layout (Sidebar, Header), Modals, Badges, Toasts
│   │   ├── lib/                # Color configs, date formatting, cn utility
│   │   ├── pages/              # Dashboard, Projects, ProjectDetail, Tasks, Kanban, Settings, Login, Register
│   │   ├── store/              # Zustand state stores (auth, project, task, ui)
│   │   └── types/              # Shared TypeScript interfaces
│   └── vite.config.ts          # Vite configuration with /api reverse proxy
├── server/                     # Node.js + Express Backend
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema with relations & indexes
│   │   ├── migrations/         # PostgreSQL database migrations
│   │   └── seed.ts             # Realistic developer seed data
│   └── src/
│       ├── config/             # Prisma client instance & environment config
│       ├── controllers/        # Auth, Project, Task, Dashboard, User controllers
│       ├── middleware/         # JWT auth middleware, Zod validation, error handler
│       ├── routes/             # REST route declarations
│       └── index.ts            # Server entrypoint with CORS & logging
├── .env.example                # Unified environment variable template
└── package.json                # Root orchestration scripts
```

### Stack Details
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router 6, Lucide Icons, Date-fns.
- **Backend**: Node.js, Express 4, TypeScript, Prisma ORM 5, Zod, bcryptjs, jsonwebtoken, CORS.
- **Database**: PostgreSQL with relation cascading and indexed fields.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** running locally on port 5432 (or a remote PostgreSQL connection string)

### 1. Database Setup
Ensure PostgreSQL is running and create the database (or use an existing database):
```bash
createdb devsync
```

### 2. Configure Environment Variables
Copy `.env.example` in `server/`:
```bash
cp server/.env.example server/.env
```

Ensure your `DATABASE_URL` matches your local PostgreSQL configuration:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://devsync:devsync@127.0.0.1:5432/devsync?schema=public"
JWT_SECRET="super-secret-devsync-jwt-key-2026-very-secure"
CLIENT_URL="http://localhost:5173"
```

### 3. Install Dependencies & Run Migrations
From the project root:
```bash
# Install dependencies for both server and client
npm run install:all

# Run Prisma migration to create tables and indexes
npm run prisma:migrate

# Seed initial developer data
npm run prisma:seed
```

### 4. Start the Application
Run both the backend API and frontend Vite dev server concurrently:

In terminal 1 (Backend API):
```bash
npm run server
# Server starts on http://localhost:5000
```

In terminal 2 (Frontend Client):
```bash
npm run client
# Vite app opens on http://localhost:5173
```

Alternatively, build both for production:
```bash
npm run build
```

---

## 🔑 Demo Credentials

The database seed comes with pre-populated engineering projects, tasks, and users:

| Name | Email | Role | Default Password |
|---|---|---|---|
| **Alex Rivers** | `alex@devsync.io` | Lead Architect | `password123` |
| **Sarah Chen** | `sarah@devsync.io` | Full-Stack Engineer | `password123` |
| **Marcus Vance** | `marcus@devsync.io` | Backend Specialist | `password123` |

> *Tip: On the Login screen, click any of the "Quick Demo Access" buttons to sign in with 1 click.*

---

## 📡 REST API Endpoints

### Authentication
- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate and obtain JWT
- `GET /api/auth/me` - Get current user profile (Protected)
- `PUT /api/auth/profile` - Update profile name and avatar (Protected)

### Projects
- `GET /api/projects` - List all projects with progress and task counts
- `GET /api/projects/:id` - Get project by ID with its tasks
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project details
- `DELETE /api/projects/:id` - Delete project and cascade tasks

### Tasks
- `GET /api/tasks` - List tasks with query filters (`projectId`, `status`, `priority`, `search`)
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task details
- `PATCH /api/tasks/:id/status` - Move task column & order (Kanban Drag & Drop)
- `DELETE /api/tasks/:id` - Delete task

### Dashboard & Team
- `GET /api/dashboard/stats` - Total projects, tasks, completed/pending, velocity, recent activities
- `GET /api/users` - List team members for assignment
- `GET /api/health` - Server healthcheck
