# 時間変数リファレンス

このドキュメントは、DanmakuPlayer における時間関連の変数・プロパティ・関数をすべて整理し、その意味と使用箇所を明確にしたものです。

---

## 1. 時間の概念（全体像）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 絶対時刻 (Unix Timestamp)                                                    │
│   例: 1766303624613 ms = 2025-12-21 16:53:44                                │
│   プロパティ: rawTime (ms)                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                    ↓ useTimeSync.js で変換
┌─────────────────────────────────────────────────────────────────────────────┐
│ 相対時刻 (ログ開始からの秒数)                                                │
│   例: 82.5 秒 = ログ開始から1分22.5秒経過                                    │
│   プロパティ: time (秒)                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                    ↓ timeOffset を適用
┌─────────────────────────────────────────────────────────────────────────────┐
│ 動画時間 (シークバー上の位置)                                                │
│   例: 52.5 秒 = 動画開始から52.5秒の位置                                     │
│   計算: time - timeOffset (CMがない場合)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. コメントオブジェクトのプロパティ

### `rawTime` (ミリ秒)

- **意味**: コメントが投稿された絶対時刻（Unix Timestamp）
- **単位**: ミリ秒
- **設定箇所**: `logParser.js` でファイル読み込み時に設定
- **使用箇所**:
  - 「ログ時間を反映するスポイト」で日時を取得
  - `useTimeSync.js` で相対時刻 `time` を計算

### `time` (秒)

- **意味**: ログ開始時点からの相対秒数
- **単位**: 秒
- **設定箇所**: `useTimeSync.js` で計算
- **計算式**:
  - 絶対時刻ログ: `(rawTime - logRefTime) / 1000`
  - 相対時刻ログ: `rawTime / 1000`
- **使用箇所**:
  - 弾幕表示判定 (`useDanmakuPlayer.js`)
  - サイドバーでのアクティブコメント判定
  - シークバーでのプログレス表示

### `dateDisplay` (文字列)

- **意味**: 表示用の日時文字列
- **例**: `"2025/12/21(日) 16:53:44.00"`
- **設定箇所**: `logParser.js`
- **使用箇所**: サイドバーでのコメント表示

---

## 3. 主要な時間変数

### `currentTime` (秒)

- **定義**: `useDanmakuPlayer.js` Line 23
- **意味**: 現在の再生位置（ログ上の相対時刻）
- **範囲**: `timeOffset` ～ `totalDuration + timeOffset`
- **更新タイミング**: 毎フレーム（再生中）、シーク時
- **使用箇所**:
  - 弾幕表示制御
  - サイドバースクロール
  - アクティブコメント判定
  - 全コンポーネントに props として伝播

> **注意**: `.cursorrules` では「論理時間 = 動画時間 + CM時間」と定義されていますが、コード上の `currentTime` は実際には「ログ時間」（ログ開始からの相対秒数）を保持しています。

### `timeOffset` (秒)

- **定義**: `useCMSystem.js` Line 14
- **意味**: 動画の0秒地点に対応するログ上の時刻
- **計算式**: `-videoLogicalTime` (useTimeSync.js Line 95)
- **使用箇所**:
  - シークバー位置計算: `currentTime - timeOffset`
  - ログ時間 → 動画時間変換
  - 動画時間 → ログ時間変換

### `videoStartTimeStr` (文字列)

- **意味**: 動画の開始位置に対応する論理時間（シークバー上の時間）
- **例**: `"0:30:00"` = 動画開始がシークバー30分の位置
- **設定箇所**: 同期設定UI
- **使用箇所**: `useTimeSync.js` で `timeOffset` 計算の基準

### `startTimeStr` (文字列)

- **意味**: ログの開始時刻（絶対時刻の時刻部分）
- **例**: `"16:53:44"`
- **設定箇所**: 同期設定UI または自動設定（最初のコメントから）
- **使用箇所**: `useTimeSync.js` で `logRefTime` 計算

### `startDateStr` (文字列)

- **意味**: ログの開始日付（絶対時刻の日付部分）
- **例**: `"2025-12-21"`
- **設定箇所**: 同期設定UI または自動設定
- **使用箇所**: `useTimeSync.js` で `logRefTime` 計算

---

## 4. CM関連の時間変数

### `logStart` / `logEnd` (秒)

- **意味**: CM区間の開始・終了位置（ログ上の相対時刻）
- **設定箇所**: `useCMSystem.js` の `addCmRangeSmart` / `updateCmRange`
- **使用箇所**:
  - CM待機判定
  - CM区間表示（シークバー上）

