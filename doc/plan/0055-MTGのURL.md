# Issue #0055: MTGのURL取得ロジック実装

## 概要

CalendarEventのMTG URL取得ロジックを実装する。現在は固定文字列を返す仮実装となっているが、これを実際のGoogleカレンダーイベントデータから抽出する実装に置き換える。

## Issue詳細

参考コードから以下の3つのURL取得関数を移植する：

1. `getMeetingUrlFromDescription(event)` - イベントのdescriptionからZoomやTeamsのURLを正規表現で抽出
2. `getMeetingUrlFromHangoutLink(event)` - イベントのhangoutLinkフィールドからURLを取得
3. `getMeetingUrl(event)` - 上記2つを優先度付きで呼び出し（description優先、次にhangoutLink、なければ空文字）

### URL抽出の優先順位

1. **description内のZoom URL** - `https://(\w+\.)?zoom\.us/...`
2. **description内のTeams URL** - `https://teams\.microsoft\.com/...`
3. **hangoutLink** - Google Meetなどのリンク
4. **なし** - 空文字列を返す

## 現状分析

### 既存の実装状況

#### ✅ 完了している実装（Issue #0048で実装済み）

- `CalendarEvent`モデルに`meetingUrl`フィールドが追加済み
- `getMeetingUrl()`メソッドが実装済み
- `ListItem`インターフェースに`getMeetingUrl()`が追加済み
- Main Processに`open-url` IPCハンドラーが実装済み
- Controller層に`openMeetingUrl()`関数が実装済み
- View層でstartボタンからURL起動機能が実装済み

#### ⚠️ 仮実装のまま（今回修正対象）

**ファイル: `src/models/CalendarEvent.ts:360-363`**
```typescript
private static extractMeetingUrlFromGoogleEvent(_event: CalendarEventType): string | null {
  // 仮実装: 固定文字列を返す
  return "https://meet.google.com/xxx-xxxx-xxx";
}
```

#### 🔴 不足している実装

**ファイル: `electron/googleCalendar.ts`**

1. **型定義に`hangoutLink`フィールドが欠落**
   - `CalendarEventData`インターフェース（435-480行目）に`hangoutLink`フィールドがない
   - Google Calendar APIは`hangoutLink`を返すが、変換関数`convertToCalendarEvent()`（381-432行目）で破棄されている

2. **変換関数で`hangoutLink`が取得されていない**
   - `convertToCalendarEvent()`関数が`event.hangoutLink`を無視している

**ファイル: `src/types/calendar.ts`**

1. **CalendarEventインターフェースに`hangoutLink`がない**
   - アプリケーション全体で使用される型定義に`hangoutLink`フィールドが欠落（修正済み）

## 実装内容

### 1. electron/googleCalendar.ts の型定義修正

**ファイル: `electron/googleCalendar.ts`**

#### 1-1. CalendarEventDataインターフェースに`hangoutLink`を追加

**場所: 435-480行目**

```typescript
export interface CalendarEventData {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  hangoutLink?: string | null;  // ← 追加
  creator: {
    email: string;
    self?: boolean;
  };
  organizer: {
    email: string;
    self?: boolean;
  };
  start: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
  end: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
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
  transparency?: string | null;
  eventType: string;
}
```

#### 1-2. convertToCalendarEvent関数で`hangoutLink`を取得

**場所: 381-432行目**

```typescript
function convertToCalendarEvent(
  event: calendar_v3.Schema$Event
): CalendarEventData {
  return {
    kind: event.kind || 'calendar#event',
    etag: event.etag || '',
    id: event.id || '',
    status: event.status || 'confirmed',
    htmlLink: event.htmlLink || '',
    created: event.created || '',
    updated: event.updated || '',
    summary: event.summary || '',
    description: event.description,
    location: event.location,
    hangoutLink: event.hangoutLink,  // ← 追加
    creator: {
      email: event.creator?.email || '',
      self: event.creator?.self,
    },
    organizer: {
      email: event.organizer?.email || '',
      self: event.organizer?.self,
    },
    start: {
      dateTime: event.start?.dateTime,
      date: event.start?.date,
      timeZone: event.start?.timeZone,
    },
    end: {
      dateTime: event.end?.dateTime,
      date: event.end?.date,
      timeZone: event.end?.timeZone,
    },
    iCalUID: event.iCalUID || '',
    sequence: number: event.sequence || 0,
    attendees: event.attendees?.map((a) => ({
      email: a.email || '',
      responseStatus: a.responseStatus || '',
      optional: a.optional ?? undefined,
    })),
    reminders: event.reminders
      ? {
          useDefault: event.reminders.useDefault || false,
          overrides: event.reminders.overrides?.map((o) => ({
            method: o.method || '',
            minutes: o.minutes || 0,
          })),
        }
      : undefined,
    transparency: event.transparency,
    eventType: event.eventType || 'default',
  };
}
```

