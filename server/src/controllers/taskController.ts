import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../types';
import { TaskStatus, TaskPriority } from '@prisma/client';

const taskCreateSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().uuid('Invalid project ID'),
  assigneeId: z.string().uuid().optional().nullable(),
  order: z.number().optional(),
});

const taskUpdateSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  order: z.number().optional(),
});

const taskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  order: z.number().optional(),
});

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
      include: {
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
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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
      include: {
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
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    res.json({
      success: true,
      task,
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
        creatorId: userId,
      },
      include: {
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
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Record activity
    await prisma.activity.create({
      data: {
        action: 'TASK_CREATED',
        details: `Created task "${task.title}" in ${project.name}`,
        userId,
        projectId: project.id,
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

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(validated.title ? { title: validated.title.trim() } : {}),
        ...(validated.description !== undefined ? { description: validated.description?.trim() || null } : {}),
        ...(validated.status ? { status: validated.status } : {}),
        ...(validated.priority ? { priority: validated.priority } : {}),
        ...(validated.dueDate !== undefined ? { dueDate: validated.dueDate ? new Date(validated.dueDate) : null } : {}),
        ...(validated.projectId ? { projectId: validated.projectId } : {}),
        ...(validated.assigneeId !== undefined ? { assigneeId: validated.assigneeId } : {}),
        ...(validated.order !== undefined ? { order: validated.order } : {}),
      },
      include: {
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
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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
      include: {
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
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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

    // Authorization check: Only task creator, project owner, LEAD, or ADMIN can delete
    const userRole = req.user!.role;
    if (
      existing.creatorId !== userId &&
      existing.project.ownerId !== userId &&
      userRole !== 'ADMIN' &&
      userRole !== 'LEAD'
    ) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this task',
      });
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

