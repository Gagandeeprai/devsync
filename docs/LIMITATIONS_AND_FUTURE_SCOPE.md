# DevSync — Technical Limitations & Future Scope

This document provides a realistic, objective engineering assessment of current system limitations and outlines the recommended roadmap for enterprise scaling.

---

## 1. Current Technical Limitations

### A. Scalability & State Storage
- **In-Memory OAuth States:** Temporary OAuth state tokens for Google and GitHub are stored in memory (`new Map<string, ...>()`). In a horizontally scaled multi-instance deployment behind a load balancer, state tokens would need to be stored in a centralized cache (such as Redis) to allow any backend instance to validate the callback.
- **Client Synchronization via Polling:** The frontend updates board states via user actions and refetching rather than full-duplex WebSocket connections. Simultaneous edits by multiple users require page refreshes to synchronize board cards.

### B. External API Constraints
- **GitHub Rate Limits:** GitHub REST API v3 imposes an hourly quota of 5,000 requests per authenticated user token. In a high-velocity development team with dozens of engineers constantly navigating commit graphs and file trees, aggressive browsing could consume rate limits.

### C. Authentication & Session Lifecycles
- **Single 7-Day Access Token:** The current implementation uses a single 7-day JWT. While simple and stateless, industry best practices favor short-lived access tokens (15 minutes) combined with rotating refresh tokens stored in `httpOnly` secure cookies.
- **Brute-Force Rate Limiting:** While input validation and password hashing with bcrypt are robust, IP-based rate limiting (e.g. `express-rate-limit`) is not yet enforced on `POST /api/auth/login`.

### D. Webhook Ingestion Resilience
- **Synchronous Webhook Processing:** Inbound GitHub webhooks are processed synchronously within the HTTP request lifecycle. Under massive spikes of simultaneous PR merges, a worker queue (e.g. BullMQ with Redis) would decouple webhook ingestion from database updates.

---

## 2. Future Engineering Scope & Roadmap

```
+-------------------------------------------------------------------------+
|                         DEVSYNC ROADMAP                                 |
+-------------------------------------------------------------------------+
| Phase 1: Real-Time WebSockets (Socket.io live Kanban card movement)    |
| Phase 2: Redis Caching Layer (GitHub commit DAG and file tree caches)   |
| Phase 3: Short-Lived JWT + Refresh Token Rotation with HttpOnly Cookies |
| Phase 4: CI/CD Pipeline Integration (Triggering GitHub Actions in-app)  |
| Phase 5: Containerization & Helm Charts (Docker Compose & Kubernetes)   |
+-------------------------------------------------------------------------+
```

### 1. Real-Time Collaborative Kanban (WebSockets)
- Integrating **Socket.io** so that when one developer moves a card or a webhook completes a task, the change instantly reflects across all team members' screens without manual reloading.

### 2. Redis Cache for GitHub Metadata
- Caching repository directory trees and commit graphs with a 5-minute TTL to reduce GitHub API consumption by over 80%.

### 3. Asynchronous Webhook Queue (BullMQ)
- Enqueuing verified webhooks into an asynchronous Redis-backed message queue with exponential backoff retries.

### 4. Direct CI/CD Pipeline Observability
- Extending GitHub integration to query GitHub Actions workflow runs (`/repos/{owner}/{repo}/actions/runs`), enabling teams to see build and test pass/fail indicators directly on linked task cards.

### 5. Multi-Container Orchestration
- Authoring production `Dockerfile` manifests for client and server with a top-level `docker-compose.yml` specifying PostgreSQL, Redis, and automated health checks.

