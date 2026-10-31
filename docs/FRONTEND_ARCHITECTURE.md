# DevSync — Frontend Architecture & Component Deep Dive

## 1. Frontend Structure & Directory Layout

```
client/src/
├── api/
│   └── client.ts                     # Fetch wrapper, automatic JWT header injection, response parser
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx             # Root layout with Sidebar, Header, dynamic page outlet
│   │   ├── Header.tsx                # Top navigation bar, search, user avatar, quick actions
│   │   └── Sidebar.tsx               # Persistent collapsible navigation bar with project shortcut
│   ├── modals/
│   │   ├── CreateProjectModal.tsx    # Project creation & GitHub repository setup wizard
│   │   ├── CreateTaskModal.tsx       # Task creation with assignee & reviewer selection
│   │   └── TaskDetailModal.tsx       # Detailed task viewer, review feedback notes, PR links
│   ├── project/
│   │   ├── CodeVisualizerTab.tsx     # File Tree Explorer, Commit DAG graph, branches, contributors
│   │   ├── TeamActivityTab.tsx       # Combined GitHub & DevSync event timeline with filters
│   │   └── TeamTab.tsx               # Project team members, role assignments, workload stats
│   └── ui/                           # Reusable design system primitives
│       ├── Avatar.tsx                # User avatar with fallback initials
│       ├── Badge.tsx                 # Status & priority color-coded badges
│       ├── Button.tsx                # Variant-based button (primary, secondary, danger, ghost)
│       ├── Card.tsx                  # Structured content container
│       ├── EmptyState.tsx            # Contextual empty state illustrations
│       ├── Input.tsx                 # Form text input with label and error state
│       ├── Skeleton.tsx              # Pulse loading skeleton placeholder
│       ├── StatCard.tsx              # Metric display card for dashboard
│       └── ToastContainer.tsx        # Toast notification system
├── lib/
│   └── utils.ts                      # clsx + tailwind-merge helper function (cn)
├── pages/
│   ├── Dashboard.tsx                 # Executive dashboard with metrics, quick actions, recents
│   ├── Kanban.tsx                    # Drag-and-drop Kanban board with float-order persistence
│   ├── Login.tsx                     # Local email/password login and Google OAuth entry
│   ├── ProjectDetail.tsx             # Multi-tab project workspace (Tasks, Board, Code, Team, Activity)
│   ├── Projects.tsx                  # Grid view of active projects with progress bars
│   ├── Register.tsx                  # Account registration with role selection
│   ├── Settings.tsx                  # Profile management & GitHub OAuth connection controls
│   └── Tasks.tsx                     # Tabular/list view of tasks with filters and search
├── store/
│   ├── authStore.ts                  # User session, JWT storage, Google token parsing, logout
│   ├── projectStore.ts               # Project CRUD, active project, member roles
│   ├── taskStore.ts                  # Task CRUD, status updates, review workflows, PR linking
│   └── uiStore.ts                    # Global modal visibility, toasts, active tabs
├── types/
│   └── index.ts                      # Shared TypeScript domain models and interfaces
├── App.tsx                           # React Router route tree and ProtectedRoute wrappers
├── main.tsx                          # React 18 DOM mount point
└── index.css                         # Tailwind CSS directives and custom scrollbar styles
```

---

## 2. Routing Architecture & Protected Routes

DevSync defines its client route tree in `client/src/App.tsx` using `react-router-dom`:

```tsx
<Routes>
  {/* Public Authentication Routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  {/* Protected Application Routes wrapped in AppLayout */}
  <Route
    path="/"
    element={
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="/dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="projects" element={<Projects />} />
    <Route path="projects/:id" element={<ProjectDetail />} />
    <Route path="tasks" element={<Tasks />} />
    <Route path="kanban" element={<Kanban />} />
    <Route path="settings" element={<Settings />} />
  </Route>

  {/* Catch-all Fallback */}
  <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>
```

### Route Guard (`ProtectedRoute`) Implementation
- Reads `isAuthenticated` and `token` from `authStore`.
- If unauthenticated, it redirects the browser to `/login` while preserving the intended target URL in `location.state`.
- On initial page load, it displays a loading skeleton until session validation completes.

---

## 3. Global State Management (Zustand)

DevSync avoids monolithic context providers by employing **Zustand** stores:

### 1. `authStore.ts`
- **State:** `user`, `token`, `isAuthenticated`, `isLoading`.
- **Actions:**
  - `login(email, password)`: Calls `POST /api/auth/login`, stores JWT in `localStorage`, sets `isAuthenticated = true`.
  - `register(data)`: Calls `POST /api/auth/register`, sets user session.
  - `handleGoogleAuthCallback(token, user)`: Extracts token and user from URL query params following Google OAuth redirection.
  - `logout()`: Clears `localStorage`, calls `POST /api/auth/logout`, resets state.
  - `checkAuth()`: Validates token against `GET /api/auth/me` on startup.

