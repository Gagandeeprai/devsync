# DevSync — Complete Technology Stack & Tooling

Every dependency in DevSync has been verified against the active codebase and `package.json` configurations.

---

## 1. Frontend Technologies

| Technology | Version | Architectural Role | Why It Was Chosen |
|---|---|---|---|
| **React** | `18.3.1` | User Interface Framework | Component-based UI architecture, Virtual DOM diffing, and declarative UI states using modern hooks (`useState`, `useEffect`, `useCallback`, `useMemo`). |
| **TypeScript** | `5.6.3` | Type System | Provides strict static type safety across components, props, state stores, and API responses, eliminating runtime `undefined` errors. |
| **Vite** | `5.4.10` | Build Tool & Dev Server | Native ES-module-based bundling with near-instantaneous Hot Module Replacement (HMR) and optimized Rollup production builds. |
| **Tailwind CSS** | `3.4.14` | CSS Framework | Utility-first styling enabling atomic, maintainable designs without CSS bloat. Fully customized color palette (slate, indigo, violet, emerald, amber, rose). |
| **React Router DOM** | `6.27.0` | Client-Side Routing | Declarative routing with nested layouts (`AppLayout`), route protection guards (`ProtectedRoute`), and dynamic route parameters (`/projects/:id`). |
| **Zustand** | `5.0.0` | Global State Management | Lightweight, hook-based state management without boilerplate or reducer ceremonies. Used for `authStore`, `projectStore`, `taskStore`, and `uiStore`. |
| **Lucide React** | `0.454.0` | Iconography | High-quality, tree-shakeable SVG icons for navigation, status badges, buttons, and visual cues. |
| **clsx & tailwind-merge** | `2.1.1` / `2.5.4` | Utility Styling Helpers | Combined into the standard `cn()` helper function located in `client/src/lib/utils.ts` to merge conditional Tailwind class strings cleanly without class conflicts. |
| **date-fns** | `3.6.0` | Date & Time Utilities | Immutable date formatting, relative time calculation ("3 days ago"), and deadline parsing without the overhead of Moment.js. |

---

## 2. Backend Technologies

| Technology | Version | Architectural Role | Why It Was Chosen |
|---|---|---|---|
| **Node.js** | `>=20.x` | JavaScript Runtime | Event-driven, non-blocking I/O runtime optimal for handling concurrent HTTP requests and external webhook processing. |
| **Express** | `4.21.1` | Web Application Framework | Minimalist HTTP server framework providing router composition, middleware pipelining, and JSON request/response handling. |
| **TypeScript** | `5.6.3` | Backend Type Safety | Enables end-to-end type parity with Prisma client types and shared domain interfaces. |
| **Winston** | `3.19.0` | Structured Real-Time Logging | High-performance logging framework configured with custom ANSI-colored formatters for terminal output (`[AUTH]`, `[PROJECT]`, `[TASK]`, `[GITHUB]`) and JSON for production. |
| **bcryptjs** | `2.4.3` | Password Hashing | Pure JavaScript implementation of the Blowfish-based bcrypt algorithm with 10 salt rounds for secure, one-way password hashing. |
| **jsonwebtoken (JWT)** | `9.0.2` | Stateless Authentication | Issues cryptographically signed HS256 tokens carrying user claims (`userId`, `email`, `role`) with 7-day expiration. |
| **Zod** | `3.23.8` | Schema Validation | Runtime TypeScript-first schema declaration and validation library. Validates all inbound request bodies at controller boundaries. |
| **cors** | `2.8.5` | Cross-Origin Security | Configures CORS headers to allow local development between Vite (`localhost:5173`) and Express (`localhost:5000`) with credentials support. |
| **dotenv** | `16.4.5` | Environment Configuration | Loads configuration variables from `.env` into `process.env` at server initialization. |
| **tsx** | `4.19.2` | Dev Execution Engine | TypeScript Execute for live development execution and fast TS script running without manual compilation steps. |
| **Node.js `crypto`** | Built-in | Cryptographic Operations | Provides AES-256-GCM authenticated cipher encryption for GitHub OAuth tokens, HMAC SHA-256 webhook signature verification, and CSPRNG state generation. |

---

## 3. Database & ORM Stack

| Technology | Version | Role | Why It Was Chosen |
|---|---|---|---|
| **PostgreSQL** | `16` | Relational Database Management System | ACID-compliant relational database providing relational integrity, strict constraints, transactional safety, and foreign key cascades. |
| **Prisma ORM** | `5.22.0` | Object-Relational Mapper & Client | Declarative schema modeling (`schema.prisma`), auto-generated type-safe TypeScript client (`@prisma/client`), and database migration/push tools. |

---

## 4. External APIs & OAuth Protocols

| Integration | Specification / Version | Role | Technical Implementation |
|---|---|---|---|
| **GitHub OAuth 2.0** | OAuth 2.0 RFC 6749 | User Authorization & Identity | Authorization Code grant flow requesting `repo,read:user,user:email` scopes with CSRF state verification. |
| **GitHub REST API** | REST API v3 / 2022-11-28 | Remote Repository Operations | Fetching user repositories, commits, pull requests, file directory trees, branches, contributors, and creating repositories. |
| **GitHub Webhooks** | HTTP POST Callback | Real-Time Repository Events | Subscribed to `pull_request` events; payload verified via `x-hub-signature-256` HMAC SHA-256. |
| **Google OAuth 2.0** | OpenID Connect (OIDC) | Social Authentication | Secure single sign-on using authorization code exchange via `https://oauth2.googleapis.com/token` and user profile retrieval. |

---

## 5. Development & Testing Tools

| Tool | Version | Role |
|---|---|---|
| **audit_suite.ts** | Custom Runner | 40-test comprehensive end-to-end integration and API verification suite testing all core endpoints and database constraints. |
| **Puppeteer Core** | `25.16.0` | Headless Chrome UI testing and visual screenshot verification. |
| **Postman / REST Client / curl** | Standard | Manual and automated API endpoint verification. |
| **pgAdmin 4** | Standard GUI | Visual inspection of PostgreSQL tables, constraints, foreign keys, and indexes. |

