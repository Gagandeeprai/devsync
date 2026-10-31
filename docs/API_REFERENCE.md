# DevSync — Complete REST API Reference Manual

Base URL: `http://localhost:5000/api`

---

## 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Purpose | Auth | Request Body | Response Payload | Database Impact |
|---|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | Public | `{ name, email, password, role?, avatarUrl? }` | `{ success: true, token, user }` | `User` (INSERT), `Activity` (INSERT) |
| `POST` | `/api/auth/login` | Login with email and password | Public | `{ email, password }` | `{ success: true, token, user }` | None (SELECT `User`) |
| `POST` | `/api/auth/logout` | Log out user session | Bearer JWT | None | `{ success: true, message }` | None |
| `GET` | `/api/auth/me` | Fetch active user profile | Bearer JWT | None | `{ success: true, user }` | None (SELECT `User`) |
| `PUT` | `/api/auth/profile` | Update profile name or avatar | Bearer JWT | `{ name?, avatarUrl? }` | `{ success: true, user }` | `User` (UPDATE) |
| `GET` | `/api/auth/google` | Initiate Google OAuth flow | Public | None | HTTP 302 Redirect to Google | None |
| `GET` | `/api/auth/google/callback` | Handle Google OAuth redirect | Public | Query: `code`, `state` | HTTP 302 Redirect to frontend with token | `User` (UPSERT), `Activity` (INSERT) |
| `GET` | `/api/auth/google/client-id` | Retrieve Google Client ID | Public | None | `{ success: true, clientId }` | None |
| `POST` | `/api/auth/google/token` | Direct Google token exchange | Public | `{ name, email, googleId, avatarUrl? }` | `{ success: true, token, user }` | `User` (UPSERT), `Activity` (INSERT) |

---

## 2. Project Management Endpoints (`/api/projects`)

| Method | Endpoint | Purpose | Auth & Permissions | Request Body | Response Payload | Database Impact |
|---|---|---|---|---|---|---|
| `GET` | `/api/projects` | List all accessible projects | Bearer JWT | None | `{ success: true, projects: [...] }` | None (SELECT `Project`, `Task`) |
| `GET` | `/api/projects/:id` | Get project details by ID | Bearer JWT | None | `{ success: true, project: {...} }` | None (SELECT `Project`, `Task`, `User`) |
| `POST` | `/api/projects` | Create a new project | Bearer JWT | `{ name, description?, status?, deadline? }` | `{ success: true, project: {...} }` | `Project` (INSERT), `ProjectMember` (INSERT), `Activity` (INSERT) |
| `PUT` | `/api/projects/:id` | Update project metadata | `manage_project` | `{ name?, description?, status?, deadline? }` | `{ success: true, project: {...} }` | `Project` (UPDATE), `Activity` (INSERT) |
| `DELETE`| `/api/projects/:id` | Delete project and cascade data | `manage_project` | None | `{ success: true, message }` | `Project` (DELETE CASCADE), `Activity` (INSERT) |
| `GET` | `/api/projects/:id/members` | Get project members and stats | Bearer JWT | None | `{ success: true, members: [...], currentUserRole }` | None (SELECT `ProjectMember`, `Task`) |
| `POST` | `/api/projects/:id/members` | Add member with project role | `manage_project` | `{ userId, role }` | `{ success: true, member }` | `ProjectMember` (UPSERT), `Activity` (INSERT) |
| `PUT` | `/api/projects/:id/members/:userId` | Update member project role | `manage_project` | `{ role }` | `{ success: true, member }` | `ProjectMember` (UPDATE), `Activity` (INSERT) |
| `DELETE`| `/api/projects/:id/members/:userId` | Remove member from project | `manage_project` | None | `{ success: true, message }` | `ProjectMember` (DELETE) |
| `GET` | `/api/projects/:id/team-activity` | Unified DevSync & GitHub feed | `view_team_activity` | Query: `memberId?`, `since?` | `{ success: true, teamActivity: [...] }` | None (SELECT `Activity`, `GitHubConnection`) |