### `videoStart` (秒)

- **意味**: CM区間の開始位置（動画上の再生時刻）
- **計算式**: `logStart - accumulatedCmDuration - timeOffset`
- **使用箇所**: CM衝突検出、シークバー上のCMマーカー表示

### `totalWaitOffset` (秒)

- **意味**: 完了したCM区間の累積待機時間
- **使用箇所**: 動画時間 → ログ時間変換

### `currentCmWaitTime` (秒)

- **意味**: 現在のCM待機で経過した時間
- **使用箇所**: CM待機オーバーレイの進捗表示

---

## 5. 時間変換関数

### `logTimeToVideoTime(logTime)` → `{ videoTime, inCmRange, cmRange }`

- **定義**: `useCMSystem.js` Line 131-164
- **意味**: ログ上の時刻 → 動画上の再生時刻
- **計算**:
  ```
  videoTime = logTime - timeOffset - accumulatedCmDuration
  ```
- **使用箇所**: シーク実行時、CM終了後の動画同期

### `videoTimeToLogTime(videoTime)` → `logTime`

- **定義**: `useCMSystem.js` Line 166-183
- **意味**: 動画上の再生時刻 → ログ上の時刻
- **計算**:
  ```
  logTime = videoTime + timeOffset + accumulatedCmDuration
  ```
- **使用箇所**: 再生ループでのフレーム処理

### `logicalTimeToLogTime(logicalTime)` → `logTime`

- **定義**: `useCMSystem.js` Line 185-201
- **意味**: シークバー時間 → ログ上の時刻
- **計算**:
  ```
  logTime = logicalTime + timeOffset
  ```
- **使用箇所**: シークバー操作

---

## 6. 時間の流れ図

```
[動画ファイル]                    [ログファイル]
     │                                │
     ▼                                ▼
video.currentTime ───────────────► rawTime (Unix ms)
     │                                │
     │ videoTimeToLogTime()           │ useTimeSync.js
     │                                ▼
     │                           time (相対秒)
     │                                │
     │ ◄─────────────────────────────┘
     │    currentTime = time (再生ループで同期)
     │
     ▼
シークバー表示 = currentTime - timeOffset
```

---

## 7. 変数一覧表

| 変数名            | 単位 | 意味                   | 定義箇所              |
| ----------------- | ---- | ---------------------- | --------------------- |
| `rawTime`         | ms   | 絶対時刻 (Unix)        | `logParser.js`        |
| `time`            | 秒   | ログ開始からの相対秒数 | `useTimeSync.js`      |
| `currentTime`     | 秒   | 現在のログ上位置       | `useDanmakuPlayer.js` |
| `timeOffset`      | 秒   | 動画0秒=ログX秒        | `useCMSystem.js`      |
| `videoTime`       | 秒   | 動画上の再生位置       | 各所で計算            |
| `logStart/logEnd` | 秒   | CM区間(ログ上)         | `useCMSystem.js`      |
| `videoStart`      | 秒   | CM区間開始(動画上)     | `useCMSystem.js`      |
| `totalWaitOffset` | 秒   | 累積CM待機時間         | `useCMSystem.js`      |
| `displayTime`     | 秒   | 表示用現在時刻         | `useDanmakuPlayer.js` |
| `logRefTime`      | ms   | ログ基準時刻           | `useTimeSync.js`      |

---

## 8. よくある混乱ポイント

### Q1: `currentTime` は「論理時間」ではないの？

A: `.cursorrules` の定義では「論理時間 = 動画時間 + CM時間」ですが、コード上の `currentTime` は実際には **ログ時間**（ログ開始からの相対秒数）を保持しています。変数名は `currentTime` に統一されています。

### Q2: シークバー上の時間はどう計算される？

A: `currentTime - timeOffset` で計算されます。これが動画ファイル上の再生位置と一致します（CMがない場合）。

### Q3: コメントの `.time` と `.rawTime` の違いは？

A:

- `.rawTime`: 絶対時刻（2025年12月21日16:53:44 = 1766303624613 ms）
- `.time`: 相対時刻（ログ開始から82.5秒）

弾幕表示には `.time` を使い、日時取得には `.rawTime` を使います。

---

## 9. 関連ファイル

- `src/hooks/useDanmakuPlayer.js` - メイン再生ループ、currentTime管理
- `src/hooks/useCMSystem.js` - CM管理、時間変換関数
- `src/hooks/useTimeSync.js` - 同期設定、time計算
- `src/hooks/useLogSystem.js` - ログファイル管理
- `src/utils/logParser.js` - ファイルパース、rawTime設定
