import { useState, useEffect, useCallback } from 'react';
import { TimecardData, TimecardRepository } from '../models/TimecardRepository';
import { TimecardEntry } from '../models/TimecardEntry';

/**
 * Controller Layer: useTimecard Hook
 * View層とModel層を仲介し、タイムカードの状態管理とIPC通信を担当する
 * ビジネスロジックはTimecardRepositoryに委譲する
 */
export const useTimecard = () => {
  const [timecardData, setTimecardData] = useState<TimecardData>({});
  const [isLoading, setIsLoading] = useState(true);

  // 初期化時にタイムカードデータを読み込む
  useEffect(() => {
    const loadTimecard = async () => {
      try {
        const jsonData = await window.electronAPI.loadTimecard();
        const data = TimecardRepository.fromJSON(jsonData);
        setTimecardData(data);
      } catch (error) {
        console.error('Failed to load timecard:', error);
        setTimecardData({});
      } finally {
        setIsLoading(false);
      }
    };

    loadTimecard();
  }, []);

  // 状態更新と永続化を統合した単一のエントリーポイント
  const setTimecardDataWithPersist = useCallback(
    async (updater: (prev: TimecardData) => TimecardData) => {
      setTimecardData((prevData) => {
        const newData = updater(prevData);
        const prevDataSnapshot = prevData;

        // 楽観的更新: 先にUIを更新してから非同期で保存
        const jsonData = TimecardRepository.toJSON(newData);
        window.electronAPI.saveTimecard(jsonData).catch((error) => {
          console.error('Failed to save timecard:', error);
          // 保存失敗時はロールバック
          setTimecardData(prevDataSnapshot);
        });

        return newData;
      });
    },
    []
  );

  // チェックイン（start）を追加
  const checkIn = useCallback(() => {
    setTimecardDataWithPersist((prev) => TimecardRepository.addCheckIn(prev));
  }, [setTimecardDataWithPersist]);

  // チェックアウト（end）を追加
  const checkOut = useCallback(() => {
    setTimecardDataWithPersist((prev) => TimecardRepository.addCheckOut(prev));
  }, [setTimecardDataWithPersist]);

  // エントリを削除
  const deleteEntry = useCallback(
    (date: string, index: number) => {
      setTimecardDataWithPersist((prev) => TimecardRepository.deleteEntry(prev, date, index));
    },
    [setTimecardDataWithPersist]
  );

  // エントリを更新
  const updateEntry = useCallback(
    (date: string, index: number, newEntry: TimecardEntry) => {
      setTimecardDataWithPersist((prev) =>
        TimecardRepository.updateEntry(prev, date, index, newEntry)
      );
    },
    [setTimecardDataWithPersist]
  );

  // JSON文字列からタイムカードデータを復元
  const replaceFromJson = useCallback(
    async (jsonText: string) => {
      const newData = TimecardRepository.fromJsonText(jsonText);
      setTimecardDataWithPersist((_prev) => newData);
    },
    [setTimecardDataWithPersist]
  );

  // ソート済みの日付リストを取得
  const sortedDates = TimecardRepository.getSortedDates(timecardData);

  return {
    timecardData,
    isLoading,
    checkIn,
    checkOut,
    deleteEntry,
    updateEntry,
    replaceFromJson,
    sortedDates,
  };
};
