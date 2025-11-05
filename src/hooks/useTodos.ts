import { useState, useEffect, useCallback } from 'react';
import type { Todo } from '../types/electron';

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 初期化時にTODOを読み込む
  useEffect(() => {
    const loadTodos = async () => {
      try {
        const loadedTodos = await window.electronAPI.loadTodos();
        setTodos(loadedTodos);
      } catch (error) {
        console.error('Failed to load todos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTodos();
  }, []);

  // 状態更新と保存を一元管理
  const updateTodos = useCallback(async (updater: (prev: Todo[]) => Todo[]) => {
    setTodos((prevTodos) => {
      const newTodos = updater(prevTodos);
      // 非同期で保存（UIブロックを避ける）
      window.electronAPI.saveTodos(newTodos).catch((error) => {
        console.error('Failed to save todos:', error);
        setSaveError('保存に失敗しました。変更が失われる可能性があります。');
        // 3秒後にエラーメッセージをクリア
        setTimeout(() => setSaveError(null), 3000);
      });
      return newTodos;
    });
  }, []);

  // 新しいTODOを追加
  const addTodo = useCallback(
    (text: string) => {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        text,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      updateTodos((prev) => [...prev, newTodo]);
    },
    [updateTodos]
  );

  // TODOの完了状態を切り替え
  const toggleTodo = useCallback(
    (id: string) => {
      updateTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      );
    },
    [updateTodos]
  );

  // TODOを削除
  const deleteTodo = useCallback(
    (id: string) => {
      updateTodos((prev) => prev.filter((todo) => todo.id !== id));
    },
    [updateTodos]
  );

  // TODOのテキストを編集
  const editTodo = useCallback(
    (id: string, newText: string) => {
      updateTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, text: newText } : todo
        )
      );
    },
    [updateTodos]
  );

  return {
    todos,
    isLoading,
    saveError,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
  };
};
