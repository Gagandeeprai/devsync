import http from 'http';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';

interface TestResult {
  category: string;
  testName: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function record(category: string, testName: string, passed: boolean, details?: string, error?: string) {
  results.push({ category, testName, passed, details, error });
  const symbol = passed ? '✅' : '❌';
  console.log(`${symbol} [${category}] ${testName} ${details ? `(${details})` : ''} ${error ? `-> ERROR: ${error}` : ''}`);
}

async function request(endpoint: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = new URL(`${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  const method = options.method || 'GET';
  const headers = options.headers || {};
  let payload = '';

  if (options.body) {
    payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }

  return new Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; data: any; raw: string }>((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ statusCode: res.statusCode || 0, headers: res.headers, data: parsed, raw: data });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runAudit() {
  console.log('=====================================================');
  console.log('🚀 STARTING COMPREHENSIVE DEVSYNC AUDIT SUITE');
  console.log('=====================================================\n');

  let authToken = '';
  let testUserId = '';
  let testProjectId = '';
  let testTaskId = '';
  const testEmail = `audit_${Date.now()}@devsync.test`;
  const testPassword = 'Password123!';

  // ==========================================
  // 1. AUTHENTICATION & SECURITY CHECKS
  // ==========================================
  console.log('\n--- 1. Authentication & Security ---');

  // 1.1 Protected route rejects unauthenticated request
  const unauthRes = await request('/projects');
  record('Auth Security', 'Unauthenticated request rejection', unauthRes.statusCode === 401 && !unauthRes.data.success);

  // 1.2 Protected route rejects invalid token
  const badTokenRes = await request('/projects', { headers: { Authorization: 'Bearer invalid-token-xyz' } });
  record('Auth Security', 'Invalid token rejection', badTokenRes.statusCode === 401 && !badTokenRes.data.success);

  // 1.3 User Registration
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Audit Engineer', email: testEmail, password: testPassword, role: 'DEVELOPER' },
  });
  const regPassed = regRes.statusCode === 201 && regRes.data.success && !regRes.data.user.passwordHash;
  record('Auth', 'User Registration with sanitized response', regPassed, `user: ${testEmail}`);
  if (regPassed) {
    authToken = regRes.data.token;
    testUserId = regRes.data.user.id;
  }

  // 1.4 Duplicate email registration rejection
  const dupRegRes = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Audit Engineer', email: testEmail, password: testPassword, role: 'DEVELOPER' },
  });
  record('Auth', 'Duplicate registration prevention', dupRegRes.statusCode === 400 || dupRegRes.statusCode === 409);

  // 1.5 Login with invalid password
  const badLoginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: testEmail, password: 'WrongPassword999!' },
  });
  record('Auth', 'Invalid password rejection', badLoginRes.statusCode === 401 && !badLoginRes.data.success);

  // 1.6 Login with valid credentials
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: testEmail, password: testPassword },
  });
  const loginPassed = loginRes.statusCode === 200 && loginRes.data.success && !!loginRes.data.token && !loginRes.data.user.passwordHash;
  record('Auth', 'Valid password login', loginPassed);
  if (loginPassed) {
    authToken = loginRes.data.token;
  }

  // 1.7 Google OAuth Redirect endpoint
  const googleAuthRes = await request('/auth/google');
  const googleAuthPassed = googleAuthRes.statusCode === 302 && String(googleAuthRes.headers.location).includes('accounts.google.com');
  record('Google Auth', 'Google OAuth redirect initiation', googleAuthPassed, `Location: ${googleAuthRes.headers.location?.substring(0, 50)}...`);

  // 1.8 Google Client ID endpoint
  const googleClientRes = await request('/auth/google/client-id');
  record('Google Auth', 'Google Client ID endpoint exposure', googleClientRes.statusCode === 200 && googleClientRes.data.success);

  // ==========================================
  // 2. GITHUB INTEGRATION
  // ==========================================
  console.log('\n--- 2. GitHub Integration ---');

  const authHeaders = { Authorization: `Bearer ${authToken}` };

  // 2.1 GitHub OAuth initiation URL
  const ghAuthRes = await request('/github/auth', { headers: authHeaders });
  const ghAuthPassed = ghAuthRes.statusCode === 200 && ghAuthRes.data.success && String(ghAuthRes.data.authUrl).includes('github.com/login/oauth/authorize');
  record('GitHub Integration', 'OAuth auth URL generation', ghAuthPassed);

  // 2.2 GitHub Connection status (ensure NO token leak)
  const ghConnRes = await request('/github/connection', { headers: authHeaders });
  const noTokenLeak = ghConnRes.statusCode === 200 && !ghConnRes.raw.includes('encryptedAccessToken') && !ghConnRes.raw.includes('token');
  record('GitHub Integration', 'Connection query (zero token exposure)', noTokenLeak);

  // ==========================================
  // 3. PROJECTS CRUD
  // ==========================================
  console.log('\n--- 3. Projects CRUD ---');

  // 3.1 Create Project
  const createProjRes = await request('/projects', {
    method: 'POST',
    headers: authHeaders,
    body: {
      name: 'Audit Test Project',
      description: 'Project created during full system audit',
      key: `AUDIT${Date.now() % 10000}`,
    },
  });
  const projPassed = createProjRes.statusCode === 201 && createProjRes.data.success;
  record('Projects', 'Create Project', projPassed);
  if (projPassed) {
    testProjectId = createProjRes.data.project.id;
  }

  // 3.2 List Projects
  const listProjRes = await request('/projects', { headers: authHeaders });
  record('Projects', 'List Projects', listProjRes.statusCode === 200 && Array.isArray(listProjRes.data.projects));

  // 3.3 Get Project by ID
  const getProjRes = await request(`/projects/${testProjectId}`, { headers: authHeaders });
  record('Projects', 'Get Project by ID', getProjRes.statusCode === 200 && getProjRes.data.project.id === testProjectId);

  // 3.4 Update Project
  const updateProjRes = await request(`/projects/${testProjectId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: {
      name: 'Audit Test Project (Updated)',
      description: 'Updated project description',
    },
  });
  record('Projects', 'Update Project', updateProjRes.statusCode === 200 && updateProjRes.data.project.name === 'Audit Test Project (Updated)');

  // ==========================================
  // 4. TASKS CRUD & METADATA
  // ==========================================
  console.log('\n--- 4. Tasks CRUD & Metadata ---');

  // 4.1 Create Task with full metadata
  const createTaskRes = await request('/tasks', {
    method: 'POST',
    headers: authHeaders,
    body: {
      title: 'Audit Verification Task',
      description: 'Verify task lifecycle, priority, status and assignees',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      projectId: testProjectId,
      assigneeId: testUserId,
    },
  });
  const taskCreated = createTaskRes.statusCode === 201 && createTaskRes.data.success;
  record('Tasks', 'Create Task with priority & due date', taskCreated);
  if (taskCreated) {
    testTaskId = createTaskRes.data.task.id;
  }

  // 4.2 List Tasks with filters
  const listTasksRes = await request(`/tasks?projectId=${testProjectId}&status=TODO&priority=HIGH`, { headers: authHeaders });
  record('Tasks', 'List Tasks with multi-parameter filter', listTasksRes.statusCode === 200 && listTasksRes.data.tasks.length >= 1);

  // 4.3 Get Task by ID
  const getTaskRes = await request(`/tasks/${testTaskId}`, { headers: authHeaders });
  record('Tasks', 'Get Task by ID', getTaskRes.statusCode === 200 && getTaskRes.data.task.id === testTaskId);

  // 4.4 Update Task details
  const updateTaskRes = await request(`/tasks/${testTaskId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: {
      title: 'Audit Verification Task (Refined)',
      priority: 'URGENT',
    },
  });
  record('Tasks', 'Update Task Priority to URGENT', updateTaskRes.statusCode === 200 && updateTaskRes.data.task.priority === 'URGENT');

  // ==========================================
  // 5. KANBAN DRAG & DROP PERSISTENCE
  // ==========================================
  console.log('\n--- 5. Kanban Drag-and-Drop Persistence ---');

  // 5.1 Move task to IN_PROGRESS with order
  const moveTaskRes = await request(`/tasks/${testTaskId}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: { status: 'IN_PROGRESS', order: 2500 },
  });
  const movePassed = moveTaskRes.statusCode === 200 && moveTaskRes.data.task.status === 'IN_PROGRESS' && moveTaskRes.data.task.order === 2500;
  record('Kanban', 'Update Task Status & Order (Kanban move)', movePassed);

