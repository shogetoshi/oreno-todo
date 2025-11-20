import { Todo, TimeRange } from './Todo';
import { validateTodos } from '../utils/validation';
import { getCurrentJSTTime } from '../utils/timeFormat';
import { CalendarEvent } from '../types/calendar';

/**
 * Model Layer: TodoRepository
 * Todoエンティティの集合を管理し、ビジネスロジックを提供する
 */
export class TodoRepository {
  /**
   * 新しいTodoを作成する
   * @param taskcode タスクコード
   * @param text タスクテキスト
   * @returns 作成されたTodo
   */
  static createTodo(taskcode: string, text: string): Todo {
    const id = crypto.randomUUID();
    const now = getCurrentJSTTime();
    const timeRanges: TimeRange[] = [];
    return new Todo(id, taskcode, text, null, now, now, timeRanges);
  }

  /**
   * TodoリストにTodoを追加する
   * @param todos 既存のTodoリスト
   * @param taskcode タスクコード
   * @param text タスクテキスト
   * @returns 新しいTodoリスト
   */
  static addTodo(todos: Todo[], taskcode: string, text: string): Todo[] {
    const newTodo = this.createTodo(taskcode, text);
    return [...todos, newTodo];
  }

  /**
   * 指定IDのTodoの完了状態を切り替える
   * @param todos 既存のTodoリスト
   * @param id TodoのID
   * @returns 新しいTodoリスト
   */
  static toggleTodo(todos: Todo[], id: string): Todo[] {
    return todos.map((todo) =>
      todo.getId() === id ? todo.toggleCompleted() : todo
    );
  }

  /**
   * 指定IDのTodoを削除する
   * @param todos 既存のTodoリスト
   * @param id TodoのID
   * @returns 新しいTodoリスト
   */
  static deleteTodo(todos: Todo[], id: string): Todo[] {
    return todos.filter((todo) => todo.getId() !== id);
  }

  /**
   * 指定IDのTodoのテキストを編集する
   * @param todos 既存のTodoリスト
   * @param id TodoのID
   * @param newText 新しいテキスト
   * @returns 新しいTodoリスト
   */
  static editTodoText(todos: Todo[], id: string, newText: string): Todo[] {
    return todos.map((todo) =>
      todo.getId() === id ? todo.setText(newText) : todo
    );
  }

  /**
   * 指定IDのTodoのタスクコードを編集する
   * @param todos 既存のTodoリスト
   * @param id TodoのID
   * @param newTaskcode 新しいタスクコード
   * @returns 新しいTodoリスト
   */
  static editTodoTaskcode(todos: Todo[], id: string, newTaskcode: string): Todo[] {
    return todos.map((todo) =>
      todo.getId() === id ? todo.setTaskcode(newTaskcode) : todo
    );
  }

  /**
   * Todoリストを並び替える
   * @param todos 既存のTodoリスト
   * @param fromIndex 移動元のインデックス
   * @param toIndex 移動先のインデックス
   * @returns 新しいTodoリスト
   */
  static reorderTodos(todos: Todo[], fromIndex: number, toIndex: number): Todo[] {
    const newTodos = [...todos];
    const [draggedTodo] = newTodos.splice(fromIndex, 1);
    newTodos.splice(toIndex, 0, draggedTodo);
    return newTodos;
  }

  /**
   * 指定IDのTodoのタイマーを開始する
   * @param todos 既存のTodoリスト
   * @param id TodoのID
   * @returns 新しいTodoリスト
   */
  static startTimer(todos: Todo[], id: string): Todo[] {
    return todos.map((todo) =>
      todo.getId() === id ? todo.startTimer() : todo
    );
  }

  /**
   * 指定IDのTodoのタイマーを停止する
   * @param todos 既存のTodoリスト
   * @param id TodoのID
   * @returns 新しいTodoリスト
   */
  static stopTimer(todos: Todo[], id: string): Todo[] {
    return todos.map((todo) =>
      todo.getId() === id ? todo.stopTimer() : todo
    );
  }

  /**
   * JSON配列からTodoリストを生成する
   * @param jsonArray JSON配列
   * @returns Todoリスト
   * @throws バリデーションエラー
   */
  static fromJsonArray(jsonArray: any): Todo[] {
    if (!validateTodos(jsonArray)) {
      throw new Error('JSONの形式が正しくありません。各TODOには id, taskcode, text, completedAt が必要です');
    }
    return jsonArray.map((json: any) => Todo.fromJSON(json));
  }

  /**
   * TodoリストをJSON配列に変換する
   * @param todos Todoリスト
   * @returns JSON配列
   */
  static toJsonArray(todos: Todo[]): any[] {
    return todos.map(todo => todo.toJSON());
  }

  /**
   * JSON文字列からTodoリストを復元する
   * @param jsonText JSON文字列
   * @returns Todoリスト
   * @throws JSONパースエラーまたはバリデーションエラー
   */
  static fromJsonText(jsonText: string): Todo[] {
    const parsed = JSON.parse(jsonText);
    return this.fromJsonArray(parsed);
  }

