# DevSync — Complete End-to-End Application Workflows

This document traces the exact step-by-step lifecycle of every major user workflow through frontend components, stores, API clients, routes, controllers, middleware, Prisma models, and database tables.

---

## Workflow A: User Registration

```
[Browser Form] → [authStore.register] → [api/client.ts] → [POST /api/auth/register]
       ↓
[authController.register] → [Zod registerSchema] → [bcrypt.hash(password, 10)]
       ↓
[prisma.user.create] → [PostgreSQL INSERT User] → [prisma.activity.create]
       ↓
[generateToken(JWT)] → [JSON Response] → [localStorage.setItem('devsync_token')]
       ↓
[navigate('/dashboard')]
```

### File-by-File Trace:
1. **User Action:** User fills out registration fields on `client/src/pages/Register.tsx` and clicks *"Create Account"*.
2. **Store Dispatch:** Invokes `authStore.register(data)` in `client/src/store/authStore.ts`.
3. **HTTP Dispatch:** `client/src/api/client.ts` executes `POST /api/auth/register`.
4. **Route Match:** `server/src/routes/authRoutes.ts` maps `POST /register` to `register`.
5. **Validation:** `server/src/controllers/authController.ts` runs `registerSchema.parse(req.body)`.
6. **Hashing:** `bcrypt.hash(password, 10)` generates a 60-character salted blowfish hash string.
7. **Database Persistence:** `prisma.user.create()` inserts the new record into PostgreSQL table `User`.
8. **Audit Logging:** `prisma.activity.create()` records `USER_REGISTERED`.
9. **Terminal Logging:** `logger.auth("User registered: ...")` outputs colorized event.
10. **Token Issuance:** `generateToken()` creates an HS256 JWT valid for 7 days.
11. **Client Hydration:** Frontend stores the JWT in `localStorage` under `devsync_token` and redirects to `/dashboard`.

---

## Workflow B: User Login & Session Hydration

```
[Login.tsx] → [authStore.login] → [POST /api/auth/login]
       ↓
[authController.login] → [prisma.user.findUnique] → [bcrypt.compare]
       ↓
[generateToken(JWT)] → [JSON Response] → [localStorage.setItem('devsync_token')]
       ↓
[ProtectedRoute Guards] → [AppLayout.tsx] → [Dashboard.tsx]
```

### File-by-File Trace:
1. **Submission:** User enters email and password in `client/src/pages/Login.tsx`.
2. **API Request:** `POST /api/auth/login` processed by `server/src/controllers/authController.ts`.
3. **Lookup:** `prisma.user.findUnique({ where: { email } })`.
4. **Password Verification:** `bcrypt.compare(candidate, user.passwordHash)`.
5. **Token Delivery:** Server returns `{ success: true, token, user }`.
6. **State Storage:** `authStore` sets `isAuthenticated = true` and `user`.
7. **Protected Route:** `client/src/App.tsx` allows access to child routes in `AppLayout`.

---

## Workflow C: Project Creation & GitHub Provisioning

```
[CreateProjectModal.tsx] → [projectStore.createProject] → [POST /api/projects]
       ↓
[authenticate Middleware] → [projectController.createProject]
       ↓
[prisma.project.create with members] → [PostgreSQL INSERT Project + ProjectMember]
       ↓
[Optional: POST /api/github/projects/:id/create-repository]
       ↓
[decryptToken(AES-256-GCM)] → [GitHub API POST /user/repos]
       ↓
[prisma.projectRepository.upsert] → [PostgreSQL INSERT ProjectRepository]
```

### File-by-File Trace:
1. **Modal Form:** User clicks **"+ Project"** in `client/src/components/layout/Sidebar.tsx`, opening `CreateProjectModal.tsx`.
2. **Project Record:** `server/src/controllers/projectController.ts` creates the project and automatically adds the creator to `ProjectMember` with role `PROJECT_ADMIN`.
3. **GitHub Auto-Provisioning (Optional):** If *"Create GitHub Repository"* is checked, `server/src/controllers/githubController.ts` decrypts the user's OAuth token using `crypto.ts`, calls the GitHub REST API (`POST https://api.github.com/user/repos`), creates the remote repository with a README, and links it in `ProjectRepository`.
4. **Terminal Log:** Emits:
   `[PROJECT] Project created: "Payment Service"`
   `[GITHUB] Repository created on GitHub: owner/payment-service`