### 2. src/models/CalendarEvent.ts のURL抽出ロジック実装

**ファイル: `src/models/CalendarEvent.ts`**

#### 2-1. extractMeetingUrlFromGoogleEvent()メソッドの実装を置き換え

**場所: 356-363行目**

既存の仮実装：
```typescript
/**
 * GoogleカレンダーイベントからMTG URLを抽出する
 * TODO: 実際のイベントデータから抽出する（現在は仮実装）
 */
private static extractMeetingUrlFromGoogleEvent(_event: CalendarEventType): string | null {
  // 仮実装: 固定文字列を返す
  return "https://meet.google.com/xxx-xxxx-xxx";
}
```

新しい実装：
```typescript
/**
 * GoogleカレンダーイベントからMTG URLを抽出する
 * 優先順位:
 * 1. description内のZoom URL
 * 2. description内のTeams URL
 * 3. hangoutLink（Google Meetなど）
 * 4. なし（空文字列）
 */
private static extractMeetingUrlFromGoogleEvent(event: CalendarEventType): string | null {
  // 1. descriptionからZoom/TeamsのURLを抽出
  const descriptionUrl = this.extractMeetingUrlFromDescription(event);
  if (descriptionUrl) {
    return descriptionUrl;
  }

  // 2. hangoutLinkからURLを取得
  const hangoutUrl = this.extractMeetingUrlFromHangoutLink(event);
  if (hangoutUrl) {
    return hangoutUrl;
  }

  // 3. どちらもない場合はnull
  return null;
}
```

#### 2-2. 新しいヘルパーメソッドを追加

**場所: extractMeetingUrlFromGoogleEvent()の直後**

```typescript
/**
 * イベントのdescriptionからZoomやTeamsのURLを正規表現で抽出する
 * @param event Googleカレンダーイベント
 * @returns 抽出されたURL、見つからない場合はnull
 */
private static extractMeetingUrlFromDescription(event: CalendarEventType): string | null {
  if (!event.description) {
    return null;
  }

  // Zoom URL
  const zoomRegexp = /https:\/\/(\w+\.)?zoom\.us\/[\w!?/+\-_~;.,*&@#$%()'\[\]=]+/;
  const zoomMatch = event.description.match(zoomRegexp);
  if (zoomMatch !== null) {
    return zoomMatch[0];
  }

  // Teams URL
  const teamsRegexp = /https:\/\/teams\.microsoft\.com\/[\w!?/+\-_~;.,*&@#$%()'\[\]=]+/;
  const teamsMatch = event.description.match(teamsRegexp);
  if (teamsMatch !== null) {
    return teamsMatch[0];
  }

  return null;
}

/**
 * イベントのhangoutLinkフィールドからURLを取得する
 * @param event Googleカレンダーイベント
 * @returns hangoutLink、存在しない場合はnull
 */
private static extractMeetingUrlFromHangoutLink(event: CalendarEventType): string | null {
  return event.hangoutLink ?? null;
}
```

## 実装手順

### フェーズ1: データフロー修正（electron層）

1. **electron/googleCalendar.ts の型定義修正**
   - `CalendarEventData`インターフェースに`hangoutLink?: string | null`を追加
   - 位置: `location`フィールドの直後

2. **electron/googleCalendar.ts の変換関数修正**
   - `convertToCalendarEvent()`関数に`hangoutLink: event.hangoutLink`を追加
   - 位置: `location: event.location`の直後

### フェーズ2: URL抽出ロジック実装（Model層）

3. **CalendarEvent.ts のヘルパーメソッド追加**
   - `extractMeetingUrlFromDescription()`メソッドを追加（private static）
   - `extractMeetingUrlFromHangoutLink()`メソッドを追加（private static）
   - 位置: `extractMeetingUrlFromGoogleEvent()`の直後

4. **CalendarEvent.ts のメイン抽出メソッド実装**
   - `extractMeetingUrlFromGoogleEvent()`の実装を仮実装から実装に置き換え
   - ヘルパーメソッドを呼び出す形で実装

### フェーズ3: 動作確認

