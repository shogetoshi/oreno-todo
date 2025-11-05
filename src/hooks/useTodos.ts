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

  // TODOが変更されたら保存
  const saveTodos = useCallback(async (newTodos: Todo[]) => {
    try {
      await window.electronAPI.saveTodos(newTodos);
    } catch (error) {
      console.error('Failed to save todos:', error);
    }
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
      const newTodos = [...todos, newTodo];
      setTodos(newTodos);
      saveTodos(newTodos);
    },
    [todos, saveTodos]
  );

  // TODOの完了状態を切り替え
  const toggleTodo = useCallback(
    (id: string) => {
      const newTodos = todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      );
      setTodos(newTodos);
      saveTodos(newTodos);
    },
    [todos, saveTodos]
  );

  // TODOを削除
  const deleteTodo = useCallback(
    (id: string) => {
      const newTodos = todos.filter((todo) => todo.id !== id);
      setTodos(newTodos);
      saveTodos(newTodos);
    },
    [todos, saveTodos]
  );

  // TODOのテキストを編集
  const editTodo = useCallback(
    (id: string, newText: string) => {
      const newTodos = todos.map((todo) =>
        todo.id === id ? { ...todo, text: newText } : todo
      );
      setTodos(newTodos);
      saveTodos(newTodos);
    },
    [todos, saveTodos]
  );

  return {
    todos,
    isLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
  };
};
