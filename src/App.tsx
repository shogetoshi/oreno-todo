import { useMemo } from 'react';
import { useTodos } from './hooks/useTodos';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import './App.css';

function App() {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo, editTodo } = useTodos();

  // メモ化してフィルタリングの再計算を最小化
  const { activeTodos, completedTodos } = useMemo(() => {
    return {
      activeTodos: todos.filter(todo => todo.isActive()),
      completedTodos: todos.filter(todo => todo.isCompleted()),
    };
  }, [todos]);

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>OrenoTodo</h1>
        <p className="stats">
          アクティブ: {activeTodos.length} / 完了: {completedTodos.length}
        </p>
      </header>

      <main className="app-main">
        <TodoInput onAdd={addTodo} />

        {activeTodos.length > 0 && (
          <section className="todo-section">
            <h2>アクティブなタスク</h2>
            <TodoList
              todos={activeTodos}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onEdit={editTodo}
            />
          </section>
        )}

        {completedTodos.length > 0 && (
          <section className="todo-section">
            <h2>完了したタスク</h2>
            <TodoList
              todos={completedTodos}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onEdit={editTodo}
            />
          </section>
        )}

        {todos.length === 0 && (
          <p className="empty-message">タスクを追加してください</p>
        )}
      </main>
    </div>
  );
}

export default App;
