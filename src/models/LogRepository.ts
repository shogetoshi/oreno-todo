import { LogEntry, LogLevel, LogEntryJSON } from './LogEntry';

export class LogRepository {
  /**
   * JSONデータ配列からLogEntry配列を復元
   */
  static fromJsonArray(jsonArray: LogEntryJSON[]): LogEntry[] {
    return jsonArray.map(json => LogEntry.fromJSON(json));
  }

  /**
   * LogEntry配列をJSON配列に変換
   */
  static toJsonArray(logs: LogEntry[]): LogEntryJSON[] {
    return logs.map(log => log.toJSON());
  }

  /**
   * 新しいログエントリを追加（最新が先頭）
   */
  static addLog(
    logs: LogEntry[],
    level: LogLevel,
    source: string,
    message: string
  ): LogEntry[] {
    const newLog = LogEntry.create(level, source, message);
    return [newLog, ...logs];
  }

  /**
   * ログをクリア
   */
  static clearLogs(): LogEntry[] {
    return [];
  }

  /**
   * 最大件数を超えるログを削除（古いものから削除）
   */
  static limitLogs(logs: LogEntry[], maxCount: number): LogEntry[] {
    if (logs.length <= maxCount) {
      return logs;
    }
    return logs.slice(0, maxCount);
  }
}
