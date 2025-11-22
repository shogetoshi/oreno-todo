/**
 * Model Layer: ListItem Interface
 * Todoとカレンダーイベントの共通インターフェース
 * UI上のリストに表示可能なアイテムの基本的な操作を定義する
 */

/**
 * リストアイテムのタイプ
 */
export enum ListItemType {
  TODO = 'todo',
  CALENDAR_EVENT = 'calendar_event',
}

/**
 * リストアイテムの共通インターフェース
 * TodoとCalendarEventがこのインターフェースを実装することで、
 * UI上で統一的に扱うことができる
 */
export interface ListItem {
  /**
   * アイテムの一意なIDを取得する
   */
  getId(): string;

  /**
   * アイテムのタイプを取得する
   */
  getType(): ListItemType;

  /**
   * アイテムのタスクコードを取得する
   */
  getTaskcode(): string;

  /**
   * アイテムのテキスト（タスク内容）を取得する
   */
  getText(): string;

  /**
   * アイテムが完了しているかどうかを判定する
   */
  isCompleted(): boolean;

  /**
   * 完了日時を取得する
   */
  getCompletedAt(): string | null;

  /**
   * タイマーが実行中かどうかを判定する
   */
  isTimerRunning(): boolean;

  /**
   * 合計実行時間を分単位で取得する
   */
  getTotalExecutionTimeInMinutes(): number;

  /**
   * JSON形式に変換する
   */
  toJSON(): any;
}
