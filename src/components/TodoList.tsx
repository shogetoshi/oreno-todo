import { useState } from 'react';
import type { ListItem } from '../models/ListItem';
import { TodoItem } from './TodoItem';

/**
 * View Layer: TodoList Component
 * アイテムリスト（TodoとCalendarEvent）の表示とドラッグ&ドロップによる並び替えを担当
 */
interface TodoListProps {
  todos: ListItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onEditTaskcode: (id: string, newTaskcode: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onStartTimer: (id: string) => void;
  onStopTimer: (id: string) => void;
}

export const TodoList = ({ todos, onToggle, onDelete, onEdit, onEditTaskcode, onReorder, onStartTimer, onStopTimer }: TodoListProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    onReorder(draggedIndex, dropIndex);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <ul className="todo-list">
      {todos.map((todo, index) => (
        <TodoItem
          key={todo.getId()}
          todo={todo}
          index={index}
          isDragging={draggedIndex === index}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          onEditTaskcode={onEditTaskcode}
          onStartTimer={onStartTimer}
          onStopTimer={onStopTimer}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        />
      ))}
    </ul>
  );
};
