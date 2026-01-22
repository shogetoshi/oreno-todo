import { useState, useCallback, useEffect } from 'react';
import { LogEntry } from '../models/LogEntry';
import { LogRepository } from '../models/LogRepository';
import type { LogLevel } from '../models/LogEntry';

/**
 * Controller Layer: useLogs Hook
 * ログ表示機能の状態管理を担当
 * ビジネスロジックはLogRepositoryに委譲
 */
export const useLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const MAX_LOG_COUNT = 100;

  // ログを追加
  const addLog = useCallback((level: LogLevel, source: string, message: string) => {
    setLogs((prev) => {
      const newLogs = LogRepository.addLog(prev, level, source, message);
      return LogRepository.limitLogs(newLogs, MAX_LOG_COUNT);
    });
  }, []);

  // ログをクリア
  const clearLogs = useCallback(() => {
    setLogs(LogRepository.clearLogs());
  }, []);

  // 表示/非表示をトグル
  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  // Main Processからのログメッセージを受信
  useEffect(() => {
    if (window.electronAPI.onLogMessage) {
      window.electronAPI.onLogMessage((level: LogLevel, source: string, message: string) => {
        addLog(level, source, message);
      });
    }
  }, [addLog]);

  return {
    logs,
    isVisible,
    addLog,
    clearLogs,
    toggleVisibility
  };
};
