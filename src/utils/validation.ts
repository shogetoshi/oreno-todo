/**
 * Model Layer: Validation Utility
 * Todoデータのバリデーション関数
 * JSONパース後のデータが正しいTodo型に準拠しているかをチェックする
 * ビジネスルールに基づくデータ整合性を保証
 */

/**
 * TimeRange型のバリデーション
 *
 * @param data - バリデーション対象のデータ
 * @returns dataがTimeRange型に準拠している場合true
 */
function validateTimeRange(data: unknown): data is { start: string; end: string | null } {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // startは必須のstring
  if (typeof obj.start !== 'string') {
    return false;
  }

  // endはstring | null
  if (obj.end !== null && typeof obj.end !== 'string') {
    return false;
  }

  return true;
}

/**
 * 個別のTodoオブジェクトをバリデーション
 *
 * @param data - バリデーション対象のデータ
 * @returns dataがTodo型に準拠している場合true
 */
export function validateTodo(data: unknown): data is { id: string; taskcode: string; text: string; completedAt: string | null } {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // 必須プロパティのチェック
  if (typeof obj.id !== 'string') {
    return false;
  }

  // taskcodeは文字列型である必要がある
  if (typeof obj.taskcode !== 'string') {
    return false;
  }

  if (typeof obj.text !== 'string') {
    return false;
  }

  // completedAtはstring | nullを許容
  if (obj.completedAt !== null && typeof obj.completedAt !== 'string') {
    return false;
  }

  // createdAtとupdatedAtはオプショナル（既存データとの互換性のため）
  // 存在する場合は文字列型である必要がある
  if (obj.createdAt !== undefined && typeof obj.createdAt !== 'string') {
    return false;
  }

  if (obj.updatedAt !== undefined && typeof obj.updatedAt !== 'string') {
    return false;
  }

  // timeRangesはオプショナル（既存データとの互換性のため）
  // 存在する場合のみ、配列であり全要素が正しいTimeRange型かチェック
  if (obj.timeRanges !== undefined) {
    if (!Array.isArray(obj.timeRanges)) {
      return false;
    }
    if (!obj.timeRanges.every(item => validateTimeRange(item))) {
      return false;
    }
  }

  return true;
}

/**
 * Todo配列をバリデーション
 *
 * @param data - バリデーション対象のデータ
 * @returns dataがTodo配列に準拠している場合true
 */
export function validateTodos(data: unknown): data is Array<{ id: string; taskcode: string; text: string; completedAt: string | null }> {
  if (!Array.isArray(data)) {
    return false;
  }

  // 全要素が正しいTodo型かチェック
  return data.every(item => validateTodo(item));
}
