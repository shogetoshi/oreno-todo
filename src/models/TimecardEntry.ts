/**
 * Model Layer: TimecardEntry
 * 1つのタイムカードエントリ（チェックインまたはチェックアウト）を表すエンティティ
 */

export type TimecardEntryType = 'start' | 'end';

export interface TimecardEntryJSON {
  type: TimecardEntryType;
  time: string;
}

export class TimecardEntry {
  constructor(
    public readonly type: TimecardEntryType,
    public readonly time: string // YYYY-MM-DD HH:mm:ss形式
  ) {}

  /**
   * JSONオブジェクトからTimecardEntryを生成する
   * @param json JSONオブジェクト
   * @returns TimecardEntry
   */
  static fromJSON(json: TimecardEntryJSON): TimecardEntry {
    if (!json.type || (json.type !== 'start' && json.type !== 'end')) {
      throw new Error('type は "start" または "end" である必要があります');
    }
    if (!json.time || typeof json.time !== 'string') {
      throw new Error('time は文字列である必要があります');
    }
    return new TimecardEntry(json.type, json.time);
  }

  /**
   * TimecardEntryをJSONオブジェクトに変換する
   * @returns JSONオブジェクト
   */
  toJSON(): TimecardEntryJSON {
    return {
      type: this.type,
      time: this.time,
    };
  }

  /**
   * エントリの時刻を変更した新しいTimecardEntryを返す
   * @param newTime 新しい時刻
   * @returns 新しいTimecardEntry
   */
  setTime(newTime: string): TimecardEntry {
    return new TimecardEntry(this.type, newTime);
  }

  /**
   * エントリのタイプを変更した新しいTimecardEntryを返す
   * @param newType 新しいタイプ
   * @returns 新しいTimecardEntry
   */
  setType(newType: TimecardEntryType): TimecardEntry {
    return new TimecardEntry(newType, this.time);
  }
}
