import { Todo } from '../models/Todo';

export type { Todo };

export interface ElectronAPI {
  loadTodos: () => Promise<any[]>;
  saveTodos: (todos: any[]) => Promise<{ success: boolean; error?: string }>;
  onAddTodoRequest: (callback: (taskcode: string, text: string) => void) => void;
  loadTimecard: () => Promise<any>;
  saveTimecard: (data: any) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
