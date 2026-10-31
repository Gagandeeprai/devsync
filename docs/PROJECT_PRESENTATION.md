# DevSync — Project Presentation & Faculty Evaluation Script

This document is your presentation master script for the Full Stack Development Skill Lab viva and faculty review.

---

## 1. The 2-Minute Project Pitch (Deliver to Faculty)

> "Good morning/afternoon, professors. Today I am presenting **DevSync**, a developer collaboration and engineering workflow platform designed to solve one of the most frustrating bottlenecks in modern software engineering: the operational gap between project management boards and version control repositories.
>
> In typical software teams, tasks are managed in tools like Jira or Trello, while actual code development happens on GitHub. As a result, tickets frequently drift out of sync with pull requests, developers spend excessive time switching contexts, and project permissions fail to reflect real team dynamics where an engineer might be a lead on one project but a junior contributor on another.
>
> DevSync unites these domains into a single, high-performance platform:
> 1. It provides **dynamic Kanban boards** with persistent drag-and-drop ordering and a formal senior code review workflow (`TODO` → `IN_PROGRESS` → `REVIEW` → `CHANGES_REQUESTED` → `DONE`).
> 2. It integrates deeply with **GitHub via OAuth 2.0**, securely encrypting developer access tokens at rest using AES-256-GCM authenticated encryption.
> 3. It embeds **in-app repository file browsers** and an interactive **commit DAG graph** so managers and developers can inspect codebase topologies without cloning repos locally.
> 4. And crucially, it implements **automated webhook synchronization**: whenever an engineer merges a pull request on GitHub, a cryptographically signed HMAC SHA-256 webhook automatically transitions the linked task ticket to `DONE` and creates an audit record.
>
> The system is built on a modern, decoupled stack using React 18, TypeScript, Tailwind CSS, and Zustand on the frontend, Express and Node.js on the backend, and PostgreSQL managed through Prisma ORM."

---

## 2. The 3-Minute Technical Architecture Walkthrough

> "Let's examine the architectural implementation of DevSync.
>
> Starting at the **Client Tier**, DevSync is built as a Single Page Application using **React 18** bundled with **Vite** for lightning-fast HMR and optimized tree-shaken builds. State management is organized into lightweight, reactive **Zustand stores** for authentication, projects, tasks, and UI modals. This eliminates global re-render cascades that plague Context API implementations. The UI utilizes Tailwind CSS and custom accessible component primitives with route guards protecting authenticated views.
>
> The client communicates with the **Backend Tier** via an **Express 4** REST API running on Node.js. All communication is authenticated using stateless **JSON Web Tokens (JWT)** signed via HMAC SHA-256 with a 7-day expiration. Inbound requests pass through a strictly ordered middleware pipeline:
> - Cross-Origin Resource Sharing (CORS),
> - Express JSON parsing with unparsed `rawBody` stream buffering,
> - JWT authentication middleware,
> - And our custom project permissions guard that enforces project-scoped capabilities.
>
> For data validation, we employ **Zod schemas** at controller boundaries to guarantee that all input conforms strictly to required types before touching the database.
>
> At the **Data Tier**, we use **PostgreSQL 16** managed via **Prisma ORM 5.22.0**. Our schema is normalized to 3rd Normal Form with 8 core models, including dedicated join tables for project memberships and task pull requests. We have implemented declarative cascading deletes to prevent orphaned records and B-tree indexes across all foreign keys and status fields to guarantee sub-millisecond query performance.
>
> Finally, our **External Integration Tier** connects to **Google OAuth** for passwordless single sign-on, **GitHub OAuth** with AES-256-GCM token encryption, and a **GitHub Webhook Engine** that validates HMAC SHA-256 signatures before triggering automated task transitions. All critical application events are streamed in real time to the terminal using a structured **Winston logger** color-coded by domain."

---

## 3. Database Architecture & ER Diagram Explanation

> "Our database schema consists of 8 normalized relational tables designed in PostgreSQL:
> 
> 1. **User Table:** Stores primary credentials, bcrypt-hashed passwords (cost factor 10), global roles, and Google OpenID identifiers.
> 2. **Project Table:** Contains project metadata, statuses, deadlines, and ownership.
> 3. **ProjectMember Join Table:** Enables our flexible project-level hierarchy. It uses a composite unique constraint on `(projectId, userId)` so that a user has an explicit role (`PROJECT_ADMIN`, `PROJECT_LEAD`, `SENIOR`, `DEVELOPER`, `INTERN`) within each project independently.
> 4. **Task Table:** Stores task details, priorities, assignee and reviewer foreign keys, and a floating-point `order` column for drag-and-drop indexing. Note that `assigneeId` and `reviewerId` use `onDelete: SetNull` so that deleting a user does not delete their assigned work.
> 5. **Activity Table:** An append-only audit trail recording every significant project event, indexed by timestamp for rapid timeline querying.
> 6. **GitHubConnection Table:** Maintains a 1-to-1 relationship with `User`, storing the AES-256-GCM encrypted GitHub access token alongside the IV and authentication tag.
> 7. **ProjectRepository Table:** Associates a GitHub repository ID, name, owner, and clone URL with a DevSync project.
> 8. **TaskPullRequest Table:** Connects GitHub PRs with DevSync tasks, featuring a composite unique constraint on `(taskId, pullRequestNumber)` to prevent duplicate associations."

