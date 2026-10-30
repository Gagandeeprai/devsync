import { PrismaClient, ProjectStatus, TaskStatus, TaskPriority, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const alex = await prisma.user.create({
    data: {
      email: 'alex@devsync.io',
      name: 'Alex Rivers',
      passwordHash,
      role: UserRole.LEAD,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: 'sarah@devsync.io',
      name: 'Sarah Chen',
      passwordHash,
      role: UserRole.DEVELOPER,
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    },
  });

  const marcus = await prisma.user.create({
    data: {
      email: 'marcus@devsync.io',
      name: 'Marcus Vance',
      passwordHash,
      role: UserRole.DEVELOPER,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  });

  console.log('✅ Created users');

  // 2. Create Projects
  const project1 = await prisma.project.create({
    data: {
      name: 'DevSync Core Platform',
      description: 'Centralized developer collaboration workspace with real-time kanban and progress analytics.',
      status: ProjectStatus.IN_PROGRESS,
      deadline: new Date('2026-11-20T18:00:00Z'),
      ownerId: alex.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'API Gateway & Microservices',
      description: 'Distributed rate limiting, authentication proxies, and gRPC internal services mesh.',
      status: ProjectStatus.PLANNING,
      deadline: new Date('2026-12-05T18:00:00Z'),
      ownerId: alex.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Telemetry & Metric Exporters',
      description: 'Prometheus metrics aggregation, OpenTelemetry distributed tracing and alerting.',
      status: ProjectStatus.COMPLETED,
      deadline: new Date('2026-10-15T18:00:00Z'),
      ownerId: marcus.id,
    },
  });

  console.log('✅ Created projects');

  // 3. Create Tasks for Project 1
  const tasksData = [
    {
      title: 'Design high-performance database schema with Prisma indexes',
      description: 'Architect PostgreSQL relational models for users, projects, kanban tasks, and audit logs.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: new Date('2026-10-25T18:00:00Z'),
      order: 1000,
      projectId: project1.id,
      assigneeId: alex.id,
      creatorId: alex.id,
    },
    {
      title: 'Implement JWT authentication & bcrypt password hashing',
      description: 'Secure registration, login, token refresh, and protected middleware routes.',
      status: TaskStatus.DONE,
      priority: TaskPriority.URGENT,
      dueDate: new Date('2026-10-27T18:00:00Z'),
      order: 2000,
      projectId: project1.id,
      assigneeId: sarah.id,
      creatorId: alex.id,
    },
    {
      title: 'Build interactive Kanban Board with Drag & Drop column transitions',
      description: 'Support seamless task movement between Backlog, Todo, In Progress, Review, and Done.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT,
      dueDate: new Date('2026-11-05T18:00:00Z'),
      order: 1000,
      projectId: project1.id,
      assigneeId: sarah.id,
      creatorId: alex.id,
    },
    {
      title: 'Add REST API endpoints for project metrics & dashboard KPIs',
      description: 'Aggregate completed vs pending tasks, project milestones, and team velocity metrics.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: new Date('2026-11-08T18:00:00Z'),
      order: 2000,
      projectId: project1.id,
      assigneeId: marcus.id,
      creatorId: alex.id,
    },
    {
      title: 'Refactor REST response error interceptors and toast feedback',
      description: 'Provide clear visual user notifications for API errors, validation mismatches, and successes.',
      status: TaskStatus.REVIEW,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date('2026-11-02T18:00:00Z'),
      order: 1000,
      projectId: project1.id,
      assigneeId: sarah.id,
      creatorId: marcus.id,
    },
    {
      title: 'Implement comprehensive task filtering by priority and assignee',
      description: 'Allow multi-parameter query filtering and instant keyword search on the task board.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date('2026-11-10T18:00:00Z'),
      order: 1000,
      projectId: project1.id,
      assigneeId: alex.id,
      creatorId: alex.id,
    },
    {
      title: 'Setup automated CI/CD pipeline and TypeScript compilation checks',
      description: 'Ensure automated linting, test suites, and Docker container build verification on pull requests.',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.LOW,
      dueDate: new Date('2026-11-25T18:00:00Z'),
      order: 1000,
      projectId: project1.id,
      assigneeId: marcus.id,
      creatorId: alex.id,
    },
    {
      title: 'Implement WebSocket channels for live multi-user collaboration',
      description: 'Broadcast task updates across active sessions with optimistic UI updates.',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.HIGH,
      dueDate: new Date('2026-12-01T18:00:00Z'),
      order: 2000,
      projectId: project1.id,
      assigneeId: null,
      creatorId: alex.id,
    },
  ];

  for (const task of tasksData) {
    const createdTask = await prisma.task.create({ data: task });

    // Seed activity
    await prisma.activity.create({
      data: {
        action: task.status === TaskStatus.DONE ? 'TASK_COMPLETED' : 'TASK_CREATED',
        details: task.status === TaskStatus.DONE
          ? `Completed task: "${task.title}"`
          : `Created task: "${task.title}" in ${project1.name}`,
        userId: task.creatorId,
        projectId: project1.id,
        taskId: createdTask.id,
      },
    });
  }

  // Create tasks for Project 2
  const p2Tasks = [
    {
      title: 'Evaluate Envoy vs Traefik for reverse proxy routing',
      description: 'Benchmark latency, SSL termination overhead, and plugin ecosystem.',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: new Date('2026-11-18T18:00:00Z'),
      order: 1000,
      projectId: project2.id,
      assigneeId: marcus.id,
      creatorId: alex.id,
    },
    {
      title: 'Draft OpenAPI 3.1 specification for edge endpoints',
      description: 'Document request and response schemas, auth scopes, and pagination headers.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date('2026-11-22T18:00:00Z'),
      order: 1000,
      projectId: project2.id,
      assigneeId: sarah.id,
      creatorId: alex.id,
    },
  ];

  for (const task of p2Tasks) {
    await prisma.task.create({ data: task });
    await prisma.activity.create({
      data: {
        action: 'TASK_CREATED',
        details: `Created task: "${task.title}" in ${project2.name}`,
        userId: task.creatorId,
        projectId: project2.id,
      },
    });
  }

  console.log('✅ Created tasks and activities');
  console.log('🎉 Seed complete! Demo credentials: alex@devsync.io / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
