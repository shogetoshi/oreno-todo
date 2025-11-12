import { useState } from 'react';

/**
 * View Layer: TodoInput Component
 * 新しいTodoを入力するフォームを提供
 * ローカルのフォーム状態のみを管理
 */
interface TodoInputProps {
  onAdd: (taskcode: string, text: string) => void;
}

export const TodoInput = ({ onAdd }: TodoInputProps) => {
  const [taskcodeValue, setTaskcodeValue] = useState('');
  const [textValue, setTextValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textValue.trim()) {
      onAdd(taskcodeValue, textValue.trim());
      setTaskcodeValue('');
      setTextValue('');
    }
  };

  const isDisabled = !textValue.trim();

  return (
    <form onSubmit={handleSubmit} className="todo-input-form">
      <input
        type="text"
        value={taskcodeValue}
        onChange={(e) => setTaskcodeValue(e.target.value)}
        placeholder="タスクコード"
        className="todo-input taskcode-input"
      />
      <input
        type="text"
        value={textValue}
        onChange={(e) => setTextValue(e.target.value)}
        placeholder="新しいタスクを入力..."
        className="todo-input text-input"
      />
      <button
        type="submit"
        className="add-button"
        disabled={isDisabled}
      >
        追加
      </button>
    </form>
  );
};
