import { ListItem } from '../models/ListItem';
import { calculateStackBarDisplay } from '../utils/taskExecutionTime';
import { TimecardData, TimecardRepository } from '../models/TimecardRepository';
import { ProjectDefinitionRepository } from '../models/ProjectDefinition';
import './TaskExecutionStackBar.css';

/**
 * View Layer: TaskExecutionStackBar Component
 * 特定日付におけるListItem（TodoまたはCalendarEvent）の実行時間を積み上げ棒グラフで表示する
 */
interface TaskExecutionStackBarProps {
  items: ListItem[];
  date: string; // YYYY-MM-DD形式
  timecardData: TimecardData;
  projectRepo: ProjectDefinitionRepository; // 追加
}

export const TaskExecutionStackBar = ({ items, date, timecardData, projectRepo }: TaskExecutionStackBarProps) => {
  // すべての計算をModel層に委譲
  const displayConfig = calculateStackBarDisplay(items, date, projectRepo);

  // タイムカードから稼働時間を計算（秒単位）
  const workingTimeSeconds = TimecardRepository.calculateWorkingTimeForDate(timecardData, date);

  // 稼働時間がnullの場合（異常パターン）は赤い棒を表示しない
  const shouldShowWorkingTimeLine = workingTimeSeconds !== null;

  // 稼働時間の位置をパーセンテージで計算
  const workingTimePositionPercent = shouldShowWorkingTimeLine && displayConfig.displayMaxSeconds > 0
    ? (workingTimeSeconds / displayConfig.displayMaxSeconds) * 100
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
            displayConfig.segments.map(({ itemId, itemText, seconds, color }) => {
              // 全体の時間に対する割合を計算
              const widthPercent = (seconds / displayConfig.displayMaxSeconds) * 100;

              // 秒を時間単位に変換（小数第1位まで）
              const hours = (seconds / 3600).toFixed(1);

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
            // 1時間 = 3600秒
            const positionPercent = (hour * 3600 / displayConfig.displayMaxSeconds) * 100;

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

          {/* 稼働時間を示す縦棒（異常パターンの場合は非表示） */}
          {shouldShowWorkingTimeLine && (
            <div
              className="stackbar-working-time-marker"
              style={{ left: `${workingTimePositionPercent}%` }}
              title={`稼働時間: ${(workingTimeSeconds! / 3600).toFixed(1)}h`}
            >
              <div className="stackbar-working-time-line"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