---

## 3. Task & Review Endpoints (`/api/tasks`)

| Method | Endpoint | Purpose | Auth & Permissions | Request Body | Response Payload | Database Impact |
|---|---|---|---|---|---|---|
| `GET` | `/api/tasks` | List tasks with filters & search | Bearer JWT | Query: `projectId?`, `status?`, `priority?`, `assigneeId?`, `search?` | `{ success: true, tasks: [...] }` | None (SELECT `Task`) |
| `GET` | `/api/tasks/:id` | Get task details by ID | Bearer JWT | None | `{ success: true, task: {...} }` | None (SELECT `Task`, `Activity`) |
| `POST` | `/api/tasks` | Create new task | Bearer JWT | `{ title, description?, status?, priority?, dueDate?, projectId, assigneeId?, reviewerId?, order? }` | `{ success: true, task: {...} }` | `Task` (INSERT), `Activity` (INSERT) |
| `PUT` | `/api/tasks/:id` | Update task fields | Bearer JWT | Partial task fields | `{ success: true, task: {...} }` | `Task` (UPDATE), `Activity` (INSERT) |
| `PATCH`| `/api/tasks/:id/status` | Update task status & Kanban order | Bearer JWT | `{ status, order? }` | `{ success: true, task: {...} }` | `Task` (UPDATE), `Activity` (INSERT) |
| `DELETE`| `/api/tasks/:id` | Delete task ticket | Bearer JWT | None | `{ success: true, message }` | `Task` (DELETE CASCADE), `Activity` (INSERT) |
| `POST` | `/api/tasks/:id/submit-for-review` | Submit task for senior review | `submit_for_review` | `{ notes? }` | `{ success: true, task: {...} }` | `Task` (UPDATE status to `REVIEW`), `Activity` (INSERT) |
| `POST` | `/api/tasks/:id/request-changes` | Senior requests revisions | `review_tasks` | `{ notes }` (required) | `{ success: true, task: {...} }` | `Task` (UPDATE status to `CHANGES_REQUESTED`), `Activity` (INSERT) |
| `POST` | `/api/tasks/:id/approve` | Approve task and mark DONE | `approve_work` | `{ notes? }` | `{ success: true, task: {...} }` | `Task` (UPDATE status to `DONE`), `Activity` (INSERT) |

---

## 4. GitHub Integration Endpoints (`/api/github`)

