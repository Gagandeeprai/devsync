import { Router } from 'express';
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  getTeamActivity,
} from '../controllers/projectController';
import { authenticate } from '../middleware/auth';
import { requireProjectPermission } from '../middleware/projectPermissions';

const router = Router();

router.use(authenticate);

router.get('/', listProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.put('/:id', requireProjectPermission('manage_project'), updateProject);
router.delete('/:id', requireProjectPermission('manage_project'), deleteProject);

// Project Hierarchy & Team Management
router.get('/:id/members', getProjectMembers);
router.post('/:id/members', requireProjectPermission('manage_project'), addProjectMember);
router.put('/:id/members/:userId', requireProjectPermission('manage_project'), updateProjectMemberRole);
router.delete('/:id/members/:userId', requireProjectPermission('manage_project'), removeProjectMember);

// Team Activity
router.get('/:id/team-activity', requireProjectPermission('view_team_activity'), getTeamActivity);

export default router;

