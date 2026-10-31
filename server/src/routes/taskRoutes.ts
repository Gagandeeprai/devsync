import { Router } from 'express';
import {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  submitForReview,
  requestChanges,
  approveTask,
} from '../controllers/taskController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', deleteTask);

// Review & Approval Actions
router.post('/:id/submit-for-review', submitForReview);
router.post('/:id/request-changes', requestChanges);
router.post('/:id/approve', approveTask);

export default router;

