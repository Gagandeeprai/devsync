import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../types';
import { ProjectStatus, ProjectRole, TaskStatus } from '@prisma/client';
import { getUserProjectRole } from '../middleware/projectPermissions';
import logger from '../utils/logger';

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
        members: {
          create: {
            userId,
            role: ProjectRole.PROJECT_ADMIN,
          },
        },
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

    logger.project(`Project created: "${project.name}" (id: ${project.id})`);

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

    logger.project(`Project updated: "${updated.name}" (id: ${updated.id})`);

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

    logger.project(`Project deleted: "${existing.name}" (id: ${id})`);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects/:id/members
 * Get all project members with their workload statistics and project roles
 */
export const getProjectMembers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Compute task counts for each member in this project
    const memberStats = await Promise.all(
      members.map(async (m) => {
        const assignedTasks = await prisma.task.count({
          where: { projectId: id, assigneeId: m.userId },
        });
        const inProgressTasks = await prisma.task.count({
          where: { projectId: id, assigneeId: m.userId, status: TaskStatus.IN_PROGRESS },
        });
        const completedTasks = await prisma.task.count({
          where: { projectId: id, assigneeId: m.userId, status: TaskStatus.DONE },
        });
        const pendingReviewTasks = await prisma.task.count({
          where: { projectId: id, reviewerId: m.userId, status: TaskStatus.REVIEW },
        });

        return {
          id: m.id,
          userId: m.userId,
          role: m.role,
          isOwner: m.userId === project.ownerId,
          user: m.user,
          stats: {
            assignedTasks,
            inProgressTasks,
            completedTasks,
            pendingReviewTasks,
          },
          joinedAt: m.createdAt,
        };
      })
    );

    const currentUserRole = await getUserProjectRole(req.user!.userId, id);

    res.json({
      success: true,
      members: memberStats,
      currentUserRole,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/projects/:id/members
 * Add a member to the project with an assigned ProjectRole
 */
export const addProjectMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required' });
      return;
    }

    const projectRole = (role as ProjectRole) || ProjectRole.DEVELOPER;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: id, userId } },
      update: { role: projectRole },
      create: { projectId: id, userId, role: projectRole },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    await prisma.activity.create({
      data: {
        action: 'PROJECT_MEMBER_ADDED',
        details: `Added ${user.name} as ${projectRole} on project`,
        userId: req.user!.userId,
        projectId: id,
      },
    });

    logger.project(`Team member added: ${user.email} as ${projectRole} to project id: ${id}`);

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      member,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/projects/:id/members/:userId
 * Update a project member's role
 */
export const updateProjectMemberRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(ProjectRole).includes(role as ProjectRole)) {
      res.status(400).json({ success: false, message: 'Valid ProjectRole is required' });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (project?.ownerId === userId && role !== ProjectRole.PROJECT_ADMIN) {
      res.status(400).json({ success: false, message: 'Project owner must remain PROJECT_ADMIN' });
      return;
    }

    const updated = await prisma.projectMember.update({
      where: { projectId_userId: { projectId: id, userId } },
      data: { role: role as ProjectRole },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    await prisma.activity.create({
      data: {
        action: 'PROJECT_ROLE_UPDATED',
        details: `Updated ${updated.user.name}'s role to ${role}`,
        userId: req.user!.userId,
        projectId: id,
      },
    });

    logger.project(`Project role changed: ${updated.user.email} -> ${role} in project id: ${id}`);

    res.json({
      success: true,
      message: 'Member role updated successfully',
      member: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/projects/:id/members/:userId
 * Remove a member from the project
 */
export const removeProjectMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, userId } = req.params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (project?.ownerId === userId) {
      res.status(400).json({ success: false, message: 'Cannot remove project owner' });
      return;
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: id, userId } },
    });

    logger.project(`Team member removed: user id ${userId} from project id: ${id}`);

    res.json({
      success: true,
      message: 'Member removed from project',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects/:id/team-activity
 * Returns unified team workload, DevSync event timeline, and GitHub activity
 */
export const getTeamActivity = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, startDate, endDate } = req.query;

    const where: any = { projectId: id };
    if (userId && typeof userId === 'string') {
      where.userId = userId;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    // Format events for unified timeline with origin indicator
    const formattedTimeline = activities.map((act) => ({
      id: act.id,
      origin: 'devsync' as const,
      action: act.action,
      details: act.details,
      timestamp: act.createdAt,
      user: act.user,
      task: act.task,
    }));

    res.json({
      success: true,
      timeline: formattedTimeline,
    });
  } catch (error) {
    next(error);
  }
};


