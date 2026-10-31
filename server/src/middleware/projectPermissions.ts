import { Response, NextFunction } from 'express';
import { PrismaClient, ProjectRole } from '@prisma/client';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

export type ProjectCapability =
  | 'manage_project'
  | 'assign_tasks'
  | 'view_team_activity'
  | 'submit_for_review'
  | 'review_tasks'
  | 'approve_work'
  | 'manage_repository';

export const ROLE_CAPABILITIES: Record<ProjectRole, Record<ProjectCapability, boolean>> = {
  PROJECT_ADMIN: {
    manage_project: true,
    assign_tasks: true,
    view_team_activity: true,
    submit_for_review: true,
    review_tasks: true,
    approve_work: true,
    manage_repository: true,
  },
  PROJECT_LEAD: {
    manage_project: true,
    assign_tasks: true,
    view_team_activity: true,
    submit_for_review: true,
    review_tasks: true,
    approve_work: true,
    manage_repository: true,
  },
  SENIOR: {
    manage_project: false,
    assign_tasks: true,
    view_team_activity: true,
    submit_for_review: true,
    review_tasks: true,
    approve_work: true,
    manage_repository: false,
  },
  DEVELOPER: {
    manage_project: false,
    assign_tasks: true,
    view_team_activity: true,
    submit_for_review: true,
    review_tasks: false,
    approve_work: false,
    manage_repository: false,
  },
  INTERN: {
    manage_project: false,
    assign_tasks: false,
    view_team_activity: true,
    submit_for_review: true,
    review_tasks: false,
    approve_work: false,
    manage_repository: false,
  },
};

export async function getUserProjectRole(userId: string, projectId: string): Promise<ProjectRole | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (project?.ownerId === userId) return ProjectRole.PROJECT_ADMIN;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === 'ADMIN') return ProjectRole.PROJECT_ADMIN;

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  return membership?.role || null;
}

export function requireProjectPermission(capability: ProjectCapability) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      let projectId = req.params.projectId || req.params.id || req.body.projectId;

      if (!projectId && req.params.taskId) {
        const task = await prisma.task.findUnique({ where: { id: req.params.taskId }, select: { projectId: true } });
        projectId = task?.projectId;
      }

      if (!projectId) {
        next();
        return;
      }

      const role = await getUserProjectRole(userId, projectId);
      if (!role) {
        res.status(403).json({ success: false, message: 'You are not a member of this project' });
        return;
      }

      const hasPermission = ROLE_CAPABILITIES[role][capability];
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `Permission denied: Role "${role}" cannot perform "${capability}" on this project`,
        });
        return;
      }

      (req as any).projectRole = role;
      next();
    } catch (error: any) {
      next(error);
    }
  };
}
