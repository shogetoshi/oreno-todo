export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
};

export interface ElectronAPI {
  loadTodos: () => Promise<Todo[]>;
  saveTodos: (todos: Todo[]) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
