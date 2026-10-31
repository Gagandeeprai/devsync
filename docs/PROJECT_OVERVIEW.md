# DevSync — Project Overview & Strategic Architecture

## 1. Executive Summary
**DevSync** is a developer collaboration and engineering workflow platform designed to eliminate the operational friction between task management, code repository exploration, and code review. It bridges the gap between project management boards (e.g., Jira, Trello, Linear) and software version control platforms (e.g., GitHub).

In traditional development environments, software engineers continually switch contexts between issue trackers, code editors, and GitHub pull requests. DevSync unites these domains into a single, cohesive developer workspace featuring:
- Role-based project team hierarchy (`PROJECT_ADMIN`, `PROJECT_LEAD`, `SENIOR`, `DEVELOPER`, `INTERN`).
- Dynamic Kanban boards with drag-and-drop float-based persistence.
- Two-way GitHub integration with OAuth token encryption (AES-256-GCM).
- In-app repository exploration (file tree browser and interactive Git DAG commit graph).
- Formal senior code review and intern verification workflows.
- Automated webhook synchronization (PR merges automatically transition tasks to `DONE`).
- Terminal-level structured real-time activity logging powered by Winston.

---

## 2. Core Problem Statement

### The Problem of Context Switching & Information Fragmentation
1. **Tool Fragmentation:** Engineering teams use one tool to manage tasks (Jira, Linear, ClickUp), another to host and inspect source code (GitHub), and separate channels for code reviews and workload auditing.
2. **Desynchronized Task State:** Project tickets frequently drift out of sync with actual git pull requests and commits. When a PR is merged on GitHub, developers often forget to move the associated Jira or Linear ticket to "Done".
3. **Flat or Inflexible Organizational Permissions:** Most SaaS tools apply blanket organization-wide permissions. However, in real engineering teams, an engineer may act as a **Senior/Lead** on one microservice while remaining a **Contributing Developer** or **Intern** on another project.
4. **Lack of Repository Context in Management Tools:** Managers and developers cannot view code structure, branch states, or commit histories directly alongside their task backlog without switching tabs.

### How DevSync Solves These Problems
- **Automated Lifecycle Synchronization:** Through secure GitHub webhooks with HMAC SHA-256 signature verification, merging a pull request on GitHub automatically finds linked tasks in PostgreSQL and marks them `DONE`, recording an audit event.
- **Project-Level Role Scoping:** DevSync introduces a dual-tier authorization model. Users have an application role and project-specific roles (`ProjectMember`), allowing flexible capability enforcement (e.g., only `SENIOR` or `PROJECT_LEAD` can approve tasks or manage repositories).
- **Direct Code Visualization:** DevSync embeds a non-cloning GitHub repository file browser and commit graph visualizer, allowing engineers to inspect repository files and commit DAG topologies without leaving the project board.

---

## 3. Target Audience & Personas

| Role | Operational Needs in DevSync |
|---|---|
| **Engineering Lead / Project Admin** | Provisions projects, configures GitHub repositories, assigns project roles, audits team activity, and monitors delivery velocity. |
| **Senior Software Engineer** | Reviews intern and developer task submissions, conducts code reviews, provides feedback (`CHANGES_REQUESTED`), and approves pull requests. |
| **Software Developer** | Manages assigned tasks, links GitHub pull requests to task tickets, updates task status via Kanban, and tracks project commit history. |
| **Intern / Junior Developer** | Works on assigned backlog items, submits work for review (`IN_REVIEW`), and receives structured feedback without having destructive project permissions. |
| **Project Evaluator / Academic Evaluator** | Audits the end-to-end full-stack implementation, architectural boundaries, security safeguards, and PostgreSQL schema normalization. |

---

## 4. Main System Modules

DevSync is structured into seven distinct architectural modules:

```
+-----------------------------------------------------------------------+
|                             DEVSYNC PLATFORM                          |
+-----------------------------------------------------------------------+
|  1. Authentication & Identity (Local JWT + Google OAuth 2.0)          |
|  2. Project Workspace & Team Hierarchy (Per-Project Role Scoping)     |
|  3. Task Management & Dynamic Kanban (Drag-and-Drop, Order Float)     |
|  4. Code Review & Verification Workflow (TODO -> REVIEW -> DONE)      |
|  5. GitHub Integration Engine (OAuth, Token Encrypt, File/Commit DAG) |
|  6. Automated Webhook Handler (HMAC SHA-256, PR Auto-Completion)      |
|  7. Observability & Logging (Winston Terminal Logging, Audit Trail)   |
+-----------------------------------------------------------------------+
```

