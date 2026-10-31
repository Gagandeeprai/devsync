# DevSync — GitHub Integration & Repository Synchronization Deep Dive

## 1. Overview of GitHub Capabilities

DevSync provides a deep, two-way integration with the GitHub platform. Rather than serving as a passive issue tracker, DevSync actively synchronizes repository states, commit histories, pull requests, and webhooks:

1. **OAuth Connection:** Connects a developer's GitHub account without exposing raw credentials.
2. **Repository Provisioning:** Automated in-app GitHub repository creation wizard.
3. **Repository Linking:** Associating GitHub repos with DevSync project workspaces.
4. **File Tree Browser:** Browsing remote repository directories and files without cloning the repository.
5. **Interactive Commit DAG Graph:** Visualizing parent-child commit topologies and branches.
6. **Pull Request Linking:** Explicitly linking GitHub PRs to DevSync task tickets.
7. **Automated Webhook Automation:** Listening for PR merges to mark tasks `DONE` automatically.

---

## 2. GitHub OAuth App Configuration

To enable the integration, a developer registers an **OAuth App** in GitHub under **Developer Settings → OAuth Apps**:
- **Application Name:** DevSync Platform
- **Homepage URL:** `http://localhost:5173`
- **Authorization Callback URL:** `http://localhost:5000/api/github/callback`
- **Requested OAuth Scopes:** `repo,read:user,user:email`
  - `repo`: Grants read/write access to public and private code, commits, pull requests, and collaborator management.
  - `read:user`: Grants profile retrieval (avatar, username, user ID).
  - `user:email`: Grants verified email address retrieval.

---

## 3. Step-by-Step Architectural Workflows

### A. Account Connection & Token Encryption
1. User clicks **"Connect GitHub"** in DevSync Settings (`client/src/pages/Settings.tsx`).
2. Client requests `GET /api/github/auth`.
3. Backend returns GitHub OAuth URL with state parameter.
4. User authorizes DevSync on GitHub.
5. GitHub redirects back to `http://localhost:5000/api/github/callback?code=...&state=...`.
6. Backend exchanges `code` for `access_token` with GitHub's token endpoint.
7. Backend fetches GitHub user profile (`https://api.github.com/user`).
8. Token is encrypted via **AES-256-GCM** using `server/src/utils/crypto.ts` and stored in `GitHubConnection`.
9. Server emits log: `[AUTH] GitHub account connected: @octocat for user id ...`

### B. Automated Remote Repository Creation
Under **Create Project Modal** (`client/src/components/modals/CreateProjectModal.tsx`), a project administrator can select *"Create new repository on GitHub"*:
1. Admin enters repo name, description, visibility (public/private), and checks *"Initialize with README"*.
2. Submits to `POST /api/github/projects/:projectId/create-repository`.
3. Backend decrypts the user's GitHub token and dispatches:
   ```http
   POST https://api.github.com/user/repos
   Authorization: Bearer <GITHUB_TOKEN>
   Content-Type: application/json

   {
     "name": "devsync-core",
     "description": "Core platform service",
     "private": false,
     "auto_init": true
   }
   ```
4. Upon creation, DevSync persists the `ProjectRepository` in PostgreSQL, logs the activity, and returns clone URLs and setup commands:
   ```bash
   git clone https://github.com/username/devsync-core.git
   cd devsync-core
   ```

### C. In-App Repository File Explorer
- **Endpoint:** `GET /api/github/projects/:projectId/contents?path=...`
- **Implementation:** Queries `https://api.github.com/repos/{owner}/{repo}/contents/{path}`.
- Displays directories and files with icons, file sizes, and direct GitHub links.
- **Architectural Efficiency:** No server-side git clone or storage overhead is incurred; exploration is stream-driven via GitHub's contents API.

### D. Interactive Commit Graph DAG
- **Endpoint:** `GET /api/github/projects/:projectId/commit-graph?limit=30`
- Fetches recent commits with their `sha`, `parents`, `author`, `message`, and timestamp.
- Computes directed acyclic graph (DAG) nodes and edges:
  - Node: Represents an individual commit with author avatar, abbreviated hash, and commit message.
  - Edge: Represents parent-to-child lineage.
- Frontend renders an interactive visual graph allowing engineers to click any node to view commit details.

### E. Pull Request Linking to Tasks
1. Developer opens a task ticket and enters the PR number or URL.
2. Client sends `POST /api/github/tasks/:taskId/pull-requests`.
3. Backend creates a record in `TaskPullRequest`:
   - `taskId`
   - `pullRequestNumber`
   - `pullRequestTitle`
   - `pullRequestUrl`
   - `pullRequestState` ('open')
4. Emits log: `[GITHUB] Pull request #42 linked to task: "Implement Login"`

---

## 4. Webhook Engine & PR Auto-Completion

### Webhook Configuration on GitHub:
- **Payload URL:** `http://<your-server>/api/github/webhook` (or ngrok/tunnel for local development)
- **Content Type:** `application/json`
- **Secret:** Configured in `GITHUB_WEBHOOK_SECRET`
- **Events:** Pull requests

### Processing Logic (`server/src/controllers/githubController.ts` -> `handleWebhook`):
1. **Signature Verification:**
   Calculates HMAC SHA-256 of `req.rawBody` using `GITHUB_WEBHOOK_SECRET` and compares with `x-hub-signature-256`. If mismatched, responds with HTTP 401.
2. **Event Parsing:**
   Checks if `event === 'pull_request'` and `action === 'closed'` with `pull_request.merged === true`.
3. **Database Synchronization:**
   - Queries `TaskPullRequest` where `pullRequestNumber = payload.pull_request.number`.
   - Updates `TaskPullRequest.pullRequestState = 'merged'`.
   - Iterates through linked tasks:
     ```typescript
     await prisma.task.update({
       where: { id: item.taskId },
       data: { status: 'DONE' },
     });
     ```
   - Inserts audit record: `TASK_AUTO_COMPLETED_VIA_PR`.
4. **Terminal Logging:**
   ```text
   [GITHUB] Webhook received and verified: event "pull_request"
   [GITHUB] Pull request #42 merged into main
   [TASK] Task auto-completed via PR #42
   ```
