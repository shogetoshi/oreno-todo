import { Todo, TimeRange } from './Todo';
import { CalendarEvent } from './CalendarEvent';
import { ListItem, ListItemType } from './ListItem';
import { validateTodos } from '../utils/validation';
import { getCurrentJSTTime, extractDateFromJST, compareDates } from '../utils/timeFormat';
import { CalendarEvent as GoogleCalendarEvent } from '../types/calendar';
import { ProjectDefinitionRepository } from './ProjectDefinition';

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
   * 現在進行中のListItem（タイマーが開始されているもの）を検索する
   * @param items ListItemリスト
   * @returns 進行中のListItem、見つからない場合はnull
   */
  static findRunningItem(items: ListItem[]): ListItem | null {
    const runningItem = items.find(item => item.isTimerRunning());
    return runningItem || null;
  }

  /**
   * 現在進行中のすべてのListItemのタイマーを停止する
   * @param items ListItemリスト
   * @returns 新しいListItemリスト
   */
  static stopAllRunningItems(items: ListItem[]): ListItem[] {
    return items.map((item) =>
      item.isTimerRunning() ? item.stopTimer() : item
    );
  }

  /**
   * 指定IDのListItemのタイマーを排他的に開始する（他の実行中タイマーを停止）
   * @param items 既存のListItemリスト
   * @param id ListItemのID
   * @returns 新しいListItemリスト
   */
  static startItemTimerExclusive(items: ListItem[], id: string): ListItem[] {
    const itemsWithStoppedTimers = this.stopAllRunningItems(items);
    return this.startItemTimer(itemsWithStoppedTimers, id);
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
   * @param projectRepo プロジェクト定義リポジトリ（省略可）
   * @returns 生成されたCalendarEvent
   */
  static createCalendarEventFromGoogleEvent(
    event: GoogleCalendarEvent,
    projectRepo?: ProjectDefinitionRepository
  ): CalendarEvent {
    let taskcode: string | undefined = undefined;

    // projectRepoが提供されている場合、キーワードマッチングでtaskcodeを検索
    if (projectRepo) {
      const startTime = event.start.dateTime || event.start.date;
      if (startTime) {
        const date = extractDateFromJST(startTime);
        const eventText = event.summary;
        const foundTaskcode = ProjectDefinitionRepository.findTaskcodeByKeyword(
          projectRepo,
          date,
          eventText
        );
        if (foundTaskcode) {
          taskcode = foundTaskcode;
        }
      }
    }

    return CalendarEvent.fromGoogleCalendarEvent(event, taskcode);
  }

  /**
   * カレンダーイベント配列からCalendarEventリストを生成する
   * @param events Googleカレンダーイベント配列
   * @param projectRepo プロジェクト定義リポジトリ（省略可）
   * @returns 生成されたCalendarEventリスト
   */
  static createCalendarEventsFromGoogleEvents(
    events: GoogleCalendarEvent[],
    projectRepo?: ProjectDefinitionRepository
  ): CalendarEvent[] {
    return events.map(event => this.createCalendarEventFromGoogleEvent(event, projectRepo));
  }

  /**
   * カレンダーイベントを既存のリストアイテムリストに追加する
   * 同一IDのアイテムが既に存在する場合は、新しい情報で上書きする（重複防止）
   * @param items 既存のListItemリスト（TodoまたはCalendarEvent）
   * @param events Googleカレンダーイベント配列
   * @param projectRepo プロジェクト定義リポジトリ（省略可）
   * @returns 新しいListItemリスト
   */
  static addCalendarEventsToItems(
    items: ListItem[],
    events: GoogleCalendarEvent[],
    projectRepo?: ProjectDefinitionRepository
  ): ListItem[] {
    const newEvents = this.createCalendarEventsFromGoogleEvents(events, projectRepo);

    // 新しいイベントのIDセットを作成
    const newEventIds = new Set(newEvents.map(event => event.getId()));

    // 既存のアイテムから、新しいイベントと同じIDを持つものを除外
    const existingItemsWithoutDuplicates = items.filter(item => !newEventIds.has(item.getId()));

    // 既存のアイテム（重複除外済み） + 新しいイベント
    return [...existingItemsWithoutDuplicates, ...newEvents];
  }

  /**
   * 指定された日付に表示すべきListItemかどうかを判定する
   *
   * フィルタリング条件:
   * - 通常のTodo
   *   - 未完了: 該当日がcreatedAt以降なら表示
   *   - 完了: 該当日がcreatedAt以降かつcompletedAt以前なら表示
   * - カレンダーイベント
   *   - 該当日がstartTime日付と同一の場合のみ表示
   *
   * @param item 判定対象のListItem
   * @param date 日付（YYYY-MM-DD形式）
   * @returns その日付に表示すべき場合はtrue
   */
  static shouldDisplayOnDate(item: ListItem, date: string): boolean {
    const itemType = item.getType();

    if (itemType === ListItemType.TODO) {
      // 通常のTodoの場合
      const todo = item as Todo;
      const createdDate = extractDateFromJST(todo.createdAt);

      if (!todo.isCompleted()) {
        // 未完了: 該当日がcreatedAt以降なら表示
        return compareDates(date, createdDate) >= 0;
      } else {
        // 完了: 該当日がcreatedAt以降かつcompletedAt以前なら表示
        const completedDate = todo.completedAt ? extractDateFromJST(todo.completedAt) : null;
        if (!completedDate) {
          // completedAtがnullの場合は表示しない（データ不整合）
          return false;
        }
        return compareDates(date, createdDate) >= 0 && compareDates(date, completedDate) <= 0;
      }
    } else if (itemType === ListItemType.CALENDAR_EVENT) {
      // カレンダーイベントの場合
      const calendarEvent = item as CalendarEvent;
      const startTime = calendarEvent.getStartTime();

      if (!startTime) {
        // startTimeがnullの場合は表示しない
        return false;
      }

      const startDate = extractDateFromJST(startTime);
      // 該当日がstartTime日付と同一の場合のみ表示
      return compareDates(date, startDate) === 0;
    }

    // 未知のタイプの場合は表示しない
    return false;
  }

  /**
   * 指定された日付に表示すべきListItemのみをフィルタリングする
   * @param items ListItemリスト
   * @param date 日付（YYYY-MM-DD形式）
   * @returns フィルタリングされたListItemリスト
   */
  static filterItemsByDate(items: ListItem[], date: string): ListItem[] {
    return items.filter(item => this.shouldDisplayOnDate(item, date));
  }

  /**
   * 指定IDのListItemをJSON文字列から置き換える
   * @param items 既存のListItemリスト
   * @param id ListItemのID
   * @param jsonText 新しいListItemを表すJSON文字列
   * @returns 新しいListItemリスト
   * @throws JSONパースエラーまたはIDの不一致エラー
   */
  static editSingleItemFromJson(items: ListItem[], id: string, jsonText: string): ListItem[] {
    const parsed = JSON.parse(jsonText);

    // パースされたJSONのIDが一致することを確認
    if (parsed.id !== id) {
      throw new Error(`IDが一致しません。編集対象のIDは ${id} ですが、JSONのIDは ${parsed.id} です`);
    }

    // typeフィールドでTodoとCalendarEventを判別
    const type = parsed.type || ListItemType.TODO;
    let newItem: ListItem;

    if (type === ListItemType.CALENDAR_EVENT) {
      newItem = CalendarEvent.fromJSON(parsed);
    } else {
      newItem = Todo.fromJSON(parsed);
    }

    // 指定IDのアイテムを新しいアイテムで置き換え
    return items.map((item) =>
      item.getId() === id ? newItem : item
    );
  }

  /**
   * 複数のListItemをIDベースで一括更新・追加・削除する
   * - JSON内に存在し、既存リストにも存在するID: 更新
   * - JSON内に存在し、既存リストに存在しないID: 追加
   * - JSON内に存在せず、既存リストに存在し、かつtargetIdsに含まれるID: 削除
   *
   * @param items 既存のListItemリスト
   * @param jsonText 新しいListItem配列を表すJSON文字列
   * @param targetIds 編集対象のIDリスト（省略時はJSON内のアイテムのみ更新・追加）
   * @returns 新しいListItemリスト
   * @throws JSONパースエラー
   */
  static replaceItemsById(items: ListItem[], jsonText: string, targetIds?: string[]): ListItem[] {
    // JSON解析
    const jsonArray = JSON.parse(jsonText);
    const newItems = TodoRepository.fromJsonArrayToItems(jsonArray);

    // 新しいアイテムのIDとアイテムのマップを作成
    const newItemsMap = new Map<string, ListItem>();
    newItems.forEach(item => {
      newItemsMap.set(item.getId(), item);
    });

    // 削除対象のIDセット（targetIdsが指定されている場合のみ）
    const targetIdSet = targetIds ? new Set(targetIds) : null;

    // 既存のアイテムを処理
    const updatedItems: ListItem[] = [];
    items.forEach(item => {
      const itemId = item.getId();
      if (newItemsMap.has(itemId)) {
        // JSON内に存在する場合は更新
        updatedItems.push(newItemsMap.get(itemId)!);
        newItemsMap.delete(itemId); // 処理済みとしてマップから削除
      } else if (targetIdSet && targetIdSet.has(itemId)) {
        // targetIdsに含まれるが、JSON内に存在しない場合は削除（何もしない）
      } else {
        // それ以外は保持
        updatedItems.push(item);
      }
    });

    // JSON内に残っている新規アイテムを追加
    newItemsMap.forEach(item => {
      updatedItems.push(item);
    });

    return updatedItems;
  }
}
