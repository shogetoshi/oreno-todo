import React from 'react';
import { LogEntry } from '../models/LogEntry';
import './LogDisplay.css';

interface LogDisplayProps {
  logs: LogEntry[];
  isVisible: boolean;
  onToggle: () => void;
  onClear: () => void;
}

/**
 * View Layer: LogDisplay Component
 * ログメッセージの表示・制御UIを提供
 */
export const LogDisplay: React.FC<LogDisplayProps> = ({
  logs,
  isVisible,
  onToggle,
  onClear
}) => {
  return (
    <div className="log-display-container">
      <div className="log-display-header">
        <button className="log-toggle-button" onClick={onToggle}>
          {isVisible ? '▼' : '▶'} ログ ({logs.length})
        </button>
        {isVisible && (
          <button className="log-clear-button" onClick={onClear}>
            クリア
          </button>
        )}
      </div>

      {isVisible && (
        <div className="log-display-content">
          {logs.length === 0 ? (
            <div className="log-empty">ログはありません</div>
          ) : (
            <div className="log-entries">
              {logs.map((log) => (
                <div
                  key={log.getId()}
                  className={`log-entry log-level-${log.getLevel()}`}
                >
                  <span className="log-timestamp">
                    {log.getFormattedTimestamp()}
                  </span>
                  <span className="log-level">[{log.getLevel().toUpperCase()}]</span>
                  <span className="log-source">{log.getSource()}:</span>
                  <span className="log-message">{log.getMessage()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
