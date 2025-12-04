import { Todo } from '../models/Todo';
import { TimecardDataJSON } from '../models/TimecardRepository';

export type { Todo };

export interface ElectronAPI {
  loadTodos: () => Promise<any[]>;
  saveTodos: (todos: any[]) => Promise<{ success: boolean; error?: string }>;
  onAddTodoRequest: (callback: (taskcode: string, text: string) => void) => void;
  onStopRunningTodoRequest: (callback: () => void) => void;
  loadTimecard: () => Promise<TimecardDataJSON>;
  saveTimecard: (data: TimecardDataJSON) => Promise<{ success: boolean; error?: string }>;
  onCheckInRequest: (callback: () => void) => void;
  onCheckOutRequest: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