5. **手動テスト**
   - アプリを起動し、Googleカレンダーイベントをインポート
   - 以下のパターンで動作確認:
     a. Zoom URLがdescriptionに含まれるイベント
     b. Teams URLがdescriptionに含まれるイベント
     c. Google Meet（hangoutLinkのみ）のイベント
     d. MTG URLが全くないイベント
   - 各パターンでstartボタンを押し、正しいURLが開くことを確認

## MVCアーキテクチャとの整合性

### Model層（ドメインロジック）

- **CalendarEvent.ts**: URL抽出ロジックはビジネスロジックとして適切にModel層に配置
- **純粋関数**: すべてのメソッドは副作用なく、同じ入力には同じ出力を返す
- **イミュータブル**: 既存のCalendarEventインスタンスを変更せず、新しいインスタンスを生成

### Controller層（状態管理・IPC通信）

- 変更なし（既に`openMeetingUrl()`が実装済み）

### View層（UI表示）

- 変更なし（既にstartボタンからURL起動機能が実装済み）

### Electron Main Process層

- **googleCalendar.ts**: Google Calendar APIとの通信を担当
- **型定義の修正**: APIレスポンスを正確にアプリケーション層に渡す

## データフロー

```
Google Calendar API
  ↓ (calendar_v3.Schema$Event)
electron/googleCalendar.ts:fetchEvents()
  ↓ (calendar_v3.Schema$Event[])
electron/googleCalendar.ts:convertToCalendarEvent()
  ↓ (CalendarEventData) ← hangoutLinkを追加
electron/main.ts (IPC: fetch-calendar-events)
  ↓
src/hooks/useTodos.ts:importCalendarEvents()
  ↓ (CalendarEvent型)
src/models/TodoRepository.ts:createCalendarEventFromGoogleEvent()
  ↓
src/models/CalendarEvent.ts:fromGoogleCalendarEvent()
  ↓
src/models/CalendarEvent.ts:extractMeetingUrlFromGoogleEvent()
  ├─ extractMeetingUrlFromDescription() ← 実装
  └─ extractMeetingUrlFromHangoutLink() ← 実装
  ↓ (meetingUrl: string | null)
CalendarEventインスタンス生成
```

## 考慮事項

### 正規表現パターン

- **Zoom**: `https://(\w+\.)?zoom\.us/...`
  - サブドメインあり（例: `https://zoom.us/...`, `https://us02web.zoom.us/...`）
- **Teams**: `https://teams\.microsoft\.com/...`
  - Teamsのミーティングリンク

### URL抽出の優先順位

1. **description優先**: ZoomやTeamsは明示的にURLを記載することが多い
2. **hangoutLink次点**: Google Meetは自動的に設定される
3. **空文字列**: どちらもない場合は空文字列（UI側で何もしない）

### セキュリティ

- URL抽出は正規表現による読み取りのみ（安全）
- URL起動は既存の`open-url` IPCハンドラーでスキームチェック済み（`http://`または`https://`のみ許可）

### データ互換性

- 既存のJSONデータには影響なし（Model層の内部ロジックのみ変更）
- Google Calendar APIから取得する際に`hangoutLink`が追加されるのみ

### テスト観点

- [ ] Zoom URLがdescriptionに含まれる場合、正しく抽出されるか
- [ ] Teams URLがdescriptionに含まれる場合、正しく抽出されるか
- [ ] hangoutLinkのみが存在する場合、正しく抽出されるか
- [ ] description内のZoomとhangoutLinkが両方存在する場合、Zoomが優先されるか
- [ ] description内のTeamsとhangoutLinkが両方存在する場合、Teamsが優先されるか
- [ ] どちらも存在しない場合、nullが返されるか
- [ ] descriptionがnullまたはundefinedの場合、エラーにならないか

## 変更ファイルリスト

1. ✅ `src/types/calendar.ts` - CalendarEventインターフェースに`hangoutLink`追加（完了）
2. `electron/googleCalendar.ts` - CalendarEventDataインターフェースに`hangoutLink`追加、変換関数修正
3. `src/models/CalendarEvent.ts` - URL抽出ロジック実装

## 注意事項

- 既存の`openMeetingUrl()`機能は変更不要（Issue #0048で実装済み）
- `hangoutLink`フィールドの追加により、Google Meetのイベントも正しく動作するようになる
- 正規表現パターンは参考コードと完全に一致させる（URL文字クラス: `[\w!?/+\-_~;.,*&@#$%()'\[\]=]+`）
- `extractMeetingUrlFromGoogleEvent()`のパラメータ名を`_event`から`event`に変更（未使用ではなくなるため）
