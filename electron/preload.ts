import { contextBridge, ipcRenderer } from 'electron';
import type { Todo } from '../src/types/electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadTodos: (): Promise<Todo[]> => ipcRenderer.invoke('load-todos'),
  saveTodos: (todos: Todo[]): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-todos', todos),
});
