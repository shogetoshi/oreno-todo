/**
 * Googleカレンダーイベントの型定義
 */

/**
 * カレンダーイベントの開始/終了時刻
 */
export interface CalendarEventDateTime {
  dateTime?: string; // ISO 8601形式 (例: "2023-11-01T10:00:00+09:00")
  date?: string; // 終日イベントの場合 (例: "2023-11-05")
  timeZone?: string; // タイムゾーン (例: "Asia/Tokyo")
}

/**
 * カレンダーイベント
 */
export interface CalendarEvent {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string; // ISO 8601形式 (例: "2023-10-20T09:00:00.000Z")
  updated: string; // ISO 8601形式 (例: "2023-10-20T09:30:00.000Z")
  summary: string;
  description?: string;
  location?: string;
  creator: {
    email: string;
    self?: boolean;
  };
  organizer: {
    email: string;
    self?: boolean;
  };
  start: CalendarEventDateTime;
  end: CalendarEventDateTime;
  iCalUID: string;
  sequence: number;
  attendees?: Array<{
    email: string;
    responseStatus: string;
    optional?: boolean;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  transparency?: string;
  eventType: string;
}