| Method | Endpoint | Purpose | Auth & Permissions | Request Body | Response Payload | Database Impact |
|---|---|---|---|---|---|---|
| `GET` | `/api/github/auth` | Initiate GitHub OAuth authorization | Bearer JWT | None | `{ success: true, authUrl }` | None (Stores state in memory) |
| `GET` | `/api/github/callback` | Handle GitHub OAuth callback | Public | Query: `code`, `state` | HTTP 302 Redirect to `/settings?github=connected` | `GitHubConnection` (UPSERT), `Activity` (INSERT) |
| `GET` | `/api/github/connection` | Check user GitHub connection status | Bearer JWT | None | `{ connected, username, connectedAt }` | None (SELECT `GitHubConnection`) |
| `DELETE`| `/api/github/disconnect` | Disconnect GitHub account | Bearer JWT | None | `{ success: true, message }` | `GitHubConnection` (DELETE), `Activity` (INSERT) |
| `GET` | `/api/github/repositories` | List accessible user GitHub repos | Bearer JWT | None | `{ success: true, repositories: [...] }` | None (Decodes token & calls GitHub API) |
| `POST` | `/api/github/projects/:projectId/repository` | Link repository to project | `manage_repository` | `{ repositoryId, repositoryName, repositoryOwner, repositoryUrl }` | `{ success: true, repository }` | `ProjectRepository` (UPSERT), `Activity` (INSERT) |
| `DELETE`| `/api/github/projects/:projectId/repository` | Unlink repository from project | `manage_repository` | None | `{ success: true, message }` | `ProjectRepository` (DELETE), `Activity` (INSERT) |
| `POST` | `/api/github/projects/:projectId/create-repository` | Auto-provision new repo on GitHub | `manage_repository` | `{ name, description?, isPrivate?, autoInit? }` | `{ success: true, repository, cloneUrl, cloneCommands }` | `ProjectRepository` (UPSERT), `Activity` (INSERT) |
| `GET` | `/api/github/projects/:projectId/contents` | File tree explorer | Bearer JWT | Query: `path?` | `{ success: true, currentPath, contents: [...] }` | None (Calls GitHub API) |
| `GET` | `/api/github/projects/:projectId/branches` | Branch explorer | Bearer JWT | None | `{ success: true, defaultBranch, branches: [...] }` | None (Calls GitHub API) |
| `GET` | `/api/github/projects/:projectId/commit-graph` | Visual commit DAG nodes | Bearer JWT | Query: `branch?`, `limit?` | `{ success: true, branch, nodes: [...], edges: [...] }` | None (Calls GitHub API) |
| `GET` | `/api/github/projects/:projectId/contributors` | Repository contributors | Bearer JWT | None | `{ success: true, contributors: [...] }` | None (Calls GitHub API) |
| `GET` | `/api/github/projects/:projectId/collaborators` | List collaborators | Bearer JWT | None | `{ success: true, collaborators: [...] }` | None (Calls GitHub API) |
| `POST` | `/api/github/projects/:projectId/collaborators` | Invite collaborator | `manage_repository` | `{ username, permission? }` | `{ success: true, invitation }` | None (Calls GitHub API) |
| `GET` | `/api/github/projects/:projectId/commits` | List recent commits | Bearer JWT | None | `{ success: true, commits: [...] }` | None (Calls GitHub API) |
| `GET` | `/api/github/projects/:projectId/pull-requests` | List pull requests | Bearer JWT | Query: `state?` | `{ success: true, pullRequests: [...] }` | None (Calls GitHub API) |
| `POST` | `/api/github/tasks/:taskId/pull-requests` | Associate PR with task | Bearer JWT | `{ repositoryId, pullRequestNumber, pullRequestTitle, pullRequestUrl, pullRequestState? }` | `{ success: true, pullRequest }` | `TaskPullRequest` (INSERT), `Activity` (INSERT) |
| `GET` | `/api/github/tasks/:taskId/pull-requests` | Get task's linked PRs | Bearer JWT | None | `{ success: true, pullRequests: [...] }` | None (SELECT `TaskPullRequest`) |
| `DELETE`| `/api/github/tasks/:taskId/pull-requests/:id` | Unlink PR from task | Bearer JWT | None | `{ success: true, message }` | `TaskPullRequest` (DELETE) |
| `POST` | `/api/github/webhook` | GitHub webhook handler (HMAC) | Public (HMAC Verified) | Headers: `x-hub-signature-256`, `x-github-event`. Body: GitHub Webhook Payload | `{ success: true, updatedTasks, isMerged }` | `TaskPullRequest` (UPDATE), `Task` (UPDATE to `DONE`), `Activity` (INSERT) |

---

## 5. Dashboard & Users Endpoints

| Method | Endpoint | Purpose | Auth | Request Body | Response Payload | Database Impact |
|---|---|---|---|---|---|---|
| `GET` | `/api/dashboard/stats` | Aggregated user and platform stats | Bearer JWT | None | `{ success: true, stats: { totalProjects, totalTasks, inProgressTasks, completedTasks, recentActivity } }` | None (SELECT aggregation) |
| `GET` | `/api/users` | List team users for assignees | Bearer JWT | None | `{ success: true, users: [...] }` | None (SELECT `User`) |