1. **Authentication & Identity Module:** Handles local registration with bcrypt password hashing, standard JWT token issuance, Google OAuth 2.0 authorization, and secure session hydration.
2. **Project Workspace & Hierarchy Module:** Supports project CRUD, ownership transfer, collaborator invitation, and granular role enforcement (`PROJECT_ADMIN`, `PROJECT_LEAD`, `SENIOR`, `DEVELOPER`, `INTERN`).
3. **Task & Kanban Board Module:** Manages tasks across six states (`BACKLOG`, `TODO`, `IN_PROGRESS`, `REVIEW`, `CHANGES_REQUESTED`, `DONE`), priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and drag-and-drop order indexing.
4. **Code Review & Verification Module:** Implements gatekeeping workflows where developers submit tasks for review and designated senior reviewers either approve or request changes with detailed notes.
5. **GitHub Integration & Visualizer Module:** Connects user GitHub accounts using OAuth, encrypts tokens with AES-256-GCM, allows in-app remote repo creation, renders repository directory trees, and visualizes commit DAGs.
6. **Automated Webhook Synchronization Engine:** Listens for GitHub `pull_request` webhook events, validates cryptographic signatures, updates linked tasks in PostgreSQL, and records audit logs.
7. **Observability & Audit Module:** Tracks all business actions in an `Activity` ledger in PostgreSQL and streams real-time, categorized ANSI-colorized events to the backend terminal via Winston.

---

## 5. Comparative Analysis: DevSync vs. Industry Platforms

| Feature / Capability | DevSync | Jira | Linear | Trello | GitHub Projects |
|---|---|---|---|---|---|
| **Primary Focus** | Unified Project & Code Workflow | Enterprise Issue Tracking | Fast Issue Tracking | General Kanban | Native GitHub Tracking |
| **Project-Based Roles** | ✅ Native per-project hierarchy | ⚠️ Complex permission schemes | ❌ Global organization roles | ❌ Board-level admin/member | ⚠️ Repository permissions |
| **Embedded File Tree Explorer** | ✅ Native (API-driven) | ❌ Requires 3rd-party plugin | ❌ None | ❌ None | ⚠️ Must view on github.com |
| **Interactive Commit DAG Graph**| ✅ Native visualization | ❌ None | ❌ None | ❌ None | ❌ Flat commit list |
| **Token Encryption (AES-256-GCM)**| ✅ Server-side authenticated | Proprietary cloud vault | Proprietary cloud vault | N/A | GitHub internal |
| **PR Merge Auto-Task Completion**| ✅ Webhook with HMAC SHA-256 | ⚠️ Automation rules required | ✅ GitHub App integration | ⚠️ Power-Up required | ✅ Native integration |
| **Senior Review Verification** | ✅ Dedicated `REVIEW` workflow | ⚠️ Requires workflow editor | ⚠️ Custom statuses only | ❌ None | ⚠️ Native GitHub PR review |
| **Real-Time Terminal Activity Logging** | ✅ Winston `[CATEGORY]` logs | ❌ Server logs / Splunk | ❌ Cloud SaaS only | ❌ Cloud SaaS only | ❌ Cloud SaaS only |
| **Self-Hostable Full-Stack Stack**| ✅ Express + React + PostgreSQL | ❌ Jira Server discontinued | ❌ Closed-source SaaS | ❌ Closed-source SaaS | ❌ Closed-source SaaS |

---

## 6. Real-World Engineering Scenario

Consider a software development team delivering a payment gateway integration:

1. **Sprint Planning:** The `PROJECT_LEAD` creates a project `Payment Gateway v2` and invites `Senior Architect` (Role: `SENIOR`) and `Frontend Intern` (Role: `INTERN`).
2. **Repository Setup:** The Lead uses DevSync's **Automated GitHub Provisioning Wizard** to create `acme-org/payment-gateway` directly on GitHub with a README and default branch.
3. **Task Assignment:** The Lead creates a task *"Integrate Stripe Checkout Webhook"* and assigns it to the Intern, appointing the Senior Architect as the designated Reviewer.
4. **Intern Workflow:** The Intern starts working on the task, moving it to `IN_PROGRESS`. Once the branch is pushed and PR #14 is opened, the Intern links PR #14 to the task in DevSync and clicks **Submit for Review**.
5. **Code Review:** The Senior Architect reviews the submission. If edge-case handling is missing, the Senior clicks **Request Changes** with actionable notes, transitioning the task to `CHANGES_REQUESTED`.
6. **PR Merge & Auto-Completion:** Once the revisions are made and the PR is approved and merged on GitHub, GitHub delivers a signed webhook to DevSync. DevSync verifies the HMAC SHA-256 signature, locates task *"Integrate Stripe Checkout Webhook"*, transitions its status to `DONE`, logs the event to PostgreSQL `Activity`, and emits a colorized terminal log:
   `[GITHUB] Pull request #14 merged into main`
   `[TASK] Task auto-completed via PR #14`

