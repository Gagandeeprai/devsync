import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest, JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'devsync-default-super-secret-key';
const JWT_EXPIRES_IN = '7d';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80, 'Name must not exceed 80 characters'),
  email: z.string().email('Invalid email address').max(120, 'Email must not exceed 120 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password must not exceed 72 characters'),
  role: z.enum(['ADMIN', 'LEAD', 'DEVELOPER', 'INTERN', 'HR']).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(120),
  password: z.string().min(1, 'Password is required').max(72),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        name: validated.name.trim(),
        email: validated.email.toLowerCase().trim(),
        passwordHash,
        role: validated.role || 'DEVELOPER',
        avatarUrl: validated.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(validated.name)}`,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Record activity
    await prisma.activity.create({
      data: {
        action: 'USER_REGISTERED',
        details: `${user.name} joined DevSync`,
        userId: user.id,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase().trim() },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    if (!user.passwordHash) {
      res.status(400).json({
        success: false,
        message: 'This account was created via Google Sign-In. Please sign in using Google.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const validated = updateProfileSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(validated.name ? { name: validated.name.trim() } : {}),
        ...(validated.avatarUrl !== undefined ? { avatarUrl: validated.avatarUrl } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const googleOAuthStates = new Set<string>();

export const initiateGoogleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      // If credentials not configured yet, redirect with friendly error
      res.redirect(
        `${CLIENT_URL}/login?auth_error=${encodeURIComponent(
          'Google Sign-In is not configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env'
        )}`
      );
      return;
    }

    const state = crypto.randomBytes(24).toString('hex');
    googleOAuthStates.add(state);

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      GOOGLE_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(
      GOOGLE_CALLBACK_URL
    )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent&state=${encodeURIComponent(
      state
    )}`;

    res.redirect(googleAuthUrl);
  } catch (error: any) {
    res.redirect(`${CLIENT_URL}/login?auth_error=${encodeURIComponent(error.message)}`);
  }
};

export const handleGoogleCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      res.redirect(`${CLIENT_URL}/login?auth_error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.redirect(`${CLIENT_URL}/login?auth_error=missing_google_code`);
      return;
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData: any = await tokenResponse.json();
    if (!tokenData.access_token) {
      res.redirect(
        `${CLIENT_URL}/login?auth_error=${encodeURIComponent(
          tokenData.error_description || 'failed_to_exchange_google_token'
        )}`
      );
      return;
    }

    // Fetch user info from Google
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userinfoResponse.ok) {
      res.redirect(`${CLIENT_URL}/login?auth_error=failed_to_fetch_google_user`);
      return;
    }

    const googleUser: any = await userinfoResponse.json();
    const email = googleUser.email.toLowerCase().trim();

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.id }, { email }],
      },
    });

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.id,
            avatarUrl: user.avatarUrl || googleUser.picture || null,
          },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          name: googleUser.name || 'Google User',
          email,
          googleId: googleUser.id,
          avatarUrl: googleUser.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(googleUser.name || 'Google')}`,
          role: 'DEVELOPER',
        },
      });

      await prisma.activity.create({
        data: {
          action: 'USER_REGISTERED_GOOGLE',
          details: `${user.name} joined via Google Sign-In`,
          userId: user.id,
        },
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };

    res.redirect(`${CLIENT_URL}/login?google_token=${token}&google_user=${encodeURIComponent(JSON.stringify(safeUser))}`);
  } catch (error: any) {
    res.redirect(`${CLIENT_URL}/login?auth_error=${encodeURIComponent(error.message)}`);
  }
};

export const googleTokenAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, googleId, avatarUrl } = req.body;
    if (!email || !googleId) {
      res.status(400).json({ success: false, message: 'Email and Google ID are required' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email: cleanEmail }],
      },
    });

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatarUrl: user.avatarUrl || avatarUrl || null },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          name: name || 'Google Developer',
          email: cleanEmail,
          googleId,
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'Google')}`,
          role: 'DEVELOPER',
        },
      });

      await prisma.activity.create({
        data: {
          action: 'USER_REGISTERED_GOOGLE',
          details: `${user.name} joined via Google Sign-In`,
          userId: user.id,
        },
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getGoogleClientId = async (req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    clientId: process.env.GOOGLE_CLIENT_ID || null,
  });
};


