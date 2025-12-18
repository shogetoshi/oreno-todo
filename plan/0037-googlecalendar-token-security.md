# 実装計画: Googleカレンダーアクセストークンのキーチェイン保存

## Issue概要

Googleカレンダーのアクセストークンをファイルベースではなく、OSのセキュアストレージ（キーチェイン/クレデンシャルストア）に保存する。

### 要件
- macOSのキーチェインに対応
- 可能な限りクロスプラットフォーム対応（Windows、Linux）
- 既存のファイルベース保存（`~/.google-calendar-token.json`）を廃止
- 既存の認証フローは維持

## 技術選定

### Electron safeStorage API の採用

**選定理由**:
- Electron 15以降に組み込まれたネイティブAPI（現在使用中のElectron 28で利用可能）
- 外部依存関係が不要（node-keytarのような追加パッケージが不要）
- クロスプラットフォーム対応済み
  - macOS: Keychain Access
  - Windows: DPAPI (Data Protection API)
  - Linux: Secret Service API (gnome-libsecret, kwallet等)

**代替案との比較**:
- node-keytar: ネイティブモジュールのため、ビルドが複雑化する
- 独自実装: セキュリティリスクが高い

**参考資料**:
- [Electron safeStorage 公式ドキュメント](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Replacing Keytar with safeStorage](https://freek.dev/2103-replacing-keytar-with-electrons-safestorage-in-ray)

### safeStorage API の仕様

**主要メソッド**:
```typescript
import { safeStorage } from 'electron';

// 暗号化が利用可能かチェック
safeStorage.isEncryptionAvailable(): boolean

// 文字列を暗号化（Bufferを返す）
safeStorage.encryptString(plainText: string): Buffer

// 暗号化されたBufferを復号化
safeStorage.decryptString(encrypted: Buffer): string
```

**プラットフォーム別の動作**:
- **macOS**: Keychain Accessを使用。他のユーザーおよび他のアプリから保護
- **Windows**: DPAPIを使用。他のユーザーから保護（同じユーザーの他のアプリからは保護されない）
- **Linux**: デスクトップ環境によって異なる（kwallet, gnome-libsecret等）

**制約事項**:
- macOSとLinuxでは、初回暗号化時にOSのパスワードマネージャーがダイアログを表示する可能性がある
- Linuxでパスワードマネージャーが利用できない場合、暗号化が利用不可になる可能性がある

## 影響を受けるファイル

### Main Process層
1. **electron/googleCalendar.ts**
   - トークンの保存・読み込み処理を変更
   - ファイルベースからsafeStorageベースに移行

### 削除されるファイル
- `~/.google-calendar-token.json` （既存ユーザーの環境に残っているファイルも考慮）

## 実装内容

実装はデータの流れに沿って行います。

### 1. トークン保存のキーチェイン化

#### 1.1 safeStorage のインポート

**ファイル**: `electron/googleCalendar.ts`

**変更内容**:
- `electron`モジュールから`safeStorage`をインポート
```typescript
import { safeStorage, app } from 'electron';
```

#### 1.2 トークン保存キーの定義

**変更内容**:
- トークンを保存するためのキー名を定義
```typescript
const TOKEN_STORAGE_KEY = 'google-calendar-token';
```

**注意**:
- safeStorageはキーバリューストアではなく暗号化・復号化APIのため、実際にはアプリケーション独自のストレージ（userDataディレクトリ内の設定ファイル等）に暗号化されたBufferを保存する必要がある

#### 1.3 暗号化トークン保存用の設定ファイルパス定義

**変更内容**:
- 暗号化されたトークンを保存するためのファイルパスを定義
```typescript
const ENCRYPTED_TOKEN_PATH = path.join(app.getPath('userData'), 'google-calendar-token.enc');
```

**理由**:
- safeStorageは暗号化・復号化のみを提供するため、暗号化されたデータの保存先は別途必要
- userDataディレクトリはアプリ専用のデータディレクトリで、`.enc`拡張子でバイナリデータであることを明示

### 2. トークン保存処理の変更

#### 2.1 saveToken 関数のリファクタリング

**ファイル**: `electron/googleCalendar.ts`

**変更前**:
```typescript
async function saveToken(token: Token): Promise<void> {
  await fsPromises.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2));
  console.log(`Google Calendar: トークンを保存しました: ${TOKEN_PATH}`);
}
```

**変更後**:
```typescript
async function saveToken(token: Token): Promise<void> {
  // 1. 暗号化が利用可能かチェック
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('暗号化ストレージが利用できません。OSのキーチェイン/クレデンシャルストアを確認してください。');
  }

  // 2. トークンをJSON文字列に変換
  const tokenJson = JSON.stringify(token);

  // 3. 暗号化
  const encrypted = safeStorage.encryptString(tokenJson);

  // 4. 暗号化されたBufferをファイルに保存
  await fsPromises.writeFile(ENCRYPTED_TOKEN_PATH, encrypted);

  console.log(`Google Calendar: トークンを暗号化して保存しました: ${ENCRYPTED_TOKEN_PATH}`);
}
```

**処理内容**:
1. `safeStorage.isEncryptionAvailable()`で暗号化が利用可能か確認
2. トークンオブジェクトをJSON文字列に変換
3. `safeStorage.encryptString()`で暗号化（Bufferを取得）
4. 暗号化されたBufferをファイルに書き込み

### 3. トークン読み込み処理の変更

#### 3.1 loadToken 関数のリファクタリング

**ファイル**: `electron/googleCalendar.ts`

**変更前**:
```typescript
async function loadToken(): Promise<Token | null> {
  try {
    const content = await fsPromises.readFile(TOKEN_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}
```

**変更後**:
```typescript
async function loadToken(): Promise<Token | null> {
  try {
    // 1. 暗号化が利用可能かチェック
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('Google Calendar: 暗号化ストレージが利用できません');
      return null;
    }

    // 2. 暗号化されたファイルを読み込み
    const encrypted = await fsPromises.readFile(ENCRYPTED_TOKEN_PATH);

    // 3. 復号化
    const tokenJson = safeStorage.decryptString(encrypted);

    // 4. JSONをパース
    return JSON.parse(tokenJson);
  } catch (error) {
    // ファイルが存在しない、または復号化に失敗した場合
    console.log('Google Calendar: 保存されたトークンが見つかりませんでした');
    return null;
  }
}
```

**処理内容**:
1. `safeStorage.isEncryptionAvailable()`で暗号化が利用可能か確認
2. 暗号化されたファイル（Buffer）を読み込み
3. `safeStorage.decryptString()`で復号化（JSON文字列を取得）
4. JSON文字列をパースしてTokenオブジェクトを返す
5. エラー時はnullを返す（既存の動作を維持）

### 4. 既存トークンファイルのマイグレーション（オプション）

#### 4.1 既存ファイルからの移行処理

**ファイル**: `electron/googleCalendar.ts`

**新規関数**: `migrateOldTokenIfExists`

**役割**: 既存の平文JSONファイルが存在する場合、キーチェインに移行して削除

**実装**:
```typescript
async function migrateOldTokenIfExists(): Promise<void> {
  try {
    // 1. 既存のJSONファイルが存在するか確認
    const oldTokenContent = await fsPromises.readFile(TOKEN_PATH, 'utf-8');
    const oldToken = JSON.parse(oldTokenContent);

    console.log('Google Calendar: 既存のトークンファイルを検出しました。キーチェインに移行します...');

    // 2. 新しい形式で保存
    await saveToken(oldToken);

    // 3. 既存ファイルを削除
    await fsPromises.unlink(TOKEN_PATH);

    console.log('Google Calendar: トークンの移行が完了しました。既存ファイルを削除しました。');
  } catch (error) {
    // ファイルが存在しない場合は何もしない
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('Google Calendar: トークンの移行中にエラーが発生しましたが、処理を継続します', error);
    }
  }
}
```

#### 4.2 loadToken での移行処理の呼び出し

**変更内容**:
- `loadToken()`関数内で、暗号化ファイルが見つからない場合に移行処理を試みる

```typescript
async function loadToken(): Promise<Token | null> {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('Google Calendar: 暗号化ストレージが利用できません');
      return null;
    }

    const encrypted = await fsPromises.readFile(ENCRYPTED_TOKEN_PATH);
    const tokenJson = safeStorage.decryptString(encrypted);
    return JSON.parse(tokenJson);
  } catch (error) {
    // 暗号化ファイルが存在しない場合、既存ファイルからの移行を試みる
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await migrateOldTokenIfExists();

      // 移行後、再度読み込みを試みる
      try {
        const encrypted = await fsPromises.readFile(ENCRYPTED_TOKEN_PATH);
        const tokenJson = safeStorage.decryptString(encrypted);
        return JSON.parse(tokenJson);
      } catch {
        // 移行後も読み込めない場合はnullを返す
        return null;
      }
    }

    console.log('Google Calendar: 保存されたトークンが見つかりませんでした');
    return null;
  }
}
```

### 5. 既存の TOKEN_PATH 定義の削除

#### 5.1 不要な定数の削除

**ファイル**: `electron/googleCalendar.ts`

**変更内容**:
- `TOKEN_PATH`定数の定義を削除（移行処理が完了した後のバージョンでは削除）
- コメントの更新

**変更前**:
```typescript
const TOKEN_PATH = path.join(os.homedir(), '.google-calendar-token.json');
```

**変更後**:
```typescript
// TOKEN_PATHは削除（キーチェインに移行）
```

**注意**:
- 移行処理を残す場合は`TOKEN_PATH`定義も残す
- 移行処理を削除する場合は`TOKEN_PATH`定義も削除

### 6. エラーハンドリングの強化

#### 6.1 暗号化失敗時のエラーメッセージ

**変更内容**:
- `saveToken()`と`loadToken()`で適切なエラーメッセージを表示
- Linuxで暗号化が利用できない場合のガイダンスを追加

**実装例**:
```typescript
if (!safeStorage.isEncryptionAvailable()) {
  const platform = os.platform();
  let errorMessage = '暗号化ストレージが利用できません。';

  if (platform === 'linux') {
    errorMessage += '\n\nLinuxでは以下のパッケージが必要です:\n' +
      '  - gnome-keyring (GNOME)\n' +
      '  - kwallet (KDE)\n';
  }

  throw new Error(errorMessage);
}
```

## 実装手順

1. **electron/googleCalendar.ts の変更**
   1. `safeStorage`のインポート追加
   2. `ENCRYPTED_TOKEN_PATH`定数の定義
   3. `saveToken()`関数の変更
   4. `loadToken()`関数の変更
   5. `migrateOldTokenIfExists()`関数の追加
   6. エラーハンドリングの強化

2. **動作確認**
   1. 開発環境でアプリを起動
   2. Googleカレンダー認証を実行
   3. トークンが暗号化されて保存されることを確認
   4. アプリを再起動してトークンが正しく読み込まれることを確認
   5. 既存の`~/.google-calendar-token.json`がある環境で移行が動作することを確認

3. **クロスプラットフォーム確認**
   1. macOSでの動作確認
   2. 可能であればWindows、Linuxでの動作確認

## 考慮事項

### セキュリティ
- **暗号化の強度**: safeStorageは各OSのネイティブ暗号化機能を使用するため、セキュリティレベルは高い
- **アクセス制御**:
  - macOS: 他のアプリからも保護される
  - Windows: 同じユーザーの他のアプリからはアクセス可能（DPAPIの制限）
  - Linux: デスクトップ環境に依存
- **マスターパスワード**: macOSとLinuxでは初回アクセス時にユーザーにパスワード入力を求める場合がある

### 後方互換性
- 既存の`~/.google-calendar-token.json`ファイルを自動的にキーチェインに移行
- 移行後は既存ファイルを削除
- 移行に失敗した場合でも、再認証で新しい方式で保存される

### エラーハンドリング
- `safeStorage.isEncryptionAvailable()`がfalseの場合、適切なエラーメッセージを表示
- Linuxで暗号化が利用できない場合、必要なパッケージを案内
- 復号化に失敗した場合は再認証を促す

### パフォーマンス
- 暗号化・復号化のオーバーヘッドは小さい（トークンは1つのJSONオブジェクトのみ）
- ファイルI/Oは非同期で処理される

### ユーザー体験
- 透過的な移行: ユーザーは変更を意識しない
- 初回起動時にOSのパスワードマネージャーがダイアログを表示する可能性がある（macOS、Linux）
- エラー発生時は明確なメッセージでガイド

### テスト
- Unit testは困難（safeStorageはMain Processでのみ動作）
- 手動テストで以下を確認:
  - 新規インストール環境での動作
  - 既存トークンファイルがある環境での移行
  - 再起動後のトークン読み込み
  - 各プラットフォームでの動作

## 注意事項

- **Electron Main Processでのみ動作**: safeStorageはMain Processでのみ使用可能（Renderer Processでは使用不可）
- **app.ready後に使用**: `safeStorage.isEncryptionAvailable()`はアプリが完全に起動した後でのみ正確な結果を返す
- **Linuxの制約**: Linuxではデスクトップ環境によって動作が異なる。サーバー環境（GUI無し）では動作しない可能性がある
- **クレデンシャルのバックアップ**: OSのキーチェインに保存されるため、OSのバックアップツールでバックアップされる
- **開発環境と本番環境**: 開発版と本番版で異なるアプリIDを使用する場合、別々にトークンが保存される

## 完了条件

- [ ] `safeStorage`をインポートしている
- [ ] `ENCRYPTED_TOKEN_PATH`が定義されている
- [ ] `saveToken()`が暗号化してトークンを保存している
- [ ] `loadToken()`が復号化してトークンを読み込んでいる
- [ ] `migrateOldTokenIfExists()`で既存トークンを移行している
- [ ] エラーハンドリングが適切に実装されている
- [ ] 新規認証でトークンがキーチェインに保存される
- [ ] アプリ再起動後にトークンが正しく読み込まれる
- [ ] 既存の`~/.google-calendar-token.json`から自動移行される
- [ ] ドキュメント（CLAUDE.md）のトークン保存に関する記述を更新
