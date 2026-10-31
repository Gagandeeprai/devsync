import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../types';
import { encryptToken, decryptToken } from '../utils/crypto';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/github/callback';
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'devsync-github-webhook-secret';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// In-memory OAuth state store (userId -> { state, timestamp }) with 10-minute expiry
const oauthStates = new Map<string, { userId: string; timestamp: number }>();

/**
 * 1. GET /api/github/auth
 * Initiates GitHub OAuth authorization flow
 */
export const initiateAuth = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!GITHUB_CLIENT_ID) {
      res.status(400).json({
        success: false,
        message: 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID in server environment variables.',
      });
      return;
    }

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const state = crypto.randomBytes(24).toString('hex');
    oauthStates.set(state, { userId, timestamp: Date.now() });

    // Clean up states older than 15 minutes
    const now = Date.now();
    for (const [key, value] of oauthStates.entries()) {
      if (now - value.timestamp > 15 * 60 * 1000) {
        oauthStates.delete(key);
      }
    }

    const scope = 'repo,read:user,user:email';
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
      GITHUB_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(GITHUB_CALLBACK_URL)}&scope=${encodeURIComponent(
      scope
    )}&state=${encodeURIComponent(state)}`;

    res.json({
      success: true,
      authUrl,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. GET /api/github/callback
 * Handles OAuth callback, exchanges code for access token, encrypts and stores in DB
 */
export const handleCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      res.redirect(`${CLIENT_URL}/settings?github_error=${encodeURIComponent(String(error_description || error))}`);
      return;
    }

    if (!code || !state || typeof state !== 'string') {
      res.redirect(`${CLIENT_URL}/settings?github_error=missing_oauth_parameters`);
      return;
    }

    const stateData = oauthStates.get(state);
    if (!stateData) {
      res.redirect(`${CLIENT_URL}/settings?github_error=invalid_or_expired_state`);
      return;
    }

    oauthStates.delete(state);
    const userId = stateData.userId;

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_CALLBACK_URL,
      }),
    });

    const tokenData: any = await tokenResponse.json();

    if (!tokenData.access_token) {
      res.redirect(
        `${CLIENT_URL}/settings?github_error=${encodeURIComponent(
          tokenData.error_description || 'failed_to_retrieve_access_token'
        )}`
      );
      return;
    }

    const accessToken = tokenData.access_token;

    // Fetch user details from GitHub API
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevSync-Platform',
      },
    });

    if (!userResponse.ok) {
      res.redirect(`${CLIENT_URL}/settings?github_error=failed_to_fetch_github_profile`);
      return;
    }

    const ghUser: any = await userResponse.json();
    const encryptedToken = encryptToken(accessToken);

    // Save or update GitHub connection in PostgreSQL
    await prisma.gitHubConnection.upsert({
      where: { userId },
      update: {
        githubUserId: String(ghUser.id),
        githubUsername: ghUser.login,
        encryptedAccessToken: encryptedToken,
      },
      create: {
        userId,
        githubUserId: String(ghUser.id),
        githubUsername: ghUser.login,
        encryptedAccessToken: encryptedToken,
      },
    });

    // Create Activity Log
    await prisma.activity.create({
      data: {
        action: 'GITHUB_CONNECTED',
        details: `Connected GitHub account @${ghUser.login}`,
        userId,
      },
    });

    res.redirect(`${CLIENT_URL}/settings?github=connected&username=${encodeURIComponent(ghUser.login)}`);
  } catch (error: any) {
    res.redirect(`${CLIENT_URL}/settings?github_error=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Helper to get decrypted token for a user
 */
async function getDecryptedTokenForUser(userId: string): Promise<{ token: string; username: string } | null> {
  const conn = await prisma.gitHubConnection.findUnique({ where: { userId } });
  if (!conn) return null;
  try {
    const token = decryptToken(conn.encryptedAccessToken);
    return { token, username: conn.githubUsername };
  } catch {
    return null;
  }
}

/**
 * 3. GET /api/github/connection
 * Retrieves current user's GitHub connection status (NEVER returns token)
 */
