import { getCurrentJSTTime, parseJSTString, convertISOToJST } from '../utils/timeFormat';
import { ListItem, ListItemType } from './ListItem';
import { CalendarEvent as CalendarEventType } from '../types/calendar';

/**
 * Model Layer: CalendarEvent Entity
 * カレンダーイベントのドメインモデル
 */

/**
 * カレンダーイベントを表すクラス
 * Googleカレンダーなどの外部カレンダーシステムから取得したイベントを表現する
 * ListItemインターフェースを実装し、Todoと共通のインターフェースで扱える
 * イミュータブルな設計: すべての更新メソッドは新しいインスタンスを返す
 */
export class CalendarEvent implements ListItem {
  constructor(
    public readonly id: string,
    public readonly taskcode: string,
    public readonly text: string,
    public readonly completedAt: string | null,
    public readonly createdAt: string,
    public readonly updatedAt: string,
    public readonly startTime: string | null,  // イベント開始時刻
    public readonly endTime: string | null     // イベント終了時刻
  ) {}

  /**
   * カレンダーイベントのIDを取得する
   */
  getId(): string {
    return this.id;
  }

  /**
   * カレンダーイベントのタイプを取得する
   */
  getType(): ListItemType {
    return ListItemType.CALENDAR_EVENT;
  }

  /**
   * カレンダーイベントのタスクコードを取得する
   */
  getTaskcode(): string {
    return this.taskcode;
  }

  /**
   * カレンダーイベントのテキスト（イベントタイトル）を取得する
   */
  getText(): string {
    return this.text;
  }

  /**
   * カレンダーイベントが完了しているかどうかを判定する
   */
  isCompleted(): boolean {
    return this.completedAt !== null;
  }

  /**
   * 完了日時を取得する
   */
  getCompletedAt(): string | null {
    return this.completedAt;
  }

  /**
   * 開始時刻を取得する
   */
  getStartTime(): string | null {
    return this.startTime;
  }

  /**
   * 終了時刻を取得する
   */
  getEndTime(): string | null {
    return this.endTime;
  }


  /**
   * タスクコードを更新した新しいCalendarEventインスタンスを返す
   */
  setTaskcode(newTaskcode: string): CalendarEvent {
    const now = getCurrentJSTTime();
    return new CalendarEvent(
      this.id,
      newTaskcode,
      this.text,
      this.completedAt,
      this.createdAt,
      now,
      this.startTime,
      this.endTime
    );
  }

  /**
   * テキストを更新した新しいCalendarEventインスタンスを返す
   */
  setText(newText: string): CalendarEvent {
    const now = getCurrentJSTTime();
    return new CalendarEvent(
      this.id,
      this.taskcode,
      newText,
      this.completedAt,
      this.createdAt,
      now,
      this.startTime,
      this.endTime
    );
  }

  /**
   * 完了状態を切り替えた新しいCalendarEventインスタンスを返す
   */
  toggleCompleted(): CalendarEvent {
    return this.setCompleted(!this.isCompleted());
  }

  /**
   * 完了状態を設定した新しいCalendarEventインスタンスを返す
   */
  setCompleted(completed: boolean): CalendarEvent {
    const now = getCurrentJSTTime();
    const newCompletedAt = completed ? now : null;
    return new CalendarEvent(
      this.id,
      this.taskcode,
      this.text,
      newCompletedAt,
      this.createdAt,
      now,
      this.startTime,
      this.endTime
    );
  }

  /**
   * 時間計測を開始した新しいCalendarEventインスタンスを返す
   * CalendarEventではタイマー機能は使用しないため、自身をそのまま返す
   */
  startTimer(): CalendarEvent {
    return this;
  }

  /**
   * 時間計測を停止した新しいCalendarEventインスタンスを返す
   * CalendarEventではタイマー機能は使用しないため、自身をそのまま返す
   */
  stopTimer(): CalendarEvent {
    return this;
  }

  /**
   * タイマーが実行中かどうかを判定する
   * CalendarEventではタイマー機能は使用しないため、常にfalseを返す
   */
  isTimerRunning(): boolean {
    return false;
  }

  /**
   * 合計実行時間を分単位で取得する
   * CalendarEventではstartTimeとendTimeから処理時間を算出する
   */
  getTotalExecutionTimeInMinutes(): number {
    if (!this.startTime || !this.endTime) {
      return 0;
    }

    try {
      const startTimeMs = parseJSTString(this.startTime).getTime();
      const endTimeMs = parseJSTString(this.endTime).getTime();
      const durationMs = endTimeMs - startTimeMs;
      const durationSeconds = Math.floor(durationMs / 1000);
      return Math.round(durationSeconds / 60);
    } catch (error) {
      return 0;
    }
  }

