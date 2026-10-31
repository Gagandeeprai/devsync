# DevSync — University Project Viva & Defense Guide

Comprehensive question-and-answer preparation for academic defense, external examiners, and technical evaluators.

---

## Section 1: Project Fundamentals

### Q1: What is DevSync, and what primary engineering problem does it solve?
**Answer:** DevSync is a developer collaboration and engineering workflow platform that bridges the disconnect between project management (tasks/Kanban) and version control (GitHub). Traditional tools like Jira and Trello operate separately from source code repositories, causing tickets to drift out of sync with actual pull requests and commits. DevSync integrates tasks with real GitHub repositories, visualizes commit DAGs and file trees, supports project-level role permissions, and automatically completes tasks when GitHub pull requests are merged.

### Q2: What are the main user roles in DevSync?
**Answer:** DevSync implements a dual-tier role system:
1. **Global Roles (`UserRole`):** `ADMIN`, `LEAD`, `DEVELOPER`, `INTERN`, `HR`.
2. **Project-Specific Roles (`ProjectRole`):** `PROJECT_ADMIN`, `PROJECT_LEAD`, `SENIOR`, `DEVELOPER`, `INTERN`.
This ensures a developer can be a Senior reviewer on one project while contributing as a standard Developer on another.

### Q3: How does DevSync prevent "stale" project tickets?
**Answer:** Through automated GitHub webhook integration with HMAC SHA-256 verification. When a developer merges a pull request on GitHub, the webhook notifies DevSync, which finds the linked task ticket in PostgreSQL and automatically marks it `DONE`, logging an audit record.

### Q4: How does DevSync compare to Jira or Linear?
**Answer:** While Jira and Linear require external plugins or complex marketplace apps to view code details, DevSync natively embeds non-cloning repository directory browsers, commit DAG visualizations, in-app repository provisioning, and designated senior review verification workflows (`REVIEW` → `CHANGES_REQUESTED` → `DONE`).

### Q5: What is the task lifecycle in DevSync?
**Answer:** `BACKLOG` → `TODO` → `IN_PROGRESS` → `REVIEW` → `CHANGES_REQUESTED` (if revisions needed) → `DONE` (upon approval or PR merge).

---

## Section 2: Frontend Architecture

### Q6: Why did you choose React and Vite instead of Create React App or Next.js?
**Answer:** Vite uses native ES modules (ESM) in development, offering near-instantaneous build and Hot Module Replacement (HMR) times compared to Webpack-based Create React App (which is deprecated). DevSync is a Single Page Application (SPA) dashboard with heavy client-side state interactions (drag-and-drop Kanban, interactive commit graph); Next.js SSR was unnecessary and would add server complexity without performance benefits for authenticated corporate dashboards.

### Q7: Why use Zustand instead of Redux Toolkit or React Context API?
**Answer:** 
- **Over Redux:** Zustand requires zero boilerplate, actions are colocated, and there are no reducers, dispatchers, or complex middleware layers.
- **Over Context API:** React Context triggers re-renders across all consuming components whenever any piece of the context value changes. Zustand supports atomic selector subscriptions (`useTaskStore(state => state.tasks)`), re-rendering only the specific component when its subscribed slice changes.

### Q8: How does the Kanban drag-and-drop maintain card ordering?
**Answer:** In `client/src/pages/Kanban.tsx`, cards use a floating-point `order` value. When a card is dropped between two existing cards, its new order is computed as `(prevOrder + nextOrder) / 2`. This fractional indexing technique avoids updating the entire column in the database, requiring only a single `PATCH /api/tasks/:id/status` update.

### Q9: How are protected routes implemented in the frontend?
**Answer:** In `client/src/App.tsx`, routes are wrapped inside `<ProtectedRoute>`. It inspects `authStore.isAuthenticated` and checks `localStorage.getItem('devsync_token')`. If unauthenticated, it redirects the browser to `/login` using React Router's `<Navigate>` component while saving the intended location.

### Q10: How does the client handle API errors and expired tokens?
**Answer:** In `client/src/api/client.ts`, the fetch wrapper intercepts HTTP `401 Unauthorized` responses. If a token has expired or is invalid, it automatically clears `localStorage` and triggers `authStore.logout()`, immediately routing the user to the login screen with a descriptive toast notification.