export const getConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const conn = await prisma.gitHubConnection.findUnique({
      where: { userId },
      select: {
        id: true,
        githubUserId: true,
        githubUsername: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      connected: !!conn,
      connection: conn,
      configured: !!GITHUB_CLIENT_ID,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. DELETE /api/github/disconnect
 * Disconnects user's GitHub account
 */
export const disconnect = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    await prisma.gitHubConnection.deleteMany({ where: { userId } });

    await prisma.activity.create({
      data: {
        action: 'GITHUB_DISCONNECTED',
        details: 'Disconnected GitHub account',
        userId,
      },
    });

    res.json({ success: true, message: 'GitHub account disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. GET /api/github/repositories
 * Lists repositories accessible to the user
 */
export const listRepositories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const auth = await getDecryptedTokenForUser(userId);
    if (!auth) {
      res.status(400).json({ success: false, message: 'GitHub account not connected', connected: false });
      return;
    }

    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevSync-Platform',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token revoked on GitHub side
        await prisma.gitHubConnection.deleteMany({ where: { userId } });
        res.status(401).json({ success: false, message: 'GitHub access token expired or revoked. Please reconnect.' });
        return;
      }
      res.status(response.status).json({ success: false, message: 'Failed to fetch repositories from GitHub' });
      return;
    }

    const repos: any = await response.json();
    const formatted = repos.map((r: any) => ({
      id: String(r.id),
      name: r.name,
      fullName: r.full_name,
      owner: r.owner.login,
      ownerAvatar: r.owner.avatar_url,
      description: r.description,
      private: r.private,
      url: r.html_url,
      defaultBranch: r.default_branch,
      updatedAt: r.updated_at,
    }));

    res.json({ success: true, repositories: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. POST /api/projects/:projectId/github/repository
 * Links a GitHub repository to a DevSync project
 */
export const linkRepository = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { repositoryId, repositoryName, repositoryOwner, repositoryUrl } = req.body;

    if (!repositoryId || !repositoryName || !repositoryOwner || !repositoryUrl) {
      res.status(400).json({ success: false, message: 'Missing repository details' });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const repo = await prisma.projectRepository.upsert({
      where: { projectId },
      update: {
        repositoryId: String(repositoryId),
        repositoryName,
        repositoryOwner,
        repositoryUrl,
      },
      create: {
        projectId,
        repositoryId: String(repositoryId),
        repositoryName,
        repositoryOwner,
        repositoryUrl,
      },
    });

    await prisma.activity.create({
      data: {
        action: 'PROJECT_REPO_LINKED',
        details: `Linked repository ${repositoryOwner}/${repositoryName}`,
        userId: req.user!.userId,
        projectId,
      },
    });

    res.json({ success: true, repository: repo });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. DELETE /api/projects/:projectId/github/repository
 * Unlinks the repository from a project
 */
export const unlinkRepository = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    await prisma.projectRepository.deleteMany({ where: { projectId } });

    await prisma.activity.create({
      data: {
        action: 'PROJECT_REPO_UNLINKED',
        details: 'Unlinked GitHub repository',
        userId: req.user!.userId,
        projectId,
      },
    });

    res.json({ success: true, message: 'Repository unlinked successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. GET /api/projects/:projectId/github/commits
 * Fetches recent commits from the linked repository
 */
export const getCommits = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const projectRepo = await prisma.projectRepository.findUnique({ where: { projectId } });

    if (!projectRepo) {
      res.json({ success: true, commits: [], linked: false });
      return;
    }

    const auth = await getDecryptedTokenForUser(req.user!.userId);
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DevSync-Platform',
    };
    if (auth?.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${projectRepo.repositoryOwner}/${projectRepo.repositoryName}/commits?per_page=25`,
      { headers }
    );

    if (!response.ok) {
      res.json({ success: true, commits: [], error: 'Could not fetch commits (verify repository permissions)' });
      return;
    }

    const data = await response.json();
    const commits = Array.isArray(data)
      ? data.map((c: any) => ({
          sha: c.sha,
          shortSha: c.sha.substring(0, 7),
          message: c.commit.message,
          authorName: c.commit.author?.name || c.author?.login || 'Unknown',
          authorAvatar: c.author?.avatar_url || null,
          date: c.commit.author?.date || c.commit.committer?.date,
          url: c.html_url,
        }))
      : [];

    res.json({ success: true, commits, repository: projectRepo, linked: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9. GET /api/projects/:projectId/github/pull-requests
 * Fetches pull requests from the linked repository
 */
export const getPullRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const state = (req.query.state as string) || 'all'; // open, closed, all

    const projectRepo = await prisma.projectRepository.findUnique({ where: { projectId } });
    if (!projectRepo) {
      res.json({ success: true, pullRequests: [], linked: false });
      return;
    }

    const auth = await getDecryptedTokenForUser(req.user!.userId);
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DevSync-Platform',
    };
    if (auth?.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${projectRepo.repositoryOwner}/${projectRepo.repositoryName}/pulls?state=${state}&per_page=50`,
      { headers }
    );

    if (!response.ok) {
      res.json({ success: true, pullRequests: [], error: 'Could not fetch pull requests' });
      return;
    }

    const data = await response.json();
    const pullRequests = Array.isArray(data)
      ? data.map((pr: any) => {
          let prState: 'open' | 'closed' | 'merged' = pr.state;
          if (pr.merged_at) prState = 'merged';

          return {
            id: String(pr.id),
            number: pr.number,
            title: pr.title,
            state: prState,
            authorName: pr.user?.login || 'Unknown',
            authorAvatar: pr.user?.avatar_url || null,
            createdAt: pr.created_at,
            mergedAt: pr.merged_at,
            closedAt: pr.closed_at,
            url: pr.html_url,
            draft: pr.draft || false,
          };
        })
      : [];

    res.json({ success: true, pullRequests, repository: projectRepo, linked: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 10. POST /api/tasks/:taskId/github/pull-requests
 * Associates a pull request with a task
 */
export const linkPullRequestToTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { repositoryId, pullRequestNumber, pullRequestTitle, pullRequestUrl, pullRequestState } = req.body;

    if (!pullRequestNumber || !pullRequestUrl) {
      res.status(400).json({ success: false, message: 'Pull request number and URL are required' });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    // Check for existing link to prevent duplicate associations
    const existing = await prisma.taskPullRequest.findUnique({
      where: {
        taskId_pullRequestNumber: {
          taskId,
          pullRequestNumber: Number(pullRequestNumber),
        },
      },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Pull Request #${pullRequestNumber} is already linked to this task`,
      });
      return;
    }

    const linkedPr = await prisma.taskPullRequest.create({
      data: {
        taskId,
        repositoryId: String(repositoryId || '0'),
        pullRequestNumber: Number(pullRequestNumber),
        pullRequestTitle: pullRequestTitle || `Pull Request #${pullRequestNumber}`,
        pullRequestUrl,
        pullRequestState: pullRequestState || 'open',
      },
    });

    await prisma.activity.create({
      data: {
        action: 'TASK_PR_LINKED',
        details: `Linked PR #${pullRequestNumber} to task "${task.title}"`,
        userId: req.user!.userId,
        taskId,
        projectId: task.projectId,
      },
    });

    res.json({ success: true, pullRequest: linkedPr });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 11. GET /api/tasks/:taskId/github/pull-requests
 * Lists pull requests associated with a task
 */
export const getTaskPullRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const prs = await prisma.taskPullRequest.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, pullRequests: prs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 12. DELETE /api/tasks/:taskId/github/pull-requests/:id
 * Unlinks a pull request from a task
 */
export const unlinkPullRequestFromTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.taskPullRequest.delete({ where: { id } });
    res.json({ success: true, message: 'Pull request unlinked' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 13. POST /api/github/webhook
 * Handles incoming GitHub webhook events with HMAC SHA-256 signature verification
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const event = req.headers['x-github-event'] as string;

    // Verify webhook signature if GITHUB_WEBHOOK_SECRET is configured
    if (GITHUB_WEBHOOK_SECRET && signature) {
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
      const expectedSignature = `sha256=${hmac.update(rawBody).digest('hex')}`;

      if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        res.status(401).json({ success: false, message: 'Invalid webhook signature' });
        return;
      }
    }

    // Process pull_request events
    if (event === 'pull_request') {
      const { action, pull_request } = req.body;

      if (!pull_request) {
        res.status(200).json({ received: true, ignored: 'no_pr_payload' });
        return;
      }

      const prNumber = pull_request.number;
      const isMerged = action === 'closed' && pull_request.merged === true;
      const currentState = isMerged ? 'merged' : pull_request.state;

      // Update any TaskPullRequest records linked to this PR number
      const linkedTaskPrs = await prisma.taskPullRequest.findMany({
        where: { pullRequestNumber: prNumber },
        include: { task: true },
      });

      if (linkedTaskPrs.length > 0) {
        // Update PR state in DB
        await prisma.taskPullRequest.updateMany({
          where: { pullRequestNumber: prNumber },
          data: { pullRequestState: currentState },
        });

        // If PR was merged, automatically transition tasks to DONE!
        if (isMerged) {
          for (const item of linkedTaskPrs) {
            if (item.task && item.task.status !== 'DONE') {
              await prisma.task.update({
                where: { id: item.taskId },
                data: { status: 'DONE' },
              });

              await prisma.activity.create({
                data: {
                  action: 'TASK_AUTO_COMPLETED_VIA_PR',
                  details: `Task "${item.task.title}" automatically marked DONE via merged PR #${prNumber}`,
                  userId: item.task.creatorId,
                  projectId: item.task.projectId,
                  taskId: item.task.id,
                },
              });
            }
          }
        }
      }

      res.status(200).json({
        success: true,
        action,
        prNumber,
        isMerged,
        updatedTasks: linkedTaskPrs.length,
      });
      return;
    }

    res.status(200).json({ received: true, event });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 14. GET /api/github/projects/:projectId/contents
 * Repository File Explorer: browse directories and files
 */
export const getRepositoryContents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const path = (req.query.path as string) || '';

    const projectRepo = await prisma.projectRepository.findUnique({ where: { projectId } });
    if (!projectRepo) {
      res.json({ success: true, contents: [], linked: false });
      return;
    }

    const auth = await getDecryptedTokenForUser(req.user!.userId);
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DevSync-Platform',
    };
    if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;

    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = `https://api.github.com/repos/${projectRepo.repositoryOwner}/${projectRepo.repositoryName}/contents/${cleanPath}`;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      res.json({
        success: true,
        contents: [],
        path: cleanPath,
        repository: projectRepo,
        error: 'Could not fetch directory contents from GitHub',
        linked: true,
      });
      return;
    }

    const data: any = await response.json();
    const items = Array.isArray(data)
      ? data.map((item: any) => ({
          name: item.name,
          path: item.path,
          sha: item.sha,
          size: item.size,
          type: item.type as 'file' | 'dir',
          html_url: item.html_url,
          download_url: item.download_url,
        })).sort((a: any, b: any) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'dir' ? -1 : 1;
        })
      : [data];

    res.json({
      success: true,
      path: cleanPath,
      contents: items,
      repository: projectRepo,
      linked: true,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 15. GET /api/github/projects/:projectId/branches
 * Branch Explorer: list branches, default branch, comparison links
 */
export const getBranches = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    const projectRepo = await prisma.projectRepository.findUnique({ where: { projectId } });
    if (!projectRepo) {
      res.json({ success: true, branches: [], linked: false });
      return;
    }

    const auth = await getDecryptedTokenForUser(req.user!.userId);
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DevSync-Platform',
    };
    if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;

    const response = await fetch(
      `https://api.github.com/repos/${projectRepo.repositoryOwner}/${projectRepo.repositoryName}/branches?per_page=30`,
      { headers }
    );

    if (!response.ok) {
      res.json({
        success: true,
        defaultBranch: projectRepo.defaultBranch || 'main',
        branches: [],
        repository: projectRepo,
        error: 'Could not fetch repository branches',
        linked: true,
      });
      return;
    }

    const branchesData: any = await response.json();
    const branches = Array.isArray(branchesData)
      ? branchesData.map((b: any) => ({
          name: b.name,
          sha: b.commit?.sha,
          commitUrl: b.commit?.url,
          isProtected: b.protected || false,
          isDefault: b.name === (projectRepo.defaultBranch || 'main'),
          compareUrl: `https://github.com/${projectRepo.repositoryOwner}/${projectRepo.repositoryName}/compare/${projectRepo.defaultBranch || 'main'}...${b.name}`,
        }))
      : [];

    res.json({
      success: true,
      defaultBranch: projectRepo.defaultBranch || 'main',
      branches,
      repository: projectRepo,
      linked: true,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 16. GET /api/github/projects/:projectId/commit-graph
 * Interactive Commit Graph: commits DAG with parent-child connections
 */
export const getCommitGraph = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const branch = req.query.branch as string;

    const projectRepo = await prisma.projectRepository.findUnique({ where: { projectId } });
    if (!projectRepo) {
      res.json({ success: true, nodes: [], edges: [], linked: false });
      return;
    }

    const auth = await getDecryptedTokenForUser(req.user!.userId);
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DevSync-Platform',
    };
    if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;

    const targetBranch = branch || projectRepo.defaultBranch || 'main';
    const response = await fetch(
      `https://api.github.com/repos/${projectRepo.repositoryOwner}/${projectRepo.repositoryName}/commits?sha=${encodeURIComponent(targetBranch)}&per_page=35`,
      { headers }
    );

    if (!response.ok) {
      res.json({
        success: true,
        branch: targetBranch,
        nodes: [],
        edges: [],
        totalCommits: 0,
        repository: projectRepo,
        error: 'Could not fetch commit graph from GitHub',
        linked: true,
      });
      return;
    }

    const commitsData: any = await response.json();
    if (!Array.isArray(commitsData)) {
      res.json({ success: true, nodes: [], edges: [], linked: true });
      return;
    }

    const nodes = commitsData.map((c: any, index: number) => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: c.commit?.message?.split('\n')[0] || 'No message',
      authorName: c.commit?.author?.name || c.author?.login || 'Unknown',
      authorAvatar: c.author?.avatar_url || null,
      date: c.commit?.author?.date || c.commit?.committer?.date,
      parents: Array.isArray(c.parents) ? c.parents.map((p: any) => p.sha) : [],
      html_url: c.html_url,
      order: index,
    }));

    const nodeShaSet = new Set(nodes.map((n: any) => n.sha));
    const edges: Array<{ source: string; target: string }> = [];

    nodes.forEach((node: any) => {
      node.parents.forEach((parentSha: string) => {
        if (nodeShaSet.has(parentSha)) {
          edges.push({ source: parentSha, target: node.sha });
        }
      });
    });

    res.json({
      success: true,
      branch: targetBranch,
      nodes,
      edges,
      totalCommits: nodes.length,
      repository: projectRepo,
      linked: true,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 17. GET /api/github/projects/:projectId/contributors
 * Repository Contributors and contribution stats
 */
export const getContributors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    const projectRepo = await prisma.projectRepository.findUnique({ where: { projectId } });
    if (!projectRepo) {
      res.json({ success: true, contributors: [], linked: false });
      return;
    }

    const auth = await getDecryptedTokenForUser(req.user!.userId);
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DevSync-Platform',
    };
    if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;

    const response = await fetch(
      `https://api.github.com/repos/${projectRepo.repositoryOwner}/${projectRepo.repositoryName}/contributors?per_page=30`,
      { headers }
    );

    if (!response.ok) {
      res.json({ success: true, contributors: [], linked: true });
      return;
    }

    const data: any = await response.json();
    const contributors = Array.isArray(data)
      ? data.map((c: any) => ({
          login: c.login,
          avatarUrl: c.avatar_url,
          contributions: c.contributions,
          html_url: c.html_url,
          type: c.type,
        }))
      : [];

    res.json({ success: true, contributors, linked: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 18. POST /api/github/projects/:projectId/create-repository
 * Automated Repository Provisioning on GitHub
 */
export const createRepository = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { name, description, isPrivate, autoInit } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, message: 'Repository name is required' });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const auth = await getDecryptedTokenForUser(req.user!.userId);
    if (!auth || !auth.token) {
      res.status(400).json({
        success: false,
        message: 'You must connect your GitHub account in Settings before creating repositories',
      });
      return;
    }

    const ghResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevSync-Platform',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim().replace(/\s+/g, '-'),
        description: description?.trim() || `DevSync repository for project ${project.name}`,
        private: !!isPrivate,
        auto_init: autoInit !== false,
      }),
    });

    if (!ghResponse.ok) {
      const errData: any = await ghResponse.json().catch(() => ({}));
      res.status(ghResponse.status).json({
        success: false,
        message: errData.message || 'Failed to create GitHub repository. Check permissions or repository name.',
      });
      return;
    }

    const newRepo: any = await ghResponse.json();

    // Link newly created repo to project
    const linked = await prisma.projectRepository.upsert({
      where: { projectId },
      update: {
        repositoryId: String(newRepo.id),
        repositoryName: newRepo.name,
        repositoryOwner: newRepo.owner.login,
        repositoryUrl: newRepo.html_url,
        defaultBranch: newRepo.default_branch || 'main',
        isPrivate: newRepo.private,
      },
      create: {
        projectId,
        repositoryId: String(newRepo.id),
        repositoryName: newRepo.name,
        repositoryOwner: newRepo.owner.login,
        repositoryUrl: newRepo.html_url,
        defaultBranch: newRepo.default_branch || 'main',
        isPrivate: newRepo.private,
      },
    });

    await prisma.activity.create({
      data: {
        action: 'GITHUB_REPO_PROVISIONED',
        details: `Provisioned new GitHub repository ${newRepo.owner.login}/${newRepo.name}`,
        userId: req.user!.userId,
        projectId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'GitHub repository created and linked successfully',
      repository: linked,
      cloneUrl: newRepo.clone_url,
      sshUrl: newRepo.ssh_url,
      cloneCommands: [
        `git clone ${newRepo.clone_url}`,
        `cd ${newRepo.name}`,
        `git checkout -b main`,
      ],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 19. GET /api/github/projects/:projectId/collaborators
 * List repository collaborators
 */
export const listCollaborators = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    const projectRepo = await prisma.projectRepository.findUnique({ where: { projectId } });
    if (!projectRepo) {
      res.json({ success: true, collaborators: [], linked: false });
      return;
    }

    const auth = await getDecryptedTokenForUser(req.user!.userId);
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DevSync-Platform',
    };
    if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;

    const response = await fetch(
      `https://api.github.com/repos/${projectRepo.repositoryOwner}/${projectRepo.repositoryName}/collaborators?per_page=30`,
      { headers }
    );

    if (!response.ok) {
      res.json({ success: true, collaborators: [], linked: true, error: 'Could not fetch collaborators' });
      return;
    }

    const data: any = await response.json();
    const collaborators = Array.isArray(data)
      ? data.map((c: any) => ({
          login: c.login,
          avatarUrl: c.avatar_url,
          permissions: c.permissions,
          html_url: c.html_url,
        }))
      : [];

    res.json({ success: true, collaborators, linked: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 20. POST /api/github/projects/:projectId/collaborators
 * Invite a collaborator to the GitHub repository
 */
export const inviteCollaborator = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { username, permission } = req.body;

    if (!username) {
      res.status(400).json({ success: false, message: 'GitHub username is required' });
      return;
    }

    const projectRepo = await prisma.projectRepository.findUnique({ where: { projectId } });
    if (!projectRepo) {
      res.status(404).json({ success: false, message: 'No GitHub repository linked to this project' });
      return;
    }

    const auth = await getDecryptedTokenForUser(req.user!.userId);
    if (!auth || !auth.token) {
      res.status(400).json({ success: false, message: 'GitHub connection required' });
      return;
    }

    const response = await fetch(
      `https://api.github.com/repos/${projectRepo.repositoryOwner}/${projectRepo.repositoryName}/collaborators/${username}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DevSync-Platform',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permission: permission || 'push', // pull, push, admin, maintain, triage
        }),
      }
    );

    if (!response.ok) {
      const errData: any = await response.json().catch(() => ({}));
      res.status(response.status).json({
        success: false,
        message: errData.message || 'Failed to send GitHub invitation',
      });
      return;
    }

    const data: any = await response.json().catch(() => ({}));

    await prisma.activity.create({
      data: {
        action: 'GITHUB_COLLABORATOR_INVITED',
        details: `Invited @${username} to repository ${projectRepo.repositoryName}`,
        userId: req.user!.userId,
        projectId,
      },
    });

    res.json({
      success: true,
      message: `Invitation sent to @${username}. They must accept it on GitHub.`,
      invitation: data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