---

## Workflow D: Task Assignment & Code Review Workflow

```
[CreateTaskModal.tsx] → [taskController.createTask] → Status: TODO
       ↓
[Kanban.tsx Drag-and-Drop] → [taskController.updateTaskStatus] → Status: IN_PROGRESS
       ↓
[TaskDetailModal.tsx] → [Submit For Review] → [taskController.submitForReview] → Status: REVIEW
       ↓
[Senior Reviewer Action]:
   ├── Click "Request Changes" → [taskController.requestChanges] → Status: CHANGES_REQUESTED
   └── Click "Approve Task"    → [taskController.approveTask]    → Status: DONE
```

### File-by-File Trace:
1. **Creation:** User creates task with assigned Developer and Reviewer in `client/src/components/modals/CreateTaskModal.tsx`. Role checks verify the reviewer is a `SENIOR`, `PROJECT_LEAD`, or `PROJECT_ADMIN`.
2. **Execution:** Developer moves task to `IN_PROGRESS`.
3. **Submission:** Developer opens `client/src/components/modals/TaskDetailModal.tsx`, enters review notes, and clicks **Submit for Review**. `taskController.submitForReview` transitions status to `REVIEW`.
4. **Verification & Approval:**
   - A Senior reviewer can click **Request Changes** with required feedback notes, moving the status to `CHANGES_REQUESTED`.
   - Or, upon satisfactory review, the Senior clicks **Approve Task**, moving the status to `DONE`.

---

## Workflow E: Kanban Drag-and-Drop Persistence

```
[Kanban.tsx onDragEnd] → Calculate fractional 'order' float
       ↓
[taskStore.updateTaskStatus] → [PATCH /api/tasks/:id/status]
       ↓
[taskController.updateTaskStatus] → [prisma.task.update({ status, order })]
       ↓
[PostgreSQL UPDATE Task] → [Activity TASK_MOVED] → [logger.task]
```

### File-by-File Trace:
1. **Drag Event:** User drags a task card from `IN_PROGRESS` to `REVIEW` in `client/src/pages/Kanban.tsx`.
2. **Fractional Index Calculation:** To avoid re-indexing all cards in the column, the new order is calculated as `(previousCard.order + nextCard.order) / 2`.
3. **API Dispatch:** Dispatches `PATCH /api/tasks/:id/status` with `{ status: "REVIEW", order: 2500 }`.
4. **Persistence:** `taskController.updateTaskStatus` updates `Task` in PostgreSQL.

---

## Workflow F: Pull Request Merge Auto-Completion via Webhook

```
[GitHub.com] → Merge Pull Request #14
       ↓
[POST /api/github/webhook] with Header: x-hub-signature-256
       ↓
[Express Raw Body Capture] → [HMAC SHA-256 Verification against GITHUB_WEBHOOK_SECRET]
       ↓
[prisma.taskPullRequest.findMany] → Match linked tasks
       ↓
[prisma.task.update(status: 'DONE')] → [prisma.activity.create(TASK_AUTO_COMPLETED_VIA_PR)]
       ↓
[Terminal Log: [GITHUB] Pull request #14 merged into main]
```

### File-by-File Trace:
1. **GitHub Merge:** Developer merges PR #14 on GitHub.
2. **Webhook Receipt:** GitHub delivers JSON payload to `server/src/controllers/githubController.ts` -> `handleWebhook`.
3. **Verification:** Validates `x-hub-signature-256` using `crypto.timingSafeEqual`.
4. **Task Resolution:** Matches `pullRequestNumber = 14` in `TaskPullRequest`.
5. **Auto-Completion:** Automatically transitions the associated task to `DONE` and creates an activity entry.

