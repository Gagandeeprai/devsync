import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  initiateGoogleAuth,
  handleGoogleCallback,
  googleTokenAuth,
  getGoogleClientId,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

// Google OAuth
router.get('/google', initiateGoogleAuth);
router.get('/google/callback', handleGoogleCallback);
router.get('/google/client-id', getGoogleClientId);
router.post('/google/token', googleTokenAuth);

export default router;

