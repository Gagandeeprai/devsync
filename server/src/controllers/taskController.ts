import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../types';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { getUserProjectRole, ROLE_CAPABILITIES } from '../middleware/projectPermissions';

const taskCreateSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150, 'Title must not exceed 150 characters'),
  description: z.string().max(4000, 'Description must not exceed 4000 characters').optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().uuid('Invalid project ID'),
  assigneeId: z.string().uuid().optional().nullable(),
  reviewerId: z.string().uuid().optional().nullable(),
  reviewNotes: z.string().max(4000).optional().nullable(),
  order: z.number().optional(),
});

const taskUpdateSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150, 'Title must not exceed 150 characters').optional(),
  description: z.string().max(4000, 'Description must not exceed 4000 characters').optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  reviewerId: z.string().uuid().optional().nullable(),
  reviewNotes: z.string().max(4000).optional().nullable(),
  order: z.number().optional(),
});

const taskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  order: z.number().optional(),
});

export const TASK_INCLUDE = {
  project: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
  reviewer: {
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
  pullRequests: true,
};

export const listTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, status, priority, assigneeId, search } = req.query;

    const where: any = {};

    if (projectId && typeof projectId === 'string') {
      where.projectId = projectId;
    }

    if (status && typeof status === 'string' && Object.values(TaskStatus).includes(status as TaskStatus)) {
      where.status = status as TaskStatus;
    }

    if (priority && typeof priority === 'string' && Object.values(TaskPriority).includes(priority as TaskPriority)) {
      where.priority = priority as TaskPriority;
    }

    if (assigneeId && typeof assigneeId === 'string') {
      where.assigneeId = assigneeId;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: TASK_INCLUDE,
    });

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    // Fetch related activity history
    const activities = await prisma.activity.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({
      success: true,
      task: {
        ...task,
        activities,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = taskCreateSchema.parse(req.body);
    const userId = req.user!.userId;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: validated.projectId },
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Role verification: If reviewer is provided, verify they have review capability
    if (validated.reviewerId) {
      const reviewerRole = await getUserProjectRole(validated.reviewerId, validated.projectId);
      if (!reviewerRole || !ROLE_CAPABILITIES[reviewerRole].review_tasks) {
        res.status(400).json({
          success: false,
          message: `Selected reviewer role "${reviewerRole || 'None'}" cannot review tasks. Reviewers must be SENIOR, PROJECT_LEAD, or PROJECT_ADMIN.`,
        });
        return;
      }
    }

    // Intern check: Interns cannot assign tasks to other team members
    const userRole = await getUserProjectRole(userId, validated.projectId);
    if (userRole && !ROLE_CAPABILITIES[userRole].assign_tasks && validated.assigneeId && validated.assigneeId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Interns cannot assign tasks to other team members.',
      });
      return;
    }

    // Determine order if not passed
    let order = validated.order;
    if (order === undefined) {
      const highestOrder = await prisma.task.findFirst({
        where: {
          projectId: validated.projectId,
          status: validated.status || TaskStatus.TODO,
        },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = (highestOrder?.order ?? 0) + 1000;
    }

    const task = await prisma.task.create({
      data: {
        title: validated.title.trim(),
        description: validated.description?.trim() || null,
        status: validated.status || TaskStatus.TODO,
        priority: validated.priority || TaskPriority.MEDIUM,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        order,
        projectId: validated.projectId,
        assigneeId: validated.assigneeId || null,
        reviewerId: validated.reviewerId || null,
        reviewNotes: validated.reviewNotes?.trim() || null,
        creatorId: userId,
      },
      include: TASK_INCLUDE,
    });

    // Record activity
    await prisma.activity.create({
      data: {
        action: 'TASK_CREATED',
        details: `Created task "${task.title}"`,
        userId,
        projectId: task.projectId,
        taskId: task.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = taskUpdateSchema.parse(req.body);
    const userId = req.user!.userId;

    const existing = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const targetProjectId = validated.projectId || existing.projectId;

    // Reviewer validation
    if (validated.reviewerId) {
      const reviewerRole = await getUserProjectRole(validated.reviewerId, targetProjectId);
      if (!reviewerRole || !ROLE_CAPABILITIES[reviewerRole].review_tasks) {
        res.status(400).json({
          success: false,
          message: `Selected reviewer role "${reviewerRole || 'None'}" cannot review tasks. Reviewers must be SENIOR, PROJECT_LEAD, or PROJECT_ADMIN.`,
        });
        return;
      }
    }

    // Intern check
    const userRole = await getUserProjectRole(userId, targetProjectId);
    if (userRole && !ROLE_CAPABILITIES[userRole].assign_tasks && validated.assigneeId && validated.assigneeId !== existing.assigneeId && validated.assigneeId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Interns cannot assign tasks to other team members.',
      });
      return;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: validated.title !== undefined ? validated.title.trim() : existing.title,
        description: validated.description !== undefined ? validated.description?.trim() || null : existing.description,
        status: validated.status || existing.status,
        priority: validated.priority || existing.priority,
        dueDate: validated.dueDate !== undefined ? (validated.dueDate ? new Date(validated.dueDate) : null) : existing.dueDate,
        projectId: validated.projectId || existing.projectId,
        assigneeId: validated.assigneeId !== undefined ? validated.assigneeId : existing.assigneeId,
        reviewerId: validated.reviewerId !== undefined ? validated.reviewerId : existing.reviewerId,
        reviewNotes: validated.reviewNotes !== undefined ? validated.reviewNotes?.trim() || null : existing.reviewNotes,
        order: validated.order !== undefined ? validated.order : existing.order,
      },
      include: TASK_INCLUDE,
    });

    if (validated.status && validated.status !== existing.status) {
      await prisma.activity.create({
        data: {
          action: validated.status === TaskStatus.DONE ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED',
          details: `Changed status of "${updated.title}" from ${existing.status} to ${validated.status}`,
          userId,
          projectId: updated.projectId,
          taskId: updated.id,
        },
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, order } = taskStatusSchema.parse(req.body);
    const userId = req.user!.userId;

    const existing = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status,
        ...(order !== undefined ? { order } : {}),
      },
      include: TASK_INCLUDE,
    });

    if (existing.status !== status) {
      await prisma.activity.create({
        data: {
          action: status === TaskStatus.DONE ? 'TASK_COMPLETED' : 'TASK_MOVED',
          details: `Moved "${updated.title}" to ${status.replace('_', ' ')}`,
          userId,
          projectId: updated.projectId,
          taskId: updated.id,
        },
      });
    }

    res.json({
      success: true,
      message: 'Task status updated',
      task: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    await prisma.task.delete({ where: { id } });

    await prisma.activity.create({
      data: {
        action: 'TASK_DELETED',
        details: `Deleted task "${existing.title}"`,
        userId,
        projectId: existing.projectId,
      },
    });

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// REVIEW & APPROVAL WORKFLOW CONTROLLERS
// ==========================================

/**
 * POST /api/tasks/:id/submit-for-review
 * Submit task for senior review (moves status to REVIEW)
 */
export const submitForReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({ where: { id }, include: { project: true } });
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.REVIEW,
        reviewNotes: notes?.trim() || task.reviewNotes,
      },
      include: TASK_INCLUDE,
    });

    await prisma.activity.create({
      data: {
        action: 'TASK_SUBMITTED_FOR_REVIEW',
        details: `Submitted task "${task.title}" for review${notes ? `: ${notes}` : ''}`,
        userId,
        projectId: task.projectId,
        taskId: task.id,
      },
    });

    res.json({
      success: true,
      message: 'Task submitted for review',
      task: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tasks/:id/request-changes
 * Senior reviewer requests changes with feedback notes
 */
export const requestChanges = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user!.userId;

    if (!notes || typeof notes !== 'string' || notes.trim() === '') {
      res.status(400).json({ success: false, message: 'Review notes are required when requesting changes' });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const role = await getUserProjectRole(userId, task.projectId);
    if (!role || !ROLE_CAPABILITIES[role].review_tasks) {
      res.status(403).json({
        success: false,
        message: 'Only Seniors, Project Leads, and Admins can request changes on tasks',
      });
      return;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.CHANGES_REQUESTED,
        reviewNotes: notes.trim(),
      },
      include: TASK_INCLUDE,
    });

    await prisma.activity.create({
      data: {
        action: 'TASK_CHANGES_REQUESTED',
        details: `Requested changes on "${task.title}": ${notes.trim()}`,
        userId,
        projectId: task.projectId,
        taskId: task.id,
      },
    });

    res.json({
      success: true,
      message: 'Changes requested successfully',
      task: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tasks/:id/approve
 * Senior reviewer or Lead approves work and marks task DONE
 */
export const approveTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const role = await getUserProjectRole(userId, task.projectId);
    if (!role || !ROLE_CAPABILITIES[role].approve_work) {
      res.status(403).json({
        success: false,
        message: 'Only Seniors, Project Leads, and Admins can approve work',
      });
      return;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.DONE,
        reviewNotes: notes ? `Approved: ${notes.trim()}` : task.reviewNotes,
      },
      include: TASK_INCLUDE,
    });

    await prisma.activity.create({
      data: {
        action: 'TASK_REVIEW_APPROVED',
        details: `Approved work for task "${task.title}"`,
        userId,
        projectId: task.projectId,
        taskId: task.id,
      },
    });

    res.json({
      success: true,
      message: 'Task approved and completed',
      task: updated,
    });
  } catch (error) {
    next(error);
  }
};
