import { create } from 'zustand';
import { Task, TaskStatus, TaskPriority } from '../types';
import { api } from '../api/client';
import { useUiStore } from './uiStore';

interface TaskFilters {
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;

  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  createTask: (data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
    projectId: string;
    assigneeId?: string;
  }) => Promise<Task | null>;
  updateTask: (id: string, data: Partial<Task>) => Promise<Task | null>;
  updateTaskStatus: (id: string, status: TaskStatus, order?: number) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assigneeId) params.append('assigneeId', filters.assigneeId);
      if (filters.search) params.append('search', filters.search);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get<{ success: boolean; tasks: Task[] }>(`/tasks${qs}`);
      set({ tasks: res.tasks, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createTask: async (taskData) => {
    try {
      const res = await api.post<{ success: boolean; task: Task; message: string }>('/tasks', taskData);
      set((state) => ({
        tasks: [res.task, ...state.tasks],
      }));
      useUiStore.getState().addToast({
        type: 'success',
        title: 'Task Created',
        message: `"${res.task.title}" added to ${res.task.status.replace('_', ' ')}`,
      });
      return res.task;
    } catch (err: any) {
      useUiStore.getState().addToast({
        type: 'error',
        title: 'Task Creation Failed',
        message: err.message || 'Could not create task',
      });
      return null;
    }
  },

  updateTask: async (id, taskData) => {
    try {
      const res = await api.put<{ success: boolean; task: Task; message: string }>(`/tasks/${id}`, taskData);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...res.task } : t)),
      }));
      useUiStore.getState().addToast({
        type: 'success',
        message: 'Task updated successfully',
      });
      return res.task;
    } catch (err: any) {
      useUiStore.getState().addToast({
        type: 'error',
        message: err.message || 'Failed to update task',
      });
      return null;
    }
  },

  updateTaskStatus: async (id, status, order) => {
    const previousTasks = [...get().tasks];
    
    // Optimistic UI update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              ...(order !== undefined ? { order } : {}),
            }
          : t
      ),
    }));

    try {
      const res = await api.patch<{ success: boolean; task: Task }>(`/tasks/${id}/status`, {
        status,
        order,
      });

      // Update with server confirmed data
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? res.task : t)),
      }));

      return true;
    } catch (err: any) {
      // Revert optimistic update on failure
      set({ tasks: previousTasks });
      useUiStore.getState().addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not move task',
      });
      return false;
    }
  },

  deleteTask: async (id: string) => {
    try {
      await api.delete(`/tasks/${id}`);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
      useUiStore.getState().addToast({
        type: 'info',
        message: 'Task deleted',
      });
      return true;
    } catch (err: any) {
      useUiStore.getState().addToast({
        type: 'error',
        message: err.message || 'Failed to delete task',
      });
      return false;
    }
  },
}));
