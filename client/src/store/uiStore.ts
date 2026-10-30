import { create } from 'zustand';
import { TaskStatus } from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface UiState {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Modals
  isCreateProjectOpen: boolean;
  openCreateProject: () => void;
  closeCreateProject: () => void;

  isCreateTaskOpen: boolean;
  defaultTaskStatus?: TaskStatus;
  defaultProjectId?: string;
  openCreateTask: (options?: { status?: TaskStatus; projectId?: string }) => void;
  closeCreateTask: () => void;

  editingTaskId?: string | null;
  openEditTask: (taskId: string) => void;
  closeEditTask: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4500);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  isCreateProjectOpen: false,
  openCreateProject: () => set({ isCreateProjectOpen: true }),
  closeCreateProject: () => set({ isCreateProjectOpen: false }),

  isCreateTaskOpen: false,
  defaultTaskStatus: undefined,
  defaultProjectId: undefined,
  openCreateTask: (options) =>
    set({
      isCreateTaskOpen: true,
      defaultTaskStatus: options?.status,
      defaultProjectId: options?.projectId,
    }),
  closeCreateTask: () =>
    set({
      isCreateTaskOpen: false,
      defaultTaskStatus: undefined,
      defaultProjectId: undefined,
    }),

  editingTaskId: null,
  openEditTask: (taskId) => set({ editingTaskId: taskId }),
  closeEditTask: () => set({ editingTaskId: null }),
}));