  /**
   * GoogleカレンダーイベントからCalendarEventインスタンスを作成する
   */
  static fromGoogleCalendarEvent(event: CalendarEventType): CalendarEvent {
    const id = CalendarEvent.extractIdFromGoogleEvent(event);
    const taskcode = CalendarEvent.extractTaskcodeFromGoogleEvent(event);
    const text = CalendarEvent.extractTextFromGoogleEvent(event);
    const completedAt = CalendarEvent.extractCompletedAtFromGoogleEvent(event);
    const createdAt = CalendarEvent.extractCreatedAtFromGoogleEvent(event);
    const updatedAt = CalendarEvent.extractUpdatedAtFromGoogleEvent(event);
    const startTime = CalendarEvent.extractStartTimeFromGoogleEvent(event);
    const endTime = CalendarEvent.extractEndTimeFromGoogleEvent(event);

    return new CalendarEvent(
      id,
      taskcode,
      text,
      completedAt,
      createdAt,
      updatedAt,
      startTime,
      endTime
    );
  }

  /**
   * GoogleカレンダーイベントからIDを抽出する
   */
  private static extractIdFromGoogleEvent(event: CalendarEventType): string {
    return CalendarEvent.generateIdFromEvent(event);
  }

  /**
   * Googleカレンダーイベントからタスクコードを抽出する
   */
  private static extractTaskcodeFromGoogleEvent(_event: CalendarEventType): string {
    return '';
  }

  /**
   * Googleカレンダーイベントからテキスト（イベントタイトル）を抽出する
   */
  private static extractTextFromGoogleEvent(event: CalendarEventType): string {
    return event.summary;
  }

  /**
   * Googleカレンダーイベントから完了日時を抽出する
   */
  private static extractCompletedAtFromGoogleEvent(_event: CalendarEventType): string | null {
    return null;
  }

  /**
   * Googleカレンダーイベントから作成日時を抽出する
   */
  private static extractCreatedAtFromGoogleEvent(event: CalendarEventType): string {
    return convertISOToJST(event.created);
  }

  /**
   * Googleカレンダーイベントから更新日時を抽出する
   */
  private static extractUpdatedAtFromGoogleEvent(event: CalendarEventType): string {
    return new Date(event.updated).toISOString();
  }

  /**
   * Googleカレンダーイベントから開始時刻を抽出する
   */
  private static extractStartTimeFromGoogleEvent(event: CalendarEventType): string | null {
    const rawTime = event.start.dateTime || event.start.date;
    if (!rawTime) {
      return null;
    }
    return convertISOToJST(rawTime);
  }

  /**
   * Googleカレンダーイベントから終了時刻を抽出する
   */
  private static extractEndTimeFromGoogleEvent(event: CalendarEventType): string | null {
    const rawTime = event.end.dateTime || event.end.date;
    if (!rawTime) {
      return null;
    }
    return convertISOToJST(rawTime);
  }

  /**
   * 文字列から簡易的なハッシュ値を計算する
   * @param str ハッシュ化する文字列
   * @param reverse trueの場合、逆順で処理
   * @returns ハッシュ値
   */
  private static simpleHash(str: string, reverse: boolean = false): number {
    let hash = 0;
    const len = str.length;

    for (let i = 0; i < len; i++) {
      const index = reverse ? (len - 1 - i) : i;
      const char = str.charCodeAt(index);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return hash;
  }

  /**
   * Googleカレンダーイベントから決定的なIDを生成する
   * 同じイベントからは常に同じIDが生成される
   */
  private static generateIdFromEvent(event: CalendarEventType): string {
    const startTime = event.start.dateTime || event.start.date || '';
    const createdTime = event.created;
    const uniqueString = `${startTime}_${createdTime}`;

    const hash = this.simpleHash(uniqueString, false);
    const hash2 = this.simpleHash(uniqueString, true);

    const hashHex1 = Math.abs(hash).toString(16).padStart(8, '0');
    const hashHex2 = Math.abs(hash2).toString(16).padStart(8, '0');

    return `cal-${hashHex1}-${hashHex2.substring(0, 4)}-${hashHex2.substring(4, 8)}-${hashHex1.substring(0, 12)}`;
  }

  /**
   * JSONからCalendarEventインスタンスを作成する
   */
  static fromJSON(json: any): CalendarEvent {
    const now = getCurrentJSTTime();

    const completedAt: string | null = json.completedAt || null;
    const createdAt = json.createdAt || now;
    const updatedAt = json.updatedAt || now;
    const taskcode = json.taskcode || '';

    const startTime = json.startTime || null;
    const endTime = json.endTime || null;

    return new CalendarEvent(
      json.id,
      taskcode,
      json.text,
      completedAt,
      createdAt,
      updatedAt,
      startTime,
      endTime
    );
  }

  /**
   * JSON形式に変換する
   */
  toJSON() {
    return {
      id: this.id,
      type: this.getType(),
      taskcode: this.taskcode,
      text: this.text,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      startTime: this.startTime,
      endTime: this.endTime
    };
  }
}