  /**
   * TodoリストをJSON文字列に変換する
   * @param todos Todoリスト
   * @param pretty 整形するかどうか
   * @returns JSON文字列
   */
  static toJsonText(todos: Todo[], pretty: boolean = true): string {
    const jsonArray = this.toJsonArray(todos);
    return pretty ? JSON.stringify(jsonArray, null, 2) : JSON.stringify(jsonArray);
  }

  /**
   * カレンダーイベントからIDを生成する
   * イベントの開始時刻とcreated時刻から安定したIDを生成する
   * これにより、同一イベントを複数回インポートしても同じIDが生成され、重複を防ぐことができる
   * @param event カレンダーイベント
   * @returns 生成されたID（決定的なハッシュベースID）
   */
  private static getIdFromCalendarEvent(event: CalendarEvent): string {
    // イベントの開始時刻を取得（dateTimeまたはdateのいずれか）
    const startTime = event.start.dateTime || event.start.date || '';
    // created時刻を取得
    const createdTime = event.created;

    // 開始時刻とcreated時刻を結合して一意の文字列を作成
    const uniqueString = `${startTime}_${createdTime}`;

    // 簡易的なハッシュ生成（決定的）
    let hash = 0;
    for (let i = 0; i < uniqueString.length; i++) {
      const char = uniqueString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32ビット整数に変換
    }

    // 追加のハッシュ値を生成（uniqueStringを逆順でハッシュ化）
    let hash2 = 0;
    for (let i = uniqueString.length - 1; i >= 0; i--) {
      const char = uniqueString.charCodeAt(i);
      hash2 = ((hash2 << 5) - hash2) + char;
      hash2 = hash2 & hash2;
    }

    // ハッシュ値を16進数に変換
    const hashHex1 = Math.abs(hash).toString(16).padStart(8, '0');
    const hashHex2 = Math.abs(hash2).toString(16).padStart(8, '0');

    // UUID風の形式でIDを生成（決定的）
    // プレフィックス 'cal-' でカレンダー由来であることを明示
    return `cal-${hashHex1}-${hashHex2.substring(0, 4)}-${hashHex2.substring(4, 8)}-${hashHex1.substring(0, 12)}`;
  }

  /**
   * カレンダーイベントからtaskcodeを生成する
   * @param _event カレンダーイベント（現在は未使用）
   * @returns taskcode（現在は空文字列）
   */
  private static getTaskcodeFromCalendarEvent(_event: CalendarEvent): string {
    return '';
  }

  /**
   * カレンダーイベントからテキストを抽出する
   * @param event カレンダーイベント
   * @returns Todoのテキスト
   */
  private static getTextFromCalendarEvent(event: CalendarEvent): string {
    return event.summary;
  }

  /**
   * カレンダーイベントから作成日時を抽出する
   * @param event カレンダーイベント
   * @returns ISO 8601形式の作成日時
   */
  private static getCreatedAtFromCalendarEvent(event: CalendarEvent): string {
    return new Date(event.created).toISOString();
  }

  /**
   * カレンダーイベントから更新日時を抽出する
   * @param event カレンダーイベント
   * @returns ISO 8601形式の更新日時
   */
  private static getUpdatedAtFromCalendarEvent(event: CalendarEvent): string {
    return new Date(event.updated).toISOString();
  }

  /**
   * カレンダーイベントからTodoを生成する（テスト可能な純粋関数）
   * @param event カレンダーイベント
   * @returns 生成されたTodo
   */
  static createTodoFromCalendarEvent(event: CalendarEvent): Todo {
    const id = this.getIdFromCalendarEvent(event);
    const taskcode = this.getTaskcodeFromCalendarEvent(event);
    const text = this.getTextFromCalendarEvent(event);
    const completedAt = null;
    const createdAt = this.getCreatedAtFromCalendarEvent(event);
    const updatedAt = this.getUpdatedAtFromCalendarEvent(event);
    const timeRanges: TimeRange[] = [];

    return new Todo(id, taskcode, text, completedAt, createdAt, updatedAt, timeRanges);
  }

  /**
   * カレンダーイベント配列からTodoリストを生成する
   * @param events カレンダーイベント配列
   * @returns 生成されたTodoリスト
   */
  static createTodosFromCalendarEvents(events: CalendarEvent[]): Todo[] {
    return events.map(event => this.createTodoFromCalendarEvent(event));
  }

  /**
   * カレンダーイベントを既存のTodoリストに追加する
   * 同一IDのTodoが既に存在する場合は、新しい情報で上書きする（重複防止）
   * @param todos 既存のTodoリスト
   * @param events カレンダーイベント配列
   * @returns 新しいTodoリスト
   */
  static addTodosFromCalendarEvents(todos: Todo[], events: CalendarEvent[]): Todo[] {
    const newTodos = this.createTodosFromCalendarEvents(events);

    // 新しいTodoのIDセットを作成
    const newTodoIds = new Set(newTodos.map(todo => todo.getId()));

    // 既存のTodoから、新しいTodoと同じIDを持つものを除外
    const existingTodosWithoutDuplicates = todos.filter(todo => !newTodoIds.has(todo.getId()));

    // 既存のTodo（重複除外済み） + 新しいTodo
    return [...existingTodosWithoutDuplicates, ...newTodos];
  }
}
