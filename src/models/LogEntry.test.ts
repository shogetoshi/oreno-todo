import { describe, it, expect } from 'vitest';
import { LogEntry } from './LogEntry';

describe('LogEntry', () => {
  it('should create a new log entry', () => {
    const log = LogEntry.create('error', 'plugin-test', 'Test error message');
    expect(log.getLevel()).toBe('error');
    expect(log.getSource()).toBe('plugin-test');
    expect(log.getMessage()).toBe('Test error message');
  });

  it('should convert to JSON and back', () => {
    const log = LogEntry.create('warning', 'app', 'Test warning');
    const json = log.toJSON();
    const restored = LogEntry.fromJSON(json);

    expect(restored.getLevel()).toBe(log.getLevel());
    expect(restored.getSource()).toBe(log.getSource());
    expect(restored.getMessage()).toBe(log.getMessage());
  });
});