### 2. `projectStore.ts`
- **State:** `projects`, `currentProject`, `members`, `isLoading`, `error`.
- **Actions:**
  - `fetchProjects()`: Retrieves all accessible projects with completion metrics.
  - `fetchProjectById(id)`: Hydrates full project details, tasks, and repository data.
  - `createProject(data)`: Dispatches project creation and updates local state.
  - `fetchMembers(projectId)`: Fetches project members with role-based workload counts.

### 3. `taskStore.ts`
- **State:** `tasks`, `selectedTask`, `filters`, `isLoading`.
- **Actions:**
  - `fetchTasks(projectId?)`: Loads tasks filtered by project, status, priority, or assignee.
  - `createTask(data)`: Creates task in PostgreSQL and optimistically prepends it to state.
  - `updateTaskStatus(taskId, status, order)`: Persists drag-and-drop Kanban state.
  - `submitForReview(taskId, notes)`: Transitions task to `REVIEW`.
  - `requestChanges(taskId, notes)`: Transitions task to `CHANGES_REQUESTED`.
  - `approveTask(taskId, notes)`: Transitions task to `DONE`.

### 4. `uiStore.ts`
- **State:** `activeModal`, `toasts`, `sidebarOpen`.
- **Actions:** `openModal(modalName)`, `closeModal()`, `addToast({ type, message })`, `removeToast(id)`.

---

## 4. API Client & HTTP Communication

Located in `client/src/api/client.ts`:
- Encapsulates native `fetch` with automatic header injection.
- Automatically reads the JWT from `localStorage` under key `devsync_token` and inserts:
  `Authorization: Bearer <token>`
- Automatically parses JSON responses.
- Catches HTTP `401 Unauthorized` responses and automatically triggers `authStore.getState().logout()`, preventing stale sessions from remaining in client memory.

---

## 5. Major Page Implementations & User Experiences

### 1. Registration (`client/src/pages/Register.tsx`)
- Provides input fields for Name, Email, Password, and System Role (`DEVELOPER`, `LEAD`, `ADMIN`, `INTERN`).
- Real-time password visibility toggle (eye icon).
- Submits to `POST /api/auth/register`, automatically logs the user in, and navigates to `/dashboard`.

### 2. Login (`client/src/pages/Login.tsx`)
- Supports local email/password authentication with validation.
- Inspects URL for Google OAuth parameters (`?google_token=...` or `?auth_error=...`).
- Embeds the official **"Sign in with Google"** button which redirects to `http://localhost:5000/api/auth/google`.
- Displays pre-filled quick-login demo accounts (`alex@devsync.io`, `sarah@devsync.io`, `marcus@devsync.io`) for rapid testing.

### 3. Dashboard (`client/src/pages/Dashboard.tsx`)
- Renders key engineering metrics: Total Projects, Active Tasks, Tasks in Review, and Completed Work.
- Displays visual progress bars, recent team activity, and quick-action buttons to create projects or tasks.

### 4. Project Workspace (`client/src/pages/ProjectDetail.tsx`)
A unified tabbed workspace containing:
- **Tasks Tab:** Filterable list of project tasks with priority badges and assignees.
- **Kanban Board Tab:** Visual drag-and-drop board.
- **Code & Repository Tab (`CodeVisualizerTab.tsx`):**
  - **File Explorer:** Navigates directory hierarchy via GitHub API.
  - **Commit Graph DAG:** Interactive nodes depicting parent-child commit history.
  - **Branch Explorer:** Default and active remote branches.
  - **Contributors:** Contribution counts and GitHub avatars.
- **Team & Roles Tab (`TeamTab.tsx`):** Lists project members, their specific `ProjectRole`, and workload statistics.
- **Team Activity Tab (`TeamActivityTab.tsx`):** Unified timeline combining GitHub commits/PRs with DevSync task events.

### 5. Kanban Board (`client/src/pages/Kanban.tsx`)
- Employs HTML5 Drag and Drop API with visual indicators.
- Columns correspond to `TaskStatus`: `TODO`, `IN_PROGRESS`, `REVIEW`, `CHANGES_REQUESTED`, `DONE`.
- Dragging a card recalculates its `order` float value (halfway between adjacent cards) and triggers `PATCH /api/tasks/:id/status` to maintain persistent positioning across reloads.
- Clicking any card opens `TaskDetailModal.tsx` for review feedback, PR inspection, or status updating.

