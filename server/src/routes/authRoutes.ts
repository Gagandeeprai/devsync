import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  initiateGoogleAuth,
  handleGoogleCallback,
  googleTokenAuth,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

// Google OAuth
router.get('/google', initiateGoogleAuth);
router.get('/google/callback', handleGoogleCallback);
router.post('/google/token', googleTokenAuth);

export default router;

