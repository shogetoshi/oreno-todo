import { Todo, TimeRange } from './Todo';
import { CalendarEvent } from './CalendarEvent';
import { ListItem, ListItemType } from './ListItem';
import { validateTodos } from '../utils/validation';
import { getCurrentJSTTime } from '../utils/timeFormat';
import { CalendarEvent as GoogleCalendarEvent } from '../types/calendar';

/**
 * Model Layer: TodoRepository
 * Todoエンティティの集合を管理し、ビジネスロジックを提供する
 * Note: カレンダーイベントとTodoの両方を扱うため、一部のメソッドはListItemを返すようになっています
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
   * 指定IDのListItemの完了状態を切り替える
   * @param items 既存のListItemリスト
   * @param id ListItemのID
   * @returns 新しいListItemリスト
   */
  static toggleItem(items: ListItem[], id: string): ListItem[] {
    return items.map((item) =>
      item.getId() === id ? item.toggleCompleted() : item
    );
  }

  /**
   * 指定IDのListItemを削除する
   * @param items 既存のListItemリスト
   * @param id ListItemのID
   * @returns 新しいListItemリスト
   */
  static deleteItem(items: ListItem[], id: string): ListItem[] {
    return items.filter((item) => item.getId() !== id);
  }

  /**
   * 指定IDのListItemのテキストを編集する
   * @param items 既存のListItemリスト
   * @param id ListItemのID
   * @param newText 新しいテキスト
   * @returns 新しいListItemリスト
   */
  static editItemText(items: ListItem[], id: string, newText: string): ListItem[] {
    return items.map((item) =>
      item.getId() === id ? item.setText(newText) : item
    );
  }

  /**
   * 指定IDのListItemのタスクコードを編集する
   * @param items 既存のListItemリスト
   * @param id ListItemのID
   * @param newTaskcode 新しいタスクコード
   * @returns 新しいListItemリスト
   */
  static editItemTaskcode(items: ListItem[], id: string, newTaskcode: string): ListItem[] {
    return items.map((item) =>
      item.getId() === id ? item.setTaskcode(newTaskcode) : item
    );
  }

  /**
   * ListItemリストを並び替える
   * @param items 既存のListItemリスト
   * @param fromIndex 移動元のインデックス
   * @param toIndex 移動先のインデックス
   * @returns 新しいListItemリスト
   */
  static reorderItems(items: ListItem[], fromIndex: number, toIndex: number): ListItem[] {
    const newItems = [...items];
    const [draggedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, draggedItem);
    return newItems;
  }

  /**
   * 指定IDのListItemのタイマーを開始する
   * @param items 既存のListItemリスト
   * @param id ListItemのID
   * @returns 新しいListItemリスト
   */
  static startItemTimer(items: ListItem[], id: string): ListItem[] {
    return items.map((item) =>
      item.getId() === id ? item.startTimer() : item
    );
  }

  /**
   * 指定IDのListItemのタイマーを停止する
   * @param items 既存のListItemリスト
   * @param id ListItemのID
   * @returns 新しいListItemリスト
   */
  static stopItemTimer(items: ListItem[], id: string): ListItem[] {
    return items.map((item) =>
      item.getId() === id ? item.stopTimer() : item
    );
  }

  /**
   * JSON配列からListItemリスト（TodoまたはCalendarEvent）を生成する
   * typeフィールドでTodoとCalendarEventを判別する
   * @param jsonArray JSON配列
   * @returns ListItemリスト
   * @throws バリデーションエラー
   */
  static fromJsonArrayToItems(jsonArray: any): ListItem[] {
    if (!Array.isArray(jsonArray)) {
      throw new Error('JSONデータは配列である必要があります');
    }

    return jsonArray.map((json: any) => {
      const type = json.type || ListItemType.TODO; // デフォルトはTodo（後方互換性）

      if (type === ListItemType.CALENDAR_EVENT) {
        return CalendarEvent.fromJSON(json);
      } else {
        return Todo.fromJSON(json);
      }
    });
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
   * ListItemリストをJSON配列に変換する
   * @param items ListItemリスト（TodoまたはCalendarEvent）
   * @returns JSON配列
   */
  static itemsToJsonArray(items: ListItem[]): any[] {
    return items.map(item => item.toJSON());
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
   * カレンダーイベントからCalendarEventエンティティを生成する
   * @param event Googleカレンダーイベント
   * @returns 生成されたCalendarEvent
   */
  static createCalendarEventFromGoogleEvent(event: GoogleCalendarEvent): CalendarEvent {
    return CalendarEvent.fromGoogleCalendarEvent(event);
  }

  /**
   * カレンダーイベント配列からCalendarEventリストを生成する
   * @param events Googleカレンダーイベント配列
   * @returns 生成されたCalendarEventリスト
   */
  static createCalendarEventsFromGoogleEvents(events: GoogleCalendarEvent[]): CalendarEvent[] {
    return events.map(event => this.createCalendarEventFromGoogleEvent(event));
  }

  /**
   * カレンダーイベントを既存のリストアイテムリストに追加する
   * 同一IDのアイテムが既に存在する場合は、新しい情報で上書きする（重複防止）
   * @param items 既存のListItemリスト（TodoまたはCalendarEvent）
   * @param events Googleカレンダーイベント配列
   * @returns 新しいListItemリスト
   */
  static addCalendarEventsToItems(items: ListItem[], events: GoogleCalendarEvent[]): ListItem[] {
    const newEvents = this.createCalendarEventsFromGoogleEvents(events);

    // 新しいイベントのIDセットを作成
    const newEventIds = new Set(newEvents.map(event => event.getId()));

    // 既存のアイテムから、新しいイベントと同じIDを持つものを除外
    const existingItemsWithoutDuplicates = items.filter(item => !newEventIds.has(item.getId()));

    // 既存のアイテム（重複除外済み） + 新しいイベント
    return [...existingItemsWithoutDuplicates, ...newEvents];
  }

  /**
   * 後方互換性のため: カレンダーイベントからTodoを生成する（非推奨）
   * @deprecated CalendarEvent.fromGoogleCalendarEvent()を使用してください
   * @param event Googleカレンダーイベント
   * @returns 生成されたTodo（実際にはCalendarEventがListItemとして返される）
   */
  static createTodoFromCalendarEvent(event: GoogleCalendarEvent): Todo {
    console.warn('[Deprecated] createTodoFromCalendarEvent() is deprecated. Use CalendarEvent.fromGoogleCalendarEvent() instead.');
    // 互換性のため、一旦CalendarEventを作成してからTodoに変換
    // これは既存のテストケースを壊さないための措置
    const calEvent = CalendarEvent.fromGoogleCalendarEvent(event);

    // CalendarEventの情報を使ってTodoを作成
    const id = calEvent.getId();
    const taskcode = calEvent.getTaskcode();
    const text = calEvent.getText();
    const completedAt = calEvent.getCompletedAt();
    const createdAt = calEvent.createdAt;
    const updatedAt = calEvent.updatedAt;
    const timeRanges: TimeRange[] = [];

    return new Todo(id, taskcode, text, completedAt, createdAt, updatedAt, timeRanges);
  }

  /**
   * 後方互換性のため: カレンダーイベント配列からTodoリストを生成する（非推奨）
   * @deprecated createCalendarEventsFromGoogleEvents()を使用してください
   */
  static createTodosFromCalendarEvents(events: GoogleCalendarEvent[]): Todo[] {
    console.warn('[Deprecated] createTodosFromCalendarEvents() is deprecated. Use createCalendarEventsFromGoogleEvents() and addCalendarEventsToItems() instead.');
    return events.map(event => this.createTodoFromCalendarEvent(event));
  }

  /**
   * 後方互換性のため: カレンダーイベントを既存のTodoリストに追加する（非推奨）
   * @deprecated addCalendarEventsToItems()を使用してください
   */
  static addTodosFromCalendarEvents(todos: Todo[], events: GoogleCalendarEvent[]): Todo[] {
    console.warn('[Deprecated] addTodosFromCalendarEvents() is deprecated. Use addCalendarEventsToItems() instead.');
    const newTodos = this.createTodosFromCalendarEvents(events);

    // 新しいTodoのIDセットを作成
    const newTodoIds = new Set(newTodos.map(todo => todo.getId()));

    // 既存のTodoから、新しいTodoと同じIDを持つものを除外
    const existingTodosWithoutDuplicates = todos.filter(todo => !newTodoIds.has(todo.getId()));

    // 既存のTodo（重複除外済み） + 新しいTodo
    return [...existingTodosWithoutDuplicates, ...newTodos];
  }
}
