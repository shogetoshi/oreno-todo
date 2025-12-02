import { Todo } from '../models/Todo';
import { calculateStackBarDisplay } from '../utils/taskExecutionTime';
import './TaskExecutionStackBar.css';

/**
 * View Layer: TaskExecutionStackBar Component
 * 特定日付におけるTodoの実行時間を積み上げ棒グラフで表示する
 */
interface TaskExecutionStackBarProps {
  todos: Todo[];
  date: string; // YYYY-MM-DD形式
}

export const TaskExecutionStackBar = ({ todos, date }: TaskExecutionStackBarProps) => {
  // すべての計算をModel層に委譲
  const displayConfig = calculateStackBarDisplay(todos, date);

  return (
    <div className="task-execution-stackbar">
      <div className="stackbar-container">
        {/* 積み上げ棒グラフ本体 */}
        <div className="stackbar-bar">
          {displayConfig.segments.length === 0 ? (
            // 実行時間が0の場合は空の棒グラフを表示
            <div className="stackbar-empty"></div>
          ) : (
            // 各Todoの実行時間を積み上げて表示
            displayConfig.segments.map(({ todoId, todoText, minutes, color }) => {
              // 全体の時間に対する割合を計算
              const widthPercent = (minutes / displayConfig.displayMaxMinutes) * 100;

              // 時間を時間単位に変換（小数第1位まで）
              const hours = (minutes / 60).toFixed(1);

              return (
                <div
                  key={todoId}
                  className="stackbar-segment"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: color
                  }}
                  title={`${todoText}: ${hours}h`}
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
        </div>
      </div>
    </div>
  );
};
