import { describe, it, expect } from 'vitest';
import { LogRepository } from './LogRepository';
import { LogEntry } from './LogEntry';

describe('LogRepository', () => {
  it('should add a new log entry at the beginning', () => {
    const logs = [LogEntry.create('info', 'app', 'First log')];
    const newLogs = LogRepository.addLog(logs, 'error', 'plugin', 'Second log');

    expect(newLogs.length).toBe(2);
    expect(newLogs[0].getMessage()).toBe('Second log');
    expect(newLogs[1].getMessage()).toBe('First log');
  });

  it('should limit logs to max count', () => {
    const logs = [
      LogEntry.create('info', 'app', 'Log 1'),
      LogEntry.create('info', 'app', 'Log 2'),
      LogEntry.create('info', 'app', 'Log 3'),
    ];
    const limited = LogRepository.limitLogs(logs, 2);

    expect(limited.length).toBe(2);
    expect(limited[0].getMessage()).toBe('Log 1');
    expect(limited[1].getMessage()).toBe('Log 2');
  });

  it('should clear all logs', () => {
    const logs = [LogEntry.create('info', 'app', 'Test')];
    const cleared = LogRepository.clearLogs();

    expect(cleared.length).toBe(0);
  });
});
