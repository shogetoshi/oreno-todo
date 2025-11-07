import { useTodos } from './hooks/useTodos';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import './App.css';

function App() {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo, editTodo, reorderTodos } = useTodos();

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
      </header>

      <main className="app-main">
        <TodoInput onAdd={addTodo} />

        <TodoList
          todos={todos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onEdit={editTodo}
          onReorder={reorderTodos}
        />
      </main>
    </div>
  );
}

export default App;
