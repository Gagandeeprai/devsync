import { Router } from 'express';
import { listUsers } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listUsers);

export default router;