---

## Section 3: Backend Architecture

### Q11: Explain the middleware execution order in Express.
**Answer:** In `server/src/index.ts`:
1. `cors()`: Sets cross-origin headers.
2. `express.json()` with `rawBody` capture: Parses JSON and retains the unparsed raw string for webhook HMAC validation.
3. `auth.ts` (`authenticate`): Verifies JWT Bearer token and attaches `req.user`.
4. `projectPermissions.ts`: Checks project-level capability authorization.
5. Controller action & Zod schema validation.
6. Centralized `errorHandler`: Formats Zod and Prisma exceptions.

### Q12: Why did you capture `req.rawBody` in the JSON body parser?
**Answer:** HMAC SHA-256 webhook signature verification requires the exact, unaltered byte sequence sent by GitHub. If we verify against re-serialized JSON (`JSON.stringify(req.body)`), differences in whitespace, character encoding, or key order will produce a different hash and fail verification. Capturing `rawBody` during the initial stream read guarantees signature match.

### Q13: How does the backend prevent duplicate logs in the terminal?
**Answer:** The Winston logger in `server/src/utils/logger.ts` is explicitly called inside business controllers at key milestones (`logger.auth`, `logger.project`, `logger.task`, `logger.github`) rather than emitting generic noisy HTTP logs on every polling interval.

### Q14: How are project-level capabilities enforced on the backend?
**Answer:** The `requireProjectPermission(capability)` middleware in `server/src/middleware/projectPermissions.ts` queries the user's role in the `ProjectMember` join table for the given project. If the role does not grant that capability in `ROLE_CAPABILITIES` (e.g. Interns attempting to review tasks or approve work), it responds immediately with HTTP `403 Forbidden`.

### Q15: What is the purpose of Zod in your controllers?
**Answer:** Zod provides compile-time TypeScript type inference and runtime boundary validation. It checks string lengths, email validity, UUID formats, and enum matches before database queries are executed, preventing SQL crashes or corrupted data from reaching Prisma.

---

## Section 4: Database & Prisma ORM

### Q16: Why did you choose PostgreSQL over MongoDB?
**Answer:** DevSync's domain is deeply relational: Users own Projects, Projects contain Tasks, Tasks belong to Users (Assignees and Reviewers) and link to GitHub Pull Requests. Relational databases provide ACID transaction guarantees, strict schema constraints, unique compound indexes (e.g. preventing duplicate member assignments or duplicate PR links), and cascading deletes. In a document store like MongoDB, maintaining consistency across tasks, projects, and users would require complex, error-prone manual application-level checks.

### Q17: Why use Prisma ORM instead of raw SQL queries?
**Answer:** Prisma provides:
1. End-to-end type safety: Prisma automatically generates TypeScript types matching the database schema.
2. Parameterized queries by default, eliminating SQL injection vulnerabilities.
3. Declarative schema migrations (`prisma db push` / `prisma migrate`).
4. Automatic foreign key cascading behavior without manual trigger writing.

### Q18: Explain the difference between `onDelete: Cascade` and `onDelete: SetNull` in your schema.
**Answer:**
- **`Cascade`:** When a `Project` is deleted, all its associated `Task`, `ProjectMember`, and `Activity` records are deleted automatically.
- **`SetNull`:** `Task.assigneeId` and `Task.reviewerId` reference `User.id` with `onDelete: SetNull`. If a user leaves the company and their account is deleted, their assigned tasks remain in the backlog with `assigneeId = null`, preventing task loss.

### Q19: Explain the multi-column unique constraints in your database.
**Answer:**
1. `ProjectMember`: `@@unique([projectId, userId])` ensures a user cannot be added to the same project more than once.
2. `TaskPullRequest`: `@@unique([taskId, pullRequestNumber])` ensures a GitHub PR cannot be linked to the same task multiple times.

