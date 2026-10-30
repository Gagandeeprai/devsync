import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../types';
import { TaskStatus } from '@prisma/client';

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalProjects,
      totalTasks,
      completedTasks,
      tasksByStatus,
      tasksByPriority,
      recentActivities,
      recentProjects,
      upcomingTasks,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.task.count(),
      prisma.task.count({ where: { status: TaskStatus.DONE } }),
      prisma.task.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ['priority'],
        _count: { _all: true },
      }),
      prisma.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      }),
      prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
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
      }),
      prisma.task.findMany({
        where: {
          status: { not: TaskStatus.DONE },
          dueDate: { not: null },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
        include: {
          project: {
            select: { id: true, name: true },
          },
          assignee: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      }),
    ]);

    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Format status distribution
    const statusMap: Record<string, number> = {
      BACKLOG: 0,
      TODO: 0,
      IN_PROGRESS: 0,
      REVIEW: 0,
      DONE: 0,
    };
    tasksByStatus.forEach((item) => {
      statusMap[item.status] = item._count._all;
    });

    // Format priority distribution
    const priorityMap: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };
    tasksByPriority.forEach((item) => {
      priorityMap[item.priority] = item._count._all;
    });

    // Format recent projects with completion progress
    const formattedRecentProjects = recentProjects.map((p) => {
      const pTotal = p.tasks.length;
      const pCompleted = p.tasks.filter((t) => t.status === TaskStatus.DONE).length;
      const progress = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : 0;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        deadline: p.deadline,
        totalTasks: pTotal,
        completedTasks: pCompleted,
        progress,
        owner: p.owner,
      };
    });

    res.json({
      success: true,
      stats: {
        totalProjects,
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate,
        statusDistribution: statusMap,
        priorityDistribution: priorityMap,
        recentActivities,
        recentProjects: formattedRecentProjects,
        upcomingTasks,
      },
    });
  } catch (error) {
    next(error);
  }
};
