# DevSync — System Architecture & Component Interaction

## 1. High-Level Architecture Overview
DevSync follows a modern, decoupled **Client-Server Architecture** with a single-page application (SPA) frontend, an asynchronous RESTful Express API backend, a PostgreSQL relational database managed via Prisma ORM, and integrations with external OAuth/API providers (GitHub and Google).

### Architectural Characteristics:
1. **Stateless API Tier:** The Express backend does not maintain in-memory HTTP sessions; all authentication relies on self-contained JSON Web Tokens (JWT) transmitted via HTTP Authorization headers.
2. **Encrypted At-Rest Token Storage:** OAuth access tokens issued by GitHub are encrypted using AES-256-GCM before persistence in PostgreSQL.
3. **Decoupled Asynchronous Integrations:** Webhooks from GitHub are verified via cryptographically signed HMAC signatures without exposing sensitive internal endpoints.
4. **Reactive Single-Page Frontend:** Client-side routing with React Router and state hydration with Zustand ensure instant page transitions and local optimistic updates.

---

## 2. Mermaid System Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientTier["Frontend Client Tier (Port 5173)"]
        UI["React 18 SPA (Vite + Tailwind CSS)"]
        Zustand["Zustand Stores (Auth, Project, Task, UI)"]
        AxiosClient["API Client (Fetch Wrapper + Bearer Token)"]
        UI --> Zustand
        Zustand --> AxiosClient
    end

    subgraph ExternalAuth["External OAuth Providers"]
        GoogleAuth["Google Identity (OAuth 2.0 / OIDC)"]
        GitHubOAuth["GitHub OAuth (RFC 6749)"]
    end

    subgraph BackendTier["Express API Backend (Port 5000)"]
        CorsBody["Express App Middleware\n(CORS, json, rawBody capture)"]
        Router["Express API Routers\n(/auth, /projects, /tasks, /github, /dashboard)"]
        AuthMid["Auth Middleware\n(JWT Verification: authenticate)"]
        PermMid["Project Permissions Middleware\n(requireProjectPermission)"]
        Controllers["Controllers\n(auth, project, task, github, dashboard)"]
        ZodValidator["Zod Schema Validation\n(registerSchema, taskCreateSchema, etc.)"]
        CryptoUtil["Crypto Utilities\n(AES-256-GCM, HMAC SHA-256)"]
        WinstonLog["Winston Logger\n([AUTH], [PROJECT], [TASK], [GITHUB])"]
        ErrorHandler["Centralized Error Handler\n(Zod, Prisma P2002/P2025, 500)"]
    end

    subgraph DataTier["Data & Storage Tier"]
        PrismaClient["Prisma Client ORM 5.22.0"]
        PostgresDB[(PostgreSQL 16 Database\ndevsync)]
    end

    subgraph ExternalAPI["External Developer Services"]
        GitHubREST["GitHub REST API v3\n(Repos, Commits, Pull Requests, Files)"]
        GitHubWebhook["GitHub Webhook Engine\n(PR Merged Event via HTTP POST)"]
    end

    %% Client to Backend
    AxiosClient -- "HTTP Requests + Bearer JWT" --> CorsBody
    CorsBody --> Router
    Router --> AuthMid
    AuthMid --> PermMid
    PermMid --> ZodValidator
    ZodValidator --> Controllers

    %% Controllers to Utils & Logs
    Controllers --> CryptoUtil
    Controllers --> WinstonLog
    Controllers --> ErrorHandler

    %% Controllers to DB
    Controllers --> PrismaClient
    PrismaClient -- "Type-Safe SQL Queries" --> PostgresDB

    %% External Auth Flows
    UI -. "Initiate Login" .-> GoogleAuth
    GoogleAuth -. "OAuth Redirect with Code" .-> Controllers
    UI -. "Initiate Connect" .-> GitHubOAuth
    GitHubOAuth -. "OAuth Callback with Code" .-> Controllers

    %% External GitHub Service Calls
    Controllers -- "Fetch Commits/PRs/Files (Encrypted Token)" --> GitHubREST
    GitHubWebhook -- "Signed HTTP POST (x-hub-signature-256)" --> Router
