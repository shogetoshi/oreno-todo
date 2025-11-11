import { useState } from 'react';
import type { Todo } from '../types/electron';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onEditTaskcode: (id: string, newTaskcode: string) => void;
  onReorder: (newOrder: Todo[]) => void;
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

    const newTodos = [...todos];
    const [draggedTodo] = newTodos.splice(draggedIndex, 1);
    newTodos.splice(dropIndex, 0, draggedTodo);

    onReorder(newTodos);
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
