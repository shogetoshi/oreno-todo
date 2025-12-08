import { ListItem } from '../models/ListItem';
import { calculateStackBarDisplay } from '../utils/taskExecutionTime';
import { TimecardData, TimecardRepository } from '../models/TimecardRepository';
import './TaskExecutionStackBar.css';

/**
 * View Layer: TaskExecutionStackBar Component
 * 特定日付におけるListItem（TodoまたはCalendarEvent）の実行時間を積み上げ棒グラフで表示する
 */
interface TaskExecutionStackBarProps {
  items: ListItem[];
  date: string; // YYYY-MM-DD形式
  timecardData: TimecardData;
}

export const TaskExecutionStackBar = ({ items, date, timecardData }: TaskExecutionStackBarProps) => {
  // すべての計算をModel層に委譲
  const displayConfig = calculateStackBarDisplay(items, date);

  // タイムカードから稼働時間を計算
  const workingTimeMinutes = TimecardRepository.calculateWorkingTimeForDate(timecardData, date);

  // 稼働時間の位置をパーセンテージで計算
  const workingTimePositionPercent = displayConfig.displayMaxMinutes > 0
    ? (workingTimeMinutes / displayConfig.displayMaxMinutes) * 100
    : 0;

  return (
    <div className="task-execution-stackbar">
      <div className="stackbar-container">
        {/* 積み上げ棒グラフ本体 */}
        <div className="stackbar-bar">
          {displayConfig.segments.length === 0 ? (
            // 実行時間が0の場合は空の棒グラフを表示
            <div className="stackbar-empty"></div>
          ) : (
            // 各ListItemの実行時間を積み上げて表示
            displayConfig.segments.map(({ itemId, itemText, minutes, color }) => {
              // 全体の時間に対する割合を計算
              const widthPercent = (minutes / displayConfig.displayMaxMinutes) * 100;

              // 時間を時間単位に変換（小数第1位まで）
              const hours = (minutes / 60).toFixed(1);

              return (
                <div
                  key={itemId}
                  className="stackbar-segment"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: color
                  }}
                  title={`${itemText}: ${hours}h`}
                />
              );
            })
          )}
        </div>

        {/* 時間目盛 */}
        <div className="stackbar-scale">
          {displayConfig.hourMarkers.map((hour) => {
            const positionPercent = (hour * 60 / displayConfig.displayMaxMinutes) * 100;

            return (
              <div
                key={hour}
                className="stackbar-scale-marker"
                style={{ left: `${positionPercent}%` }}
              >
                <div className="stackbar-scale-line"></div>
                <div className="stackbar-scale-label">{hour}h</div>
              </div>
            );
          })}

          {/* 稼働時間を示す縦棒 */}
          <div
            className="stackbar-working-time-marker"
            style={{ left: `${workingTimePositionPercent}%` }}
            title={`稼働時間: ${(workingTimeMinutes / 60).toFixed(1)}h`}
          >
            <div className="stackbar-working-time-line"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
