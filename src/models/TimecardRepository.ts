import { TimecardEntry, TimecardEntryJSON } from './TimecardEntry';
import { getCurrentJSTTime } from '../utils/timeFormat';

/**
 * Model Layer: TimecardRepository
 * タイムカードデータの集合を管理し、ビジネスロジックを提供する
 * データ構造: { [date: string]: TimecardEntry[] }
 * 例: { "2024-10-18": [{ type: "start", time: "2024-10-18 10:59:00" }, ...] }
 */

export type TimecardData = { [date: string]: TimecardEntry[] };
export type TimecardDataJSON = { [date: string]: TimecardEntryJSON[] };

export class TimecardRepository {
  /**
   * 現在時刻でチェックイン（start）エントリを作成する
   * @returns 新しいTimecardEntry
   */
  static createCheckInEntry(): TimecardEntry {
    const now = getCurrentJSTTime();
    return new TimecardEntry('start', now);
  }

  /**
   * 現在時刻でチェックアウト（end）エントリを作成する
   * @returns 新しいTimecardEntry
   */
  static createCheckOutEntry(): TimecardEntry {
    const now = getCurrentJSTTime();
    return new TimecardEntry('end', now);
  }

  /**
   * 指定された日付にチェックインエントリを追加する
   * @param data 既存のタイムカードデータ
   * @param date 日付（YYYY-MM-DD形式）、省略時は今日
   * @returns 新しいタイムカードデータ
   */
  static addCheckIn(data: TimecardData, date?: string): TimecardData {
    const entry = this.createCheckInEntry();
    const targetDate = date || entry.time.split(' ')[0];
    const existingEntries = data[targetDate] || [];
    return {
      ...data,
      [targetDate]: [...existingEntries, entry],
    };
  }

  /**
   * 指定された日付にチェックアウトエントリを追加する
   * @param data 既存のタイムカードデータ
   * @param date 日付（YYYY-MM-DD形式）、省略時は今日
   * @returns 新しいタイムカードデータ
   */
  static addCheckOut(data: TimecardData, date?: string): TimecardData {
    const entry = this.createCheckOutEntry();
    const targetDate = date || entry.time.split(' ')[0];
    const existingEntries = data[targetDate] || [];
    return {
      ...data,
      [targetDate]: [...existingEntries, entry],
    };
  }

  /**
   * 指定された日付・インデックスのエントリを削除する
   * @param data 既存のタイムカードデータ
   * @param date 日付（YYYY-MM-DD形式）
   * @param index エントリのインデックス
   * @returns 新しいタイムカードデータ
   */
  static deleteEntry(data: TimecardData, date: string, index: number): TimecardData {
    const existingEntries = data[date] || [];
    const newEntries = existingEntries.filter((_, i) => i !== index);

    // エントリが空になった場合は日付自体を削除
    if (newEntries.length === 0) {
      const newData = { ...data };
      delete newData[date];
      return newData;
    }

    return {
      ...data,
      [date]: newEntries,
    };
  }

  /**
   * 指定された日付・インデックスのエントリを更新する
   * @param data 既存のタイムカードデータ
   * @param date 日付（YYYY-MM-DD形式）
   * @param index エントリのインデックス
   * @param newEntry 新しいエントリ
   * @returns 新しいタイムカードデータ
   */
  static updateEntry(
    data: TimecardData,
    date: string,
    index: number,
    newEntry: TimecardEntry
  ): TimecardData {
    const existingEntries = data[date] || [];
    const newEntries = existingEntries.map((entry, i) => (i === index ? newEntry : entry));
    return {
      ...data,
      [date]: newEntries,
    };
  }

  /**
   * JSONオブジェクトからタイムカードデータを復元する
   * @param json JSONオブジェクト
   * @returns タイムカードデータ
   */
  static fromJSON(json: TimecardDataJSON): TimecardData {
    const data: TimecardData = {};
    for (const [date, entries] of Object.entries(json)) {
      data[date] = entries.map((entry) => TimecardEntry.fromJSON(entry));
    }
    return data;
  }

  /**
   * タイムカードデータをJSONオブジェクトに変換する
   * @param data タイムカードデータ
   * @returns JSONオブジェクト
   */
  static toJSON(data: TimecardData): TimecardDataJSON {
    const json: TimecardDataJSON = {};
    for (const [date, entries] of Object.entries(data)) {
      json[date] = entries.map((entry) => entry.toJSON());
    }
    return json;
  }

  /**
   * JSON文字列からタイムカードデータを復元する
   * @param jsonText JSON文字列
   * @returns タイムカードデータ
   */
  static fromJsonText(jsonText: string): TimecardData {
    const parsed = JSON.parse(jsonText);
    return this.fromJSON(parsed);
  }

