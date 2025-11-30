import { Todo } from '../models/Todo';
import { TimecardDataJSON } from '../models/TimecardRepository';

export type { Todo };

export interface ElectronAPI {
  loadTodos: () => Promise<any[]>;
  saveTodos: (todos: any[]) => Promise<{ success: boolean; error?: string }>;
  onAddTodoRequest: (callback: (taskcode: string, text: string) => void) => void;
  loadTimecard: () => Promise<TimecardDataJSON>;
  saveTimecard: (data: TimecardDataJSON) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