  // 5.2 Verify activity log entry for the move
  const activity = await prisma.activity.findFirst({
    where: { taskId: testTaskId, action: 'TASK_MOVED' },
  });
  record('Kanban', 'Activity log audit trail for status move', !!activity);

  // ==========================================
  // 6. GITHUB REPOSITORY & PR TASK LINKING
  // ==========================================
  console.log('\n--- 6. GitHub Repo & PR Linking ---');

  // 6.1 Link repository to project
  const linkRepoRes = await request(`/github/projects/${testProjectId}/repository`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      repositoryId: '987654321',
      repositoryName: 'audit-repo',
      repositoryOwner: 'devsync-org',
      repositoryUrl: 'https://github.com/devsync-org/audit-repo',
      defaultBranch: 'main',
      isPrivate: false,
    },
  });
  record('GitHub Integration', 'Link Repository to Project', linkRepoRes.statusCode === 200 && linkRepoRes.data.success);

  // 6.2 Link PR to task
  const linkPrRes = await request(`/github/tasks/${testTaskId}/pull-requests`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      repositoryId: '987654321',
      pullRequestNumber: 42,
      pullRequestTitle: 'feat: add audit verification tests',
      pullRequestUrl: 'https://github.com/devsync-org/audit-repo/pull/42',
      pullRequestState: 'open',
    },
  });
  const linkPrPassed = linkPrRes.statusCode === 200 && linkPrRes.data.success;
  record('GitHub Integration', 'Link Pull Request to Task', linkPrPassed);

  // 6.3 Prevent duplicate PR linking
  const dupPrRes = await request(`/github/tasks/${testTaskId}/pull-requests`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      repositoryId: '987654321',
      pullRequestNumber: 42,
      pullRequestTitle: 'feat: add audit verification tests',
      pullRequestUrl: 'https://github.com/devsync-org/audit-repo/pull/42',
      pullRequestState: 'open',
    },
  });
  record('GitHub Integration', 'Duplicate PR link rejection', dupPrRes.statusCode === 409 && !dupPrRes.data.success);

  // 6.4 Retrieve Task Pull Requests
  const getTaskPrsRes = await request(`/github/tasks/${testTaskId}/pull-requests`, { headers: authHeaders });
  record('GitHub Integration', 'Get Task Linked PRs', getTaskPrsRes.statusCode === 200 && getTaskPrsRes.data.pullRequests.length === 1);

  // ==========================================
  // 7. WEBHOOK SIGNATURE & AUTOMATION
  // ==========================================
  console.log('\n--- 7. Webhook Signature & Auto Task Status ---');

  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'devsync-github-webhook-secret-2026';
  const webhookPayload = JSON.stringify({
    action: 'closed',
    pull_request: {
      number: 42,
      merged: true,
      title: 'feat: add audit verification tests',
      html_url: 'https://github.com/devsync-org/audit-repo/pull/42',
    },
    repository: {
      id: 987654321,
      name: 'audit-repo',
      owner: { login: 'devsync-org' },
    },
  });

  // 7.1 Webhook rejected with invalid signature
  const badSigRes = await request('/github/webhook', {
    method: 'POST',
    headers: {
      'x-github-event': 'pull_request',
      'x-hub-signature-256': 'sha256=invalid-signature-hash',
    },
    body: webhookPayload,
  });
  record('Webhook', 'Invalid HMAC signature rejection (401)', badSigRes.statusCode === 401);

  // 7.2 Webhook accepted with valid HMAC SHA-256 signature
  const validSignature = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(webhookPayload).digest('hex');
  const validSigRes = await request('/github/webhook', {
    method: 'POST',
    headers: {
      'x-github-event': 'pull_request',
      'x-hub-signature-256': validSignature,
    },
    body: webhookPayload,
  });
  record('Webhook', 'Valid HMAC signature acceptance', validSigRes.statusCode === 200 && validSigRes.data.success);

  // 7.3 Verify task status automatically transitioned to DONE in PostgreSQL
  const autoDoneTask = await prisma.task.findUnique({ where: { id: testTaskId } });
  record('Webhook Automation', 'Auto-update linked task to DONE on PR merge', autoDoneTask?.status === 'DONE');

  // ==========================================
  // 8. DATABASE RELATIONS & PRISMA SCHEMA
  // ==========================================
  console.log('\n--- 8. Database Relations & Prisma Schema ---');

  const usersCount = await prisma.user.count();
  const projectsCount = await prisma.project.count();
  const tasksCount = await prisma.task.count();
  const reposCount = await prisma.projectRepository.count();
  const prLinksCount = await prisma.taskPullRequest.count();

  record('Database Schema', 'PostgreSQL relations & counts intact', usersCount > 0 && projectsCount > 0 && tasksCount > 0, 
    `Users: ${usersCount}, Projects: ${projectsCount}, Tasks: ${tasksCount}, Repos: ${reposCount}, TaskPRs: ${prLinksCount}`);

  // ==========================================
  // CLEANUP TEST FIXTURES (SAFE - test created only)
  // ==========================================
  console.log('\n--- Cleaning up test fixtures ---');
  await prisma.taskPullRequest.deleteMany({ where: { taskId: testTaskId } });
  await prisma.activity.deleteMany({ where: { userId: testUserId } });
  await prisma.task.delete({ where: { id: testTaskId } });
  await prisma.projectRepository.deleteMany({ where: { projectId: testProjectId } });
  await prisma.project.delete({ where: { id: testProjectId } });
  await prisma.user.delete({ where: { id: testUserId } });
  record('Cleanup', 'Test fixtures safely removed without affecting application data', true);

  console.log('\n=====================================================');
  console.log('AUDIT SUMMARY');
  console.log('=====================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total tests: ${total} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter((r) => !r.passed).forEach((r) => console.log(`  - [${r.category}] ${r.testName}`));
  }
}

runAudit()
  .catch((err) => {
    console.error('Fatal audit suite error:', err);
  })
  .finally(() => prisma.$disconnect());
