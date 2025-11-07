import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../src/types/electron';

const electronAPI: ElectronAPI = {
  loadTodos: () => ipcRenderer.invoke('load-todos'),
  saveTodos: (todos) => ipcRenderer.invoke('save-todos', todos),
  onAddTodoRequest: (callback) => {
    ipcRenderer.on('add-todo-request', (_event, text) => callback(text));
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
