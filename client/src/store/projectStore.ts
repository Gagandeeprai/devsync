import { create } from 'zustand';
import { Project, ProjectStatus } from '../types';
import { api } from '../api/client';
import { useUiStore } from './uiStore';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  fetchProjectById: (id: string) => Promise<Project | null>;
  createProject: (data: { name: string; description?: string; status?: ProjectStatus; deadline?: string }) => Promise<Project | null>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ success: boolean; projects: Project[] }>('/projects');
      set({ projects: res.projects, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchProjectById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ success: boolean; project: Project }>(`/projects/${id}`);
      set({ currentProject: res.project, isLoading: false });
      return res.project;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  createProject: async (projectData) => {
    try {
      const res = await api.post<{ success: boolean; project: Project; message: string }>('/projects', projectData);
      set((state) => ({
        projects: [res.project, ...state.projects],
      }));
      useUiStore.getState().addToast({
        type: 'success',
        title: 'Project Created',
        message: `"${res.project.name}" has been created`,
      });
      return res.project;
    } catch (err: any) {
      useUiStore.getState().addToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.message || 'Could not create project',
      });
      return null;
    }
  },

  updateProject: async (id, projectData) => {
    try {
      const res = await api.put<{ success: boolean; project: Project; message: string }>(`/projects/${id}`, projectData);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? { ...p, ...res.project } : p)),
        currentProject: state.currentProject?.id === id ? { ...state.currentProject, ...res.project } : state.currentProject,
      }));
      useUiStore.getState().addToast({
        type: 'success',
        message: 'Project updated successfully',
      });
      return res.project;
    } catch (err: any) {
      useUiStore.getState().addToast({
        type: 'error',
        message: err.message || 'Failed to update project',
      });
      return null;
    }
  },

  deleteProject: async (id: string) => {
    try {
      await api.delete(`/projects/${id}`);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
      }));
      useUiStore.getState().addToast({
        type: 'info',
        message: 'Project deleted',
      });
      return true;
    } catch (err: any) {
      useUiStore.getState().addToast({
        type: 'error',
        message: err.message || 'Failed to delete project',
      });
      return false;
    }
  },
}));
