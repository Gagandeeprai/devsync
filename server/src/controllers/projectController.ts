import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../types';
import { ProjectStatus } from '@prisma/client';

const projectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100, 'Project name cannot exceed 100 characters'),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  deadline: z.string().datetime().optional().nullable(),
});

export const listProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const formattedProjects = projects.map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === 'DONE').length;
      const pendingTasks = totalTasks - completedTasks;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        deadline: p.deadline,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        owner: p.owner,
        totalTasks,
        completedTasks,
        pendingTasks,
        progress,
      };
    });

    res.json({
      success: true,
      projects: formattedProjects,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        tasks: {
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === 'DONE').length;
    const pendingTasks = totalTasks - completedTasks;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      success: true,
      project: {
        ...project,
        totalTasks,
        completedTasks,
        pendingTasks,
        progress,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = projectSchema.parse(req.body);
    const userId = req.user!.userId;

    const project = await prisma.project.create({
      data: {
        name: validated.name.trim(),
        description: validated.description?.trim() || null,
        status: validated.status || ProjectStatus.PLANNING,
        deadline: validated.deadline ? new Date(validated.deadline) : null,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'PROJECT_CREATED',
        details: `Created project "${project.name}"`,
        userId,
        projectId: project.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: {
        ...project,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        progress: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = projectSchema.parse(req.body);
    const userId = req.user!.userId;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Authorization check: Only project owner, LEAD, or ADMIN can update
    const userRole = req.user!.role;
    if (existing.ownerId !== userId && userRole !== 'ADMIN' && userRole !== 'LEAD') {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to update this project',
      });
      return;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: validated.name.trim(),
        description: validated.description !== undefined ? validated.description?.trim() || null : existing.description,
        status: validated.status || existing.status,
        deadline: validated.deadline !== undefined ? (validated.deadline ? new Date(validated.deadline) : null) : existing.deadline,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    await prisma.activity.create({
      data: {
        action: 'PROJECT_UPDATED',
        details: `Updated project "${updated.name}"`,
        userId,
        projectId: updated.id,
      },
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Authorization check: Only project owner, LEAD, or ADMIN can delete
    const userRole = req.user!.role;
    if (existing.ownerId !== userId && userRole !== 'ADMIN' && userRole !== 'LEAD') {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this project',
      });
      return;
    }

    await prisma.project.delete({ where: { id } });

    await prisma.activity.create({
      data: {
        action: 'PROJECT_DELETED',
        details: `Deleted project "${existing.name}"`,
        userId,
      },
    });

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

