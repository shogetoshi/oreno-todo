import { useState } from 'react';
import type { ListItem } from '../models/ListItem';
import { TodoRepository } from '../models/TodoRepository';
import { generateDateGroups, type DateGroup } from '../utils/dateGrouping';
import { TodoItem } from './TodoItem';

/**
 * View Layer: DateGroupedTodoList Component
 * 日付ごとにグループ化されたListItemリストを表示する
 * 今日から35日前までの日付枠を表示し、各日付に該当するアイテムをフィルタリングして表示
 */
interface DateGroupedTodoListProps {
  todos: ListItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onEditTaskcode: (id: string, newTaskcode: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onStartTimer: (id: string) => void;
  onStopTimer: (id: string) => void;
  onOpenJsonEditor: (id: string) => void;
}

export const DateGroupedTodoList = ({
  todos,
  onToggle,
  onDelete,
  onEdit,
  onEditTaskcode,
  onReorder,
  onStartTimer,
  onStopTimer,
  onOpenJsonEditor
}: DateGroupedTodoListProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 今日から35日前までの日付グループを生成
  const dateGroups: DateGroup[] = generateDateGroups(35);

  const handleDragStart = (globalIndex: number) => {
    setDraggedIndex(globalIndex);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (globalDropIndex: number) => {
    if (draggedIndex === null || draggedIndex === globalDropIndex) return;

    onReorder(draggedIndex, globalDropIndex);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="date-grouped-todo-list">
      {dateGroups.map((group) => {
        // その日付に表示すべきアイテムをフィルタリング
        const itemsForDate = TodoRepository.filterItemsByDate(todos, group.date);

        return (
          <div key={group.date} className="date-group">
            <h2 className="date-group-header">{group.displayDate}</h2>
            <ul className="todo-list">
              {itemsForDate.map((item) => {
                // グループ内のローカルインデックスではなく、全体のアイテムリスト内でのグローバルインデックスを取得
                const globalIndex = todos.findIndex(t => t.getId() === item.getId());

                return (
                  <TodoItem
                    key={item.getId()}
                    todo={item}
                    index={globalIndex}
                    isDragging={draggedIndex === globalIndex}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onEditTaskcode={onEditTaskcode}
                    onStartTimer={onStartTimer}
                    onStopTimer={onStopTimer}
                    onOpenJsonEditor={onOpenJsonEditor}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                  />
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
};