```

---

## 3. End-to-End Request-Response Lifecycle

### A. Internal API Request Lifecycle (Frontend to Database and Back)
1. **User Action & Store Dispatch:** A user takes an action in the UI (e.g., creating a task). A component invokes a store action:
   `useTaskStore.getState().createTask(payload)`
2. **API Client Invocation:** The API client in `client/src/api/client.ts` automatically attaches the active JWT from local storage:
   `headers['Authorization'] = 'Bearer <JWT_TOKEN>'`
3. **CORS & Body Parsing:** Express processes the request in `server/src/index.ts`:
   - `cors()` ensures the request origin is allowed.
   - `express.json()` parses the JSON body while retaining `rawBody` for webhook verification.
4. **Authentication Middleware:** `server/src/middleware/auth.ts`:
   - Extracts and verifies the token using `jwt.verify(token, JWT_SECRET)`.
   - Attaches `req.user = { userId, email, role }` to the Express request object.
5. **Authorization / Permissions Middleware:** `server/src/middleware/projectPermissions.ts`:
   - Evaluates the user's project role against `ProjectMember` in PostgreSQL.
   - Enforces capabilities (e.g., verifying if the user has `assign_tasks` or `review_tasks`).
6. **Input Validation:** The controller invokes Zod:
   `const validated = taskCreateSchema.parse(req.body);`
   If validation fails, execution halts and jumps to `errorHandler`.
7. **Database Transaction via Prisma:** The controller calls Prisma:
   `const task = await prisma.task.create({ data: { ... } });`
   Prisma translates the call into an optimized parameterized PostgreSQL SQL query.
8. **Observability & Logging:** The controller writes an audit record to PostgreSQL (`prisma.activity.create`) and emits an immediate ANSI-colorized log line to the terminal via Winston:
   `logger.task('Task created: "Implement Login" (id: ...)')`
9. **JSON Response Dispatch:** The controller returns `res.status(201).json({ success: true, task })`.
10. **Store State Reactivity:** Zustand receives the response, updates the immutable state tree, and React re-renders only the affected components.

---

## 4. Inbound & Outbound External Request Flows

### B. Google OAuth 2.0 Inbound Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Developer / User
    participant Browser as Browser Client
    participant Server as DevSync Express API
    participant Google as Google OAuth Server
    participant DB as PostgreSQL

    User->>Browser: Clicks "Sign in with Google"
    Browser->>Server: GET /api/auth/google
    Server-->>Browser: HTTP 302 Redirect to accounts.google.com
    Browser->>Google: Authenticates with Google credentials
    Google-->>Browser: HTTP 302 Redirect to /api/auth/google/callback?code=XYZ
    Browser->>Server: GET /api/auth/google/callback?code=XYZ
    Server->>Google: POST https://oauth2.googleapis.com/token (Exchange Code)
    Google-->>Server: Returns access_token
    Server->>Google: GET https://www.googleapis.com/oauth2/v2/userinfo
    Google-->>Server: Returns { id, email, name, picture }
    Server->>DB: Upsert User (link googleId or create new DEVELOPER)
    Server->>Server: Sign DevSync JWT
    Server-->>Browser: HTTP 302 Redirect to http://localhost:5173/login?google_token=...
    Browser->>Browser: Store JWT in localStorage & redirect to /dashboard
```

---

### C. GitHub Webhook Inbound Flow (PR Auto-Completion)
```mermaid
sequenceDiagram
    autonumber
    actor Dev as GitHub Engineer
    participant GitHub as GitHub Webhook Engine
    participant Server as DevSync Webhook Handler
    participant DB as PostgreSQL
    participant UI as DevSync Client

    Dev->>GitHub: Merges Pull Request #24 on GitHub
    GitHub->>Server: POST /api/github/webhook (Payload + x-hub-signature-256)
    Server->>Server: Verify HMAC SHA-256 against GITHUB_WEBHOOK_SECRET
    alt Invalid Signature
        Server-->>GitHub: HTTP 401 Unauthorized
    else Valid Signature
        Server->>DB: Query TaskPullRequest where pullRequestNumber = 24
        DB-->>Server: Returns linked tasks
        Server->>DB: UPDATE Task SET status = 'DONE' WHERE id = taskId
        Server->>DB: INSERT into Activity (TASK_AUTO_COMPLETED_VIA_PR)
        Server->>Server: logger.github("PR #24 merged into main")
        Server-->>GitHub: HTTP 200 OK { success: true, updatedTasks: 1 }
        UI->>Server: Periodic Poll / Refetch
        Server-->>UI: Task now renders under "Done" column in Kanban
    end
```

---

### D. Outbound GitHub REST API Flow (File Explorer & Commit DAG)
1. User navigates to **Code & Repository** tab in Project Details.
2. The frontend requests `GET /api/github/projects/:id/contents?path=src`.
3. The backend retrieves the user's encrypted GitHub token from `GitHubConnection` in PostgreSQL.
4. `crypto.ts` decrypts the token using `AES-256-GCM` and secret key `GITHUB_TOKEN_ENCRYPTION_KEY`.
5. The backend executes an authenticated HTTPS call to `https://api.github.com/repos/{owner}/{repo}/contents/{path}` with header `Authorization: Bearer <GITHUB_TOKEN>`.
6. The backend maps directory trees and file entries and returns them to the frontend without downloading or cloning the entire repository.

