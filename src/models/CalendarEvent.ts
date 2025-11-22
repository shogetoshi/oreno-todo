import { getCurrentJSTTime, parseJSTString } from '../utils/timeFormat';
import { ListItem, ListItemType } from './ListItem';
import { TimeRange } from './Todo';
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
    public readonly timeRanges: TimeRange[],
    public readonly startTime: string | null,  // イベント開始時刻
    public readonly endTime: string | null,    // イベント終了時刻
    public readonly location: string | null,   // 開催場所
    public readonly description: string | null // イベント詳細
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
   * 開催場所を取得する
   */
  getLocation(): string | null {
    return this.location;
  }

  /**
   * イベント詳細を取得する
   */
  getDescription(): string | null {
    return this.description;
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
      this.timeRanges,
      this.startTime,
      this.endTime,
      this.location,
      this.description
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
      this.timeRanges,
      this.startTime,
      this.endTime,
      this.location,
      this.description
    );
  }

  /**
   * 完了状態を切り替えた新しいCalendarEventインスタンスを返す
   */
  toggleCompleted(): CalendarEvent {
    const now = getCurrentJSTTime();
    const newCompletedAt = this.completedAt === null ? now : null;
    return new CalendarEvent(
      this.id,
      this.taskcode,
      this.text,
      newCompletedAt,
      this.createdAt,
      now,
      this.timeRanges,
      this.startTime,
      this.endTime,
      this.location,
      this.description
    );
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
      this.timeRanges,
      this.startTime,
      this.endTime,
      this.location,
      this.description
    );
  }

  /**
   * 時間計測を開始した新しいCalendarEventインスタンスを返す
   */
  startTimer(): CalendarEvent {
    const now = getCurrentJSTTime();
    const newRange: TimeRange = {
      start: now,
      end: null
    };
    const newTimeRanges = [...this.timeRanges, newRange];
    return new CalendarEvent(
      this.id,
      this.taskcode,
      this.text,
      this.completedAt,
      this.createdAt,
      now,
      newTimeRanges,
      this.startTime,
      this.endTime,
      this.location,
      this.description
    );
  }

  /**
   * 時間計測を停止した新しいCalendarEventインスタンスを返す
   */
  stopTimer(): CalendarEvent {
    if (this.timeRanges.length === 0) {
      return this;
    }

    const newRanges = [...this.timeRanges];
    const lastRange = newRanges[newRanges.length - 1];

    if (lastRange.end === null) {
      const now = getCurrentJSTTime();
      newRanges[newRanges.length - 1] = {
        ...lastRange,
        end: now
      };
      return new CalendarEvent(
        this.id,
        this.taskcode,
        this.text,
        this.completedAt,
        this.createdAt,
        now,
        newRanges,
        this.startTime,
        this.endTime,
        this.location,
        this.description
      );
    }

    return this;
  }

  /**
   * タイマーが実行中かどうかを判定する
   */
  isTimerRunning(): boolean {
    if (this.timeRanges.length === 0) {
      return false;
    }
    const lastRange = this.timeRanges[this.timeRanges.length - 1];
    return lastRange.end === null;
  }

  /**
   * 合計実行時間を分単位で取得する
   */
  getTotalExecutionTimeInMinutes(): number {
    if (this.timeRanges.length === 0) {
      return 0;
    }

    const totalSeconds = this.timeRanges.reduce((total, range) => {
      const startTime = parseJSTString(range.start).getTime();
      const endTime = range.end ? parseJSTString(range.end).getTime() : parseJSTString(getCurrentJSTTime()).getTime();
      const durationMs = endTime - startTime;
      const durationSeconds = Math.floor(durationMs / 1000);
      return total + durationSeconds;
    }, 0);

    return Math.round(totalSeconds / 60);
  }

  /**
   * GoogleカレンダーイベントからCalendarEventインスタンスを作成する
   */
  static fromGoogleCalendarEvent(event: CalendarEventType): CalendarEvent {
    // イベントの開始時刻・終了時刻を取得
    const startTime = event.start.dateTime || event.start.date || null;
    const endTime = event.end.dateTime || event.end.date || null;

    // created, updated時刻をISO 8601形式で取得
    const createdAt = new Date(event.created).toISOString();
    const updatedAt = new Date(event.updated).toISOString();

    // 開始時刻とcreated時刻から決定的なIDを生成
    const id = CalendarEvent.generateIdFromEvent(event);

    // タスクコード、テキスト、場所、詳細を抽出
    const taskcode = '';
    const text = event.summary;
    const location = event.location || null;
    const description = event.description || null;

    const completedAt = null;
    const timeRanges: TimeRange[] = [];

    return new CalendarEvent(
      id,
      taskcode,
      text,
      completedAt,
      createdAt,
      updatedAt,
      timeRanges,
      startTime,
      endTime,
      location,
      description
    );
  }

  /**
   * Googleカレンダーイベントから決定的なIDを生成する
   * 同じイベントからは常に同じIDが生成される
   */
  private static generateIdFromEvent(event: CalendarEventType): string {
    const startTime = event.start.dateTime || event.start.date || '';
    const createdTime = event.created;
    const uniqueString = `${startTime}_${createdTime}`;

    // 簡易的なハッシュ生成
    let hash = 0;
    for (let i = 0; i < uniqueString.length; i++) {
      const char = uniqueString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    let hash2 = 0;
    for (let i = uniqueString.length - 1; i >= 0; i--) {
      const char = uniqueString.charCodeAt(i);
      hash2 = ((hash2 << 5) - hash2) + char;
      hash2 = hash2 & hash2;
    }

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
    const timeRanges: TimeRange[] = json.timeRanges || [];

    const startTime = json.startTime || null;
    const endTime = json.endTime || null;
    const location = json.location || null;
    const description = json.description || null;

    return new CalendarEvent(
      json.id,
      taskcode,
      json.text,
      completedAt,
      createdAt,
      updatedAt,
      timeRanges,
      startTime,
      endTime,
      location,
      description
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
      timeRanges: this.timeRanges,
      startTime: this.startTime,
      endTime: this.endTime,
      location: this.location,
      description: this.description
    };
  }
}