### Q20: What indexes did you create and why?
**Answer:** B-tree indexes were created on foreign keys (`[projectId]`, `[assigneeId]`, `[reviewerId]`) and lookup fields (`[email]`, `[googleId]`, `[status]`, `[priority]`). This transforms table scans ($O(N)$) into logarithmic tree lookups ($O(\log N)$) during Kanban filtering and dashboard aggregations.

---

## Section 5: Authentication & Authorization

### Q21: How are passwords secured in DevSync?
**Answer:** Using the Blowfish-based `bcryptjs` hashing algorithm with a work factor of 10 salt rounds. A random salt is generated and embedded in the hash, protecting against pre-computed rainbow table attacks. Plaintext passwords are never saved or logged.

### Q22: What is the structure and lifecycle of a DevSync JWT?
**Answer:** The JWT consists of:
- **Header:** Algorithm (`HS256`), Type (`JWT`).
- **Payload:** User claims (`userId`, `email`, `role`, `iat`, `exp`).
- **Signature:** HMAC SHA-256 signature signed with `JWT_SECRET`.
It has an expiration of 7 days (`7d`). The client sends it via header `Authorization: Bearer <token>`.

### Q23: How does Google OAuth 2.0 work in DevSync?
**Answer:** It follows the OpenID Connect authorization code flow:
1. User clicks "Sign in with Google", triggering `GET /api/auth/google`.
2. Server redirects browser to Google's consent screen with a random state token.
3. Google redirects to `GET /api/auth/google/callback` with an authorization code.
4. Server trades the code for tokens at `https://oauth2.googleapis.com/token`.
5. Server retrieves user profile from `https://www.googleapis.com/oauth2/v2/userinfo`.
6. Server finds or creates the user in PostgreSQL and returns a signed DevSync JWT.

### Q24: What happens if a Google user tries to log in with an email and password?
**Answer:** In `authController.ts`, the controller checks `if (!user.passwordHash)`. If null, it returns a 400 error explaining that the account was created with Google Sign-In and prompts the user to log in using Google.

### Q25: How does the logout endpoint work?
**Answer:** `POST /api/auth/logout` logs the user's logout event in the terminal via `logger.auth()`. The client removes the JWT from `localStorage`, immediately revoking authentication on the client side.

---

## Section 6: GitHub Integration & Cryptography

### Q26: How does DevSync store user GitHub OAuth tokens securely?
**Answer:** DevSync uses **AES-256-GCM (Galois/Counter Mode)** authenticated encryption in `server/src/utils/crypto.ts`.
- Generates a unique 12-byte (96-bit) Initialization Vector (IV) for each encryption.
- Encrypts the token using `GITHUB_TOKEN_ENCRYPTION_KEY`.
- Generates a 16-byte authentication tag that guarantees ciphertext authenticity and prevents bit-flipping attacks.
- Format saved to PostgreSQL: `iv:authTag:encryptedCiphertext`.

### Q27: How does DevSync verify that webhooks actually come from GitHub?
**Answer:** GitHub computes an HMAC digest of the webhook payload using a shared secret and sends it in the `x-hub-signature-256` header. DevSync computes `crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET).update(rawBody).digest('hex')` and validates it using `crypto.timingSafeEqual` to avoid timing side-channel attacks.

### Q28: How does the File Tree Explorer work without cloning the repository?
**Answer:** It uses GitHub's Contents API (`GET /repos/{owner}/{repo}/contents/{path}`). When a user navigates a folder, DevSync fetches that directory level's tree metadata on-demand, streaming file names, types, sizes, and links without consuming local server disk storage.

### Q29: How does the Commit Graph DAG work?
**Answer:** In `githubController.ts` -> `getCommitGraph`, DevSync queries the GitHub Commits API, extracting each commit's `sha`, `parents`, `author`, `message`, and timestamp. It formats this data into a Directed Acyclic Graph (DAG) with nodes (commits) and directed edges (parent-child relationships) rendered interactively on the frontend.

### Q30: How does automated repository provisioning work?
**Answer:** Project administrators can create a repository directly through DevSync. The backend decrypts the user's OAuth token and posts to `https://api.github.com/user/repos` with the repository name, description, and auto-init settings. Once created, DevSync saves the remote URL and automatically associates it with the DevSync project.

