export type LogLevel = 'info' | 'warning' | 'error';

export interface LogEntryJSON {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

export class LogEntry {
  constructor(
    private id: string,
    private timestamp: string,
    private level: LogLevel,
    private source: string,
    private message: string
  ) {}

  static create(level: LogLevel, source: string, message: string): LogEntry {
    return new LogEntry(
      crypto.randomUUID(),
      new Date().toISOString(),
      level,
      source,
      message
    );
  }

  static fromJSON(json: LogEntryJSON): LogEntry {
    return new LogEntry(
      json.id,
      json.timestamp,
      json.level,
      json.source,
      json.message
    );
  }

  toJSON(): LogEntryJSON {
    return {
      id: this.id,
      timestamp: this.timestamp,
      level: this.level,
      source: this.source,
      message: this.message
    };
  }

  getId(): string { return this.id; }
  getTimestamp(): string { return this.timestamp; }
  getLevel(): LogLevel { return this.level; }
  getSource(): string { return this.source; }
  getMessage(): string { return this.message; }

  getFormattedTimestamp(): string {
    const date = new Date(this.timestamp);
    return date.toLocaleString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
