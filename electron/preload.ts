import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../src/types/electron';

const electronAPI: ElectronAPI = {
  loadTodos: () => ipcRenderer.invoke('load-todos'),
  saveTodos: (todos) => ipcRenderer.invoke('save-todos', todos),
  onAddTodoRequest: (callback) => {
    ipcRenderer.on('add-todo-request', (_event, taskcode, text) => callback(taskcode, text));
  },
  onStopRunningTodoRequest: (callback) => {
    ipcRenderer.on('stop-running-todo-request', () => callback());
  },
  loadTimecard: () => ipcRenderer.invoke('load-timecard'),
  saveTimecard: (data) => ipcRenderer.invoke('save-timecard', data),
  onCheckInRequest: (callback) => {
    ipcRenderer.on('check-in-request', () => callback());
  },
  onCheckOutRequest: (callback) => {
    ipcRenderer.on('check-out-request', () => callback());
  },
  fetchCalendarEvents: (date) => ipcRenderer.invoke('fetch-calendar-events', date),
  loadProjectDefinitions: () => ipcRenderer.invoke('load-project-definitions'),
  saveProjectDefinitions: (data) => ipcRenderer.invoke('save-project-definitions', data),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
