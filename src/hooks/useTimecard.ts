import { useState, useEffect, useCallback } from 'react';
import { TimecardData, TimecardRepository } from '../models/TimecardRepository';

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

  // HTTPサーバー経由のチェックインリクエストを受信
  useEffect(() => {
    window.electronAPI.onCheckInRequest(() => {
      checkIn();
    });
  }, [checkIn]);

  // HTTPサーバー経由のチェックアウトリクエストを受信
  useEffect(() => {
    window.electronAPI.onCheckOutRequest(() => {
      checkOut();
    });
  }, [checkOut]);

  // JSON文字列からタイムカードデータを復元
  const replaceFromJson = useCallback(
    async (jsonText: string) => {
      const newData = TimecardRepository.fromJsonText(jsonText);
      setTimecardDataWithPersist((_prev) => newData);
    },
    [setTimecardDataWithPersist]
  );

  // 指定日付のタイムカードエントリをJSON文字列から置き換え
  const replaceTimecardForDate = useCallback(
    async (date: string, jsonText: string) => {
      setTimecardDataWithPersist((prev) =>
        TimecardRepository.replaceEntriesForDate(prev, date, jsonText)
      );
    },
    [setTimecardDataWithPersist]
  );

  return {
    timecardData,
    isLoading,
    checkIn,
    checkOut,
    replaceFromJson,
    replaceTimecardForDate,
  };
};
