import './TimecardPanel.css';

interface TimecardPanelProps {
  onCheckIn: () => void;
  onCheckOut: () => void;
  onOpenJsonEditor: () => void;
}

/**
 * View Layer: TimecardPanel Component
 * タイムカードパネルを表示し、チェックイン/チェックアウトボタンを提供
 */
export const TimecardPanel: React.FC<TimecardPanelProps> = ({
  onCheckIn,
  onCheckOut,
  onOpenJsonEditor,
}) => {
  return (
    <div className="timecard-panel">
      <div className="timecard-header">
        <h2>タイムカード</h2>
        <div className="timecard-actions">
          <button className="check-in-button" onClick={onCheckIn}>
            🟢
          </button>
          <button className="check-out-button" onClick={onCheckOut}>
            ⚪
          </button>
          <button className="json-edit-button" onClick={onOpenJsonEditor}>
            ⚙️
          </button>
        </div>
      </div>
    </div>
  );
};
