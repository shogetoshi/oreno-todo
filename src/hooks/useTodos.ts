import { useState, useEffect, useCallback } from 'react';
import type { Todo } from '../types/electron';

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // 状態更新と永続化を統合した単一のエントリーポイント
  const setTodosWithPersist = useCallback(async (updater: (prev: Todo[]) => Todo[]) => {
    setTodos((prevTodos) => {
      const newTodos = updater(prevTodos);
      const prevTodosSnapshot = prevTodos;

      // 楽観的更新: 先にUIを更新してから非同期で保存
      window.electronAPI.saveTodos(newTodos).catch((error) => {
        console.error('Failed to save todos:', error);
        // 保存失敗時はロールバック
        setTodos(prevTodosSnapshot);
      });

      return newTodos;
    });
  }, []);

  // 新しいTODOを追加
  const addTodo = useCallback((text: string) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
    };
    setTodosWithPersist((prev) => [...prev, newTodo]);
  }, [setTodosWithPersist]);

  // TODOの完了状態を切り替え
  const toggleTodo = useCallback((id: string) => {
    setTodosWithPersist((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }, [setTodosWithPersist]);

  // TODOを削除
  const deleteTodo = useCallback((id: string) => {
    setTodosWithPersist((prev) => prev.filter((todo) => todo.id !== id));
  }, [setTodosWithPersist]);

  // TODOのテキストを編集
  const editTodo = useCallback((id: string, newText: string) => {
    setTodosWithPersist((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, text: newText } : todo
      )
    );
  }, [setTodosWithPersist]);

  return {
    todos,
    isLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
  };
};