---

## Section 7: Difficult Faculty Questions & Architectural Justifications

### Q31: Why did you choose JWT instead of server-side sessions stored in Redis?
**Answer:** JWTs are stateless. The server does not need to query a session store on every request, allowing the API to scale horizontally across multiple instances without sticky sessions or centralized session replication. In our application, token payload verification is fast and offloads session storage to the client.

### Q32: What are the security trade-offs of storing JWTs in `localStorage`?
**Answer:** The primary risk of `localStorage` is vulnerability to Cross-Site Scripting (XSS). If malicious JavaScript runs in the browser, it can read `localStorage`. We mitigated this by sanitizing all user inputs with Zod, avoiding `dangerouslySetInnerHTML`, and using React's native JSX escaping. For production financial applications, using short-lived tokens in memory combined with `httpOnly` secure cookies for refresh tokens is the gold standard.

### Q33: How does your application handle concurrent updates to the same task?
**Answer:** When two users modify the same task, PostgreSQL handles row-level locking during `UPDATE` queries. The last committed write wins. Additionally, each model features an `updatedAt` timestamp. To achieve strict optimistic locking, we can compare the incoming `updatedAt` with the database timestamp and reject the request if the record was modified by another user in the interim.

### Q34: What happens if GitHub API rate limits are exceeded?
**Answer:** GitHub imposes an hourly quota of 5,000 requests per authenticated OAuth token. If exceeded, GitHub returns HTTP `403 Forbidden` with header `x-ratelimit-remaining: 0`. DevSync catches this error in `githubController.ts` and returns a descriptive error message indicating the rate limit was reached and providing the reset time. In our future scope, we recommend Redis caching for commit graphs and file trees to mitigate this.

### Q35: How does the webhook handler avoid duplicate processing of the same PR merge event?
**Answer:** In `githubController.ts`, when an incoming PR merge event arrives:
1. It queries `TaskPullRequest` where `pullRequestNumber = payload.pull_request.number`.
2. It checks `if (item.task.status !== 'DONE')`.
3. If the task is already marked `DONE`, it does not create duplicate activities or trigger redundant updates, ensuring idempotency.

### Q36: Why use Winston instead of simple `console.log()` statements?
**Answer:** `console.log` is synchronous in some environments, lacks log leveling, cannot format structured metadata, and writes unstructured text. Winston provides:
- Categorized channels (`AUTH`, `PROJECT`, `TASK`, `GITHUB`, `SYSTEM`, `ERROR`).
- Custom ANSI colorized formatting for readability in development.
- Automatic redaction of sensitive credentials.
- Configurable JSON serialization for production cloud logging (e.g. Datadog, AWS CloudWatch).

### Q37: How does DevSync prevent SQL Injection attacks?
**Answer:** All database operations are executed through Prisma ORM. Prisma automatically parameterizes every query, sending SQL commands and user data separately to the PostgreSQL server. User input is treated strictly as literal data, making SQL injection impossible even if a user submits malicious SQL syntax.

### Q38: If a user enters malicious HTML in task descriptions, how is it prevented from rendering?
**Answer:** React escapes all string variables rendered inside JSX expressions (`<div>{task.description}</div>`) by default before inserting them into the DOM. Special characters like `<`, `>`, and `&` are automatically converted to their corresponding HTML entities, thwarting Cross-Site Scripting (XSS) attacks.

### Q39: What are the main technical limitations of your project?
**Answer:**
1. OAuth CSRF state tokens are held in-memory rather than a distributed Redis cache.
2. Board synchronization relies on client polling and action refetching rather than full-duplex WebSockets.
3. Access tokens have a 7-day lifespan rather than short-lived tokens with rotating refresh tokens.

### Q40: What would you implement if you had an additional month of development?
**Answer:**
1. **WebSockets via Socket.io:** For real-time multi-user cursor tracking and instant drag-and-drop board updates.
2. **Redis Caching:** For GitHub commit graphs and repository file trees to conserve API rate limits.
3. **CI/CD Integration:** Querying GitHub Actions workflow runs to display live build pass/fail status directly on linked task cards.
