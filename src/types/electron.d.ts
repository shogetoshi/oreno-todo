import { Todo } from '../models/Todo';
import { TimecardDataJSON } from '../models/TimecardRepository';
import { CalendarEvent } from './calendar';

export type { Todo };

export interface FetchCalendarEventsResult {
  success: boolean;
  events?: CalendarEvent[];
  error?: string;
}

export interface ElectronAPI {
  loadTodos: () => Promise<any[]>;
  saveTodos: (todos: any[]) => Promise<{ success: boolean; error?: string }>;
  onAddTodoRequest: (callback: (taskcode: string, text: string) => void) => void;
  onStopRunningTodoRequest: (callback: () => void) => void;
  loadTimecard: () => Promise<TimecardDataJSON>;
  saveTimecard: (data: TimecardDataJSON) => Promise<{ success: boolean; error?: string }>;
  onCheckInRequest: (callback: () => void) => void;
  onCheckOutRequest: (callback: () => void) => void;
  fetchCalendarEvents: (date?: string) => Promise<FetchCalendarEventsResult>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
