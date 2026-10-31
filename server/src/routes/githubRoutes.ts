import { Router } from 'express';
import {
  initiateAuth,
  handleCallback,
  getConnection,
  disconnect,
  listRepositories,
  linkRepository,
  unlinkRepository,
  getCommits,
  getPullRequests,
  linkPullRequestToTask,
  getTaskPullRequests,
  unlinkPullRequestFromTask,
  handleWebhook,
  getRepositoryContents,
  getBranches,
  getCommitGraph,
  getContributors,
  createRepository,
  listCollaborators,
  inviteCollaborator,
} from '../controllers/githubController';
import { authenticate } from '../middleware/auth';
import { requireProjectPermission } from '../middleware/projectPermissions';

const router = Router();

// OAuth Handshake
router.get('/auth', authenticate, initiateAuth);
router.get('/callback', handleCallback);
router.get('/connection', authenticate, getConnection);
router.delete('/disconnect', authenticate, disconnect);

// Repositories
router.get('/repositories', authenticate, listRepositories);
router.post('/projects/:projectId/repository', authenticate, requireProjectPermission('manage_repository'), linkRepository);
router.delete('/projects/:projectId/repository', authenticate, requireProjectPermission('manage_repository'), unlinkRepository);
router.post('/projects/:projectId/create-repository', authenticate, requireProjectPermission('manage_repository'), createRepository);

// Repository Visualizer (Contents, Branches, Commit Graph, Contributors)
router.get('/projects/:projectId/contents', authenticate, getRepositoryContents);
router.get('/projects/:projectId/branches', authenticate, getBranches);
router.get('/projects/:projectId/commit-graph', authenticate, getCommitGraph);
router.get('/projects/:projectId/contributors', authenticate, getContributors);

// Collaborator Management
router.get('/projects/:projectId/collaborators', authenticate, listCollaborators);
router.post('/projects/:projectId/collaborators', authenticate, requireProjectPermission('manage_repository'), inviteCollaborator);

// Commits & PRs for Project
router.get('/projects/:projectId/commits', authenticate, getCommits);
router.get('/projects/:projectId/pull-requests', authenticate, getPullRequests);

// Task PR Links
router.post('/tasks/:taskId/pull-requests', authenticate, linkPullRequestToTask);
router.get('/tasks/:taskId/pull-requests', authenticate, getTaskPullRequests);
router.delete('/tasks/:taskId/pull-requests/:id', authenticate, unlinkPullRequestFromTask);

// Webhook (unauthenticated, HMAC verified)
router.post('/webhook', handleWebhook);

export default router;