---

## 4. Key Technical Concepts Directly Applied in DevSync

| Concept | Academic Definition | How It Is Implemented in DevSync |
|---|---|---|
| **REST API** | Representational State Transfer architecture using standard HTTP verbs. | Express routes in `server/src/routes/` implementing standard `GET`, `POST`, `PUT`, `PATCH`, `DELETE` operations returning JSON. |
| **JWT (JSON Web Token)** | Compact, URL-safe means of representing claims securely between two parties. | Issued in `authController.ts` upon login; contains `userId`, `email`, and `role`, signed with HS256 and verified on every request. |
| **OAuth 2.0** | Industry-standard protocol for authorization delegation. | Used for Google Sign-In and GitHub integration; exchanges authorization codes for access tokens with CSRF state verification. |
| **ORM (Prisma)** | Object-Relational Mapping to bridge object-oriented code and relational databases. | `schema.prisma` models database tables as TypeScript models, generating type-safe queries and handling migrations. |
| **PostgreSQL** | ACID-compliant open-source relational database management system. | Houses all DevSync tables, enforces foreign key constraints, unique constraints, and B-tree indexes. |
| **Zustand State Store** | Hook-based reactive state container for modern React. | Stores client data (`authStore`, `projectStore`, `taskStore`, `uiStore`) with selective atomic re-rendering. |
| **Express Middleware** | Functions that execute in the request-response cycle. | `authenticate` for JWT verification and `requireProjectPermission` for project-level authorization. |
| **HMAC SHA-256** | Keyed-hash message authentication code using SHA-256. | Used in `githubController.ts` to verify incoming webhook signatures against `GITHUB_WEBHOOK_SECRET`. |
| **AES-256-GCM** | Authenticated symmetric cipher providing confidentiality and authenticity. | Used in `crypto.ts` to encrypt user GitHub access tokens at rest in PostgreSQL. |
| **Bcrypt Hashing** | Adaptive one-way cryptographic hash function based on Blowfish. | Hashes passwords with 10 salt rounds in `authController.ts` before database storage. |
| **Cascading Deletion** | Referential action that automatically deletes child rows when the parent row is deleted. | Configured via Prisma (`onDelete: Cascade`) between `Project` and its `tasks`, `members`, and `activities`. |
| **Fractional Indexing** | Positioning items by calculating intermediate float values. | Kanban drag-and-drop computes `order = (prev + next) / 2` to update card positions with a single row update. |

---

## 5. Live Demonstration Guide for Evaluators

When presenting DevSync live, follow this 5-step walkthrough:

1. **Step 1: Local & Google Authentication**
   - Show `http://localhost:5173/login`.
   - Point out the demo accounts (`alex@devsync.io`, `sarah@devsync.io`, `marcus@devsync.io`).
   - Demonstrate the "Sign in with Google" button and local password registration with role selection.
2. **Step 2: Project Hierarchy & Permissions**
   - Log in as `alex@devsync.io` (Project Lead).
   - Navigate to **DevSync Core Platform → Team & Roles**.
   - Show that Sarah is `SENIOR` and Marcus is `INTERN`.
   - Explain the permission matrix: Marcus cannot approve tasks or manage repositories, while Sarah can conduct reviews.
3. **Step 3: Kanban Board & Senior Review Workflow**
   - Switch to the **Kanban** tab.
   - Drag a task from `TODO` to `IN_PROGRESS` and show instant persistence.
   - Open a task assigned to Marcus, enter review notes, and click **Submit for Review** (moving to `REVIEW`).
   - Switch to Sarah or Alex and demonstrate **Request Changes** (moving to `CHANGES_REQUESTED`) or **Approve Task** (moving to `DONE`).
4. **Step 4: GitHub Repository & Commit DAG Visualizer**
   - Switch to the **Code & Repository** tab.
   - Navigate the **File Explorer** showing directories and files retrieved live from GitHub.
   - Show the **Commit Graph** with commit nodes, parent-child edges, authors, and commit messages.
5. **Step 5: Terminal Activity Logging & Webhook Automation**
   - Bring up the backend terminal.
   - Highlight the colorized activity stream: `[AUTH]`, `[PROJECT]`, `[TASK]`, `[GITHUB]`.
   - Explain that merging a pull request triggers the HMAC SHA-256 webhook, automatically closing the ticket and logging the event to PostgreSQL and the terminal.
