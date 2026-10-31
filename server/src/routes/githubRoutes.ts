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
} from '../controllers/githubController';
import { authenticate } from '../middleware/auth';

const router = Router();

// OAuth Handshake
router.get('/auth', authenticate, initiateAuth);
router.get('/callback', handleCallback);
router.get('/connection', authenticate, getConnection);
router.delete('/disconnect', authenticate, disconnect);

// Repositories
router.get('/repositories', authenticate, listRepositories);
router.post('/projects/:projectId/repository', authenticate, linkRepository);
router.delete('/projects/:projectId/repository', authenticate, unlinkRepository);

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
