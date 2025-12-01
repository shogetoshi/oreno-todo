import { Todo } from '../models/Todo';
import { calculateExecutionTimesForDate, assignColorToTodo } from '../utils/taskExecutionTime';
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
  // その日のTodoごとの実行時間を計算
  const executionTimes = calculateExecutionTimesForDate(todos, date);

  // 合計実行時間を計算（分単位）
  let totalMinutes = 0;
  for (const minutes of executionTimes.values()) {
    totalMinutes += minutes;
  }

  // 12時間 = 720分を基準値とする
  const BASE_HOURS = 12;
  const BASE_MINUTES = BASE_HOURS * 60;

  // 表示する最大時間（12時間以上の場合は実際の時間、未満の場合は12時間）
  const displayMaxMinutes = Math.max(totalMinutes, BASE_MINUTES);

  // 1時間ごとの目盛を生成
  const totalHours = Math.ceil(displayMaxMinutes / 60);
  const hourMarkers = Array.from({ length: totalHours + 1 }, (_, i) => i);

  return (
    <div className="task-execution-stackbar">
      <div className="stackbar-container">
        {/* 積み上げ棒グラフ本体 */}
        <div className="stackbar-bar">
          {executionTimes.size === 0 ? (
            // 実行時間が0の場合は空の棒グラフを表示
            <div className="stackbar-empty"></div>
          ) : (
            // 各Todoの実行時間を積み上げて表示
            Array.from(executionTimes.entries()).map(([todoId, minutes]) => {
              // 全体の時間に対する割合を計算
              const widthPercent = (minutes / displayMaxMinutes) * 100;

              // Todoの情報を取得
              const todo = todos.find((t) => t.getId() === todoId);
              const todoText = todo ? todo.getText() : '';
              const color = assignColorToTodo(todoId);

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
          {hourMarkers.map((hour) => {
            const positionPercent = (hour * 60 / displayMaxMinutes) * 100;

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
