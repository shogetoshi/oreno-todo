import { contextBridge, ipcRenderer } from 'electron';

export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
};

contextBridge.exposeInMainWorld('electronAPI', {
  loadTodos: (): Promise<Todo[]> => ipcRenderer.invoke('load-todos'),
  saveTodos: (todos: Todo[]): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-todos', todos),
});