  /**
   * タイムカードデータをJSON文字列に変換する
   * @param data タイムカードデータ
   * @param pretty 整形するかどうか
   * @returns JSON文字列
   */
  static toJsonText(data: TimecardData, pretty: boolean = true): string {
    const json = this.toJSON(data);
    return pretty ? JSON.stringify(json, null, 2) : JSON.stringify(json);
  }

  /**
   * 日付の配列をソート済みで取得する（降順）
   * @param data タイムカードデータ
   * @returns ソート済みの日付配列
   */
  static getSortedDates(data: TimecardData): string[] {
    return Object.keys(data).sort((a, b) => b.localeCompare(a));
  }

  /**
   * 指定日付のタイムカードエントリをJSON文字列から置き換える
   * @param data 既存のタイムカードデータ
   * @param date 日付（YYYY-MM-DD形式）
   * @param jsonText 新しいエントリ配列を表すJSON文字列
   * @returns 新しいタイムカードデータ
   * @throws JSONパースエラー
   */
  static replaceEntriesForDate(data: TimecardData, date: string, jsonText: string): TimecardData {
    // JSON解析
    const jsonArray = JSON.parse(jsonText);

    // TimecardEntryに変換
    const newEntries = jsonArray.map((json: any) => TimecardEntry.fromJSON(json));

    // 新しいデータを作成
    return {
      ...data,
      [date]: newEntries
    };
  }

  /**
   * タイムカードエントリが正常なstart-endペアになっているかを検証する
   *
   * 正常なパターン:
   * - start, end, start, end, ... （完全なペア）
   * - start, end, start, end, ..., start （最後がstartで終わる）
   *
   * 異常なパターン:
   * - start, start, ... （startが連続）
   * - end, ... （endから始まる）
   * - start, end, end, ... （endが連続）
   * - 空配列 （エントリなし）
   *
   * @param entries タイムカードエントリ配列
   * @returns true: 正常、false: 異常
   */
  static validateTimecardEntries(entries: TimecardEntry[]): boolean {
    if (entries.length === 0) {
      return false;
    }

    let expectingStart = true;

    for (const entry of entries) {
      if (expectingStart && entry.type !== 'start') {
        return false; // startを期待しているのにendが来た
      }
      if (!expectingStart && entry.type !== 'end') {
        return false; // endを期待しているのにstartが来た
      }
      expectingStart = !expectingStart;
    }

    return true;
  }

  /**
   * 指定日付の稼働時間を秒単位で計算する
   *
   * - 正常なstart-endペアの場合: 各ペアの時間差を合計
   * - 最後がstartで終わる場合: 最後のstartから現在時刻までを含めて計算
   * - 異常なパターンの場合: null を返す
   *
   * @param data タイムカードデータ
   * @param date 日付（YYYY-MM-DD形式）
   * @returns 稼働時間（秒）、または異常時は null
   */
  static calculateWorkingTimeForDate(data: TimecardData, date: string): number | null {
    // 指定日付のエントリを取得
    const entries = data[date] || [];

    // エントリの検証
    if (!this.validateTimecardEntries(entries)) {
      return null;
    }

    let totalSeconds = 0;
    let currentStartEntry: TimecardEntry | null = null;

    // エントリを順番に走査し、startとendのペアを見つける
    for (const entry of entries) {
      if (entry.type === 'start') {
        // 新しいstartエントリを記録
        currentStartEntry = entry;
      } else if (entry.type === 'end' && currentStartEntry !== null) {
        // startとendのペアが見つかった場合、時間差を計算
        const startTime = new Date(currentStartEntry.time);
        const endTime = new Date(entry.time);
        const diffMs = endTime.getTime() - startTime.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        totalSeconds += diffSeconds;
        currentStartEntry = null;
      }
    }

    // 最後がstartで終わっている場合、現在時刻までを計算
    if (currentStartEntry !== null) {
      const startTime = new Date(currentStartEntry.time);
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      totalSeconds += diffSeconds;
    }

    return totalSeconds;
  }

  /**
   * 指定日付のタイムカードエントリをJSON形式で取得する
   * @param data タイムカードデータ
   * @param date 日付（YYYY-MM-DD形式）
   * @returns 指定日付のエントリのJSON配列
   */
  static getEntriesForDateAsJSON(data: TimecardData, date: string): TimecardEntryJSON[] {
    // TODO: 実装予定
    const entries = data[date] || [];
    return entries.map((entry) => entry.toJSON());
  }
}
