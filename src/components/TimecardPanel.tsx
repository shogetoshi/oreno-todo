import { useState } from 'react';
import { TimecardData } from '../models/TimecardRepository';
import './TimecardPanel.css';

interface TimecardPanelProps {
  timecardData: TimecardData;
  sortedDates: string[];
  onCheckIn: () => void;
  onCheckOut: () => void;
  onDeleteEntry: (date: string, index: number) => void;
  onOpenJsonEditor: () => void;
}

/**
 * View Layer: TimecardPanel Component
 * タイムカードパネルを表示し、チェックイン/チェックアウトボタンを提供
 */
export const TimecardPanel: React.FC<TimecardPanelProps> = ({
  timecardData,
  sortedDates,
  onCheckIn,
  onCheckOut,
  onDeleteEntry,
  onOpenJsonEditor,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="timecard-panel">
      <div className="timecard-header">
        <h2>タイムカード</h2>
        <div className="timecard-actions">
          <button className="check-in-button" onClick={onCheckIn}>
            チェックイン
          </button>
          <button className="check-out-button" onClick={onCheckOut}>
            チェックアウト
          </button>
          <button className="json-edit-button" onClick={onOpenJsonEditor}>
            JSON編集
          </button>
          <button
            className="toggle-button"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '閉じる' : '履歴を表示'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="timecard-history">
          {sortedDates.length === 0 ? (
            <p className="no-history">履歴がありません</p>
          ) : (
            sortedDates.map((date) => (
              <div key={date} className="timecard-date-group">
                <h3 className="date-header">{date}</h3>
                <ul className="timecard-entries">
                  {timecardData[date].map((entry, index) => (
                    <li key={index} className="timecard-entry">
                      <span className={`entry-type ${entry.type}`}>
                        {entry.type === 'start' ? 'チェックイン' : 'チェックアウト'}
                      </span>
                      <span className="entry-time">{entry.time}</span>
                      <button
                        className="delete-entry-button"
                        onClick={() => onDeleteEntry(date, index)}
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
