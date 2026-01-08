# 時間変数リファレンス

このドキュメントは、DanmakuPlayer における時間関連の変数・プロパティ・関数をすべて整理し、その意味・計算式・使用箇所を明確にしたものです。

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
                    ↓ logStartTime を適用
┌─────────────────────────────────────────────────────────────────────────────┐
│ 動画時間 (シークバー上の位置)                                                │
│   例: 52.5 秒 = 動画開始から52.5秒の位置                                     │
│   計算: currentTime - logStartTime (CMがない場合)                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. コメントオブジェクトのプロパティ

### `rawTime` (ミリ秒)

- **意味**: コメントが投稿された絶対時刻（Unix Timestamp）
- **単位**: ミリ秒 (ms)
- **計算式**: なし（ログファイルから直接取得）
  ```javascript
  // logParser.js - parseDat()
  const timestamp = new Date(cleanDateStr).getTime();
  rawTime = timestamp;
  ```
- **設定箇所**: `logParser.js` でファイル読み込み時に設定
- **使用箇所**:
  - 「ログ時間を反映するスポイト」で日時を取得
  - `useTimeSync.js` で相対時刻 `time` を計算

### `time` (秒)

- **意味**: ログ開始時点からの相対秒数
- **単位**: 秒
- **計算式**:

  ```javascript
  // useTimeSync.js
  // 絶対時刻ログの場合:
  time = (rawTime - logRefTime) / 1000;

  // 相対時刻ログの場合 (年 < 2000):
  time = rawTime / 1000;
  ```

- **設定箇所**: `useTimeSync.js` Line 103-167
- **使用箇所**:
  - 弾幕表示判定 (`useDanmakuPlayer.js`)
  - サイドバーでのアクティブコメント判定
  - シークバーでのプログレス表示

### `dateDisplay` (文字列)

- **意味**: 表示用の日時文字列
- **例**: `"2025/12/21(日) 16:53:44.00"`
- **計算式**: なし（ログファイルから直接取得）
- **設定箇所**: `logParser.js`
- **使用箇所**: サイドバーでのコメント表示

---

## 3. 主要な時間変数

### `currentTime` (秒)

- **定義**: `useDanmakuPlayer.js` Line 23
- **意味**: 現在の再生位置（ログ上の相対時刻）
- **単位**: 秒
- **計算式**:

  ```javascript
  // 通常再生時 (useDanmakuPlayer.js frameLoop)
  currentTime = videoTimeToLogTime(video.currentTime);

  // 展開すると:
  currentTime = video.currentTime + logStartTime + accumulatedCmDuration;

  // CM待機中:
  currentTime = cmRange.logStart + accumulatedWaitTime + elapsedSinceWaitStart;
  ```

- **範囲**: `logStartTime` ～ `totalDuration + logStartTime`
- **更新タイミング**: 毎フレーム（再生中）、シーク時
- **使用箇所**:
  - 弾幕表示制御
  - サイドバースクロール
  - アクティブコメント判定
  - 全コンポーネントに props として伝播

> **注意**: `.cursorrules` では「論理時間 = 動画時間 + CM時間」と定義されていますが、コード上の `currentTime` は実際には「ログ時間」（ログ開始からの相対秒数）を保持しています。

### `logStartTime` (秒)

- **定義**: `useCMSystem.js` Line 14
- **意味**: 動画の0秒地点に対応するログ上の時刻
- **単位**: 秒
- **計算式**:

  ```javascript
  // useTimeSync.js Line 95
  // videoLogicalTime = videoStartTimeStr をパースした秒数
  logStartTime = -videoLogicalTime;

  // 例: videoStartTimeStr = "0:30:00" (1800秒) の場合
  logStartTime = -1800;
  ```

- **使用箇所**:
  - シークバー位置計算: `currentTime - logStartTime`
  - ログ時間 → 動画時間変換
  - 動画時間 → ログ時間変換

### `videoStartTimeStr` (文字列)

- **意味**: 動画の開始位置に対応する論理時間（シークバー上の時間）
- **例**: `"0:30:00"` = 動画開始がシークバー30分の位置
- **計算式**: なし（ユーザー入力）
- **パース**:
  ```javascript
  // useTimeSync.js Line 29-36
  const parts = videoStartTimeStr.split(':').map(Number);
  videoLogicalTime = parts[0] * 3600 + parts[1] * 60 + parts[2];
  ```
- **設定箇所**: 同期設定UI
- **使用箇所**: `useTimeSync.js` で `logStartTime` 計算の基準

### `startTimeStr` (文字列)

- **意味**: ログの開始時刻（絶対時刻の時刻部分）
- **例**: `"16:53:44"`
- **計算式**: なし（ユーザー入力 または 最初のコメントから自動取得）
- **使用箇所**: `useTimeSync.js` で `logRefTime` 計算

### `startDateStr` (文字列)

- **意味**: ログの開始日付（絶対時刻の日付部分）
- **例**: `"2025-12-21"`
- **計算式**: なし（ユーザー入力 または 最初のコメントから自動取得）
- **使用箇所**: `useTimeSync.js` で `logRefTime` 計算

### `logRefTime` (ミリ秒)

- **定義**: `useTimeSync.js` 内のローカル変数
- **意味**: ログの基準時刻（time=0 に対応する絶対時刻）
- **単位**: ミリ秒 (ms)
- **計算式**:

  ```javascript
  // useTimeSync.js Line 42-67
  // デフォルト: 最初の絶対時刻コメントの rawTime
  logRefTime = firstAbsoluteComment.rawTime;

  // startDateStr/startTimeStr が設定されている場合:
  const refDate = new Date(firstAbsoluteComment.rawTime);
  refDate.setFullYear(year, month - 1, day); // startDateStr から
  refDate.setHours(h, m, s, 0); // startTimeStr から
  logRefTime = refDate.getTime();
  ```

- **使用箇所**: コメントの `time` 計算

---

## 4. CM関連の時間変数

### `logStart` / `logEnd` (秒)

- **意味**: CM区間の開始・終了位置（ログ上の相対時刻）
- **単位**: 秒
- **計算式**:

  ```javascript
  // useCMSystem.js addCmRangeSmart()
  // 動画時間モードの場合:
  logStart = videoTimeToLogTime(parseTimeStr(startInput));
  logEnd = videoTimeToLogTime(parseTimeStr(endInput));

  // ログ時間モードの場合:
  logStart = parseDateTimeInput(startDateInput, startInput, startDateStr);
  logEnd = parseDateTimeInput(endDateInput, endInput, startDateStr);
  ```

- **設定箇所**: `useCMSystem.js` の `addCmRangeSmart` / `updateCmRange`
- **使用箇所**:
  - CM待機判定
  - CM区間表示（シークバー上）

### `videoStart` (秒)

- **意味**: CM区間の開始位置（動画上の再生時刻）
- **単位**: 秒
- **計算式**:

  ```javascript
  // useCMSystem.js recalculateCmVideoTimes()
  videoStart = logStart - accumulatedCmDuration - logStartTime;

  // accumulatedCmDuration = この CM より前の全 CM の合計時間
  ```

- **使用箇所**: CM衝突検出、シークバー上のCMマーカー表示

### `accumulatedCmDuration` (秒)

- **意味**: 指定時点より前に完了したCM区間の累積時間
- **単位**: 秒
- **計算式**:
  ```javascript
  // useCMSystem.js logTimeToVideoTime() 内で計算
  let offset = 0;
  for (const range of sortedCmRanges) {
    if (logTime >= range.logEnd) {
      offset += range.logEnd - range.logStart;
    }
  }
  accumulatedCmDuration = offset;
  ```
- **使用箇所**: 時間変換関数内

### `totalWaitOffset` (秒)

- **意味**: 完了したCM区間の累積待機時間（State として保持）
- **単位**: 秒
- **計算式**:
  ```javascript
  // useDanmakuPlayer.js
  totalWaitOffset = cmRanges
    .filter((r) => r.logEnd <= currentTime)
    .reduce((acc, r) => acc + (r.logEnd - r.logStart), 0);
  ```
- **使用箇所**: 動画時間 → ログ時間変換

### `currentCmWaitTime` (秒)

- **意味**: 現在のCM待機で経過した時間
- **単位**: 秒
- **計算式**:
  ```javascript
  // useDanmakuPlayer.js frameLoop
  currentCmWaitTime = accumulatedWaitTime + (performance.now() - waitStartTime) / 1000;
  ```
- **使用箇所**: CM待機オーバーレイの進捗表示

---

## 5. 時間変換関数

### `logTimeToVideoTime(logTime)` → `{ videoTime, inCmRange, cmRange }`

- **定義**: `useCMSystem.js` Line 131-164
- **意味**: ログ上の時刻 → 動画上の再生時刻
- **計算式**:

  ```javascript
  // CM区間内の場合:
  inCmRange = true;
  videoTime = range.videoStart; // CM開始位置で固定

  // CM区間外の場合:
  let offset = 0;
  for (const range of sortedRanges) {
    if (logTime >= range.logEnd) {
      offset += range.logEnd - range.logStart;
    }
  }
  videoTime = logTime - offset - logStartTime;
  ```

- **使用箇所**: シーク実行時、CM終了後の動画同期

### `videoTimeToLogTime(videoTime)` → `logTime`

- **定義**: `useCMSystem.js` Line 166-183
- **意味**: 動画上の再生時刻 → ログ上の時刻
- **計算式**:
  ```javascript
  let offset = 0;
  for (const range of sortedRanges) {
    const videoStart = range.logStart - offset - logStartTime;
    if (videoTime >= videoStart) {
      offset += range.logEnd - range.logStart;
    }
  }
  logTime = videoTime + offset + logStartTime;
  ```
- **使用箇所**: 再生ループでのフレーム処理

### `logicalTimeToLogTime(logicalTime)` → `logTime`

- **定義**: `useCMSystem.js` Line 185-201
- **意味**: シークバー時間（論理時間）→ ログ上の時刻
- **計算式**:
  ```javascript
  logTime = logicalTime + logStartTime;
  ```
- **使用箇所**: シークバー操作

---

## 6. 派生計算

### シークバー上の現在位置（秒）

```javascript
seekbarPosition = currentTime - logStartTime;
```

### シークバー上の現在位置（%）

```javascript
seekbarPercent = ((currentTime - logStartTime) / totalDuration) * 100;
```

### 動画の総時間（論理時間）

```javascript
// useCMSystem.js getTotalDuration
totalDuration = player.duration + Σ(cmRange.logEnd - cmRange.logStart);
```

### コメントが表示されるタイミング

```javascript
// comment.time <= currentTime の時に表示
if (comment.time <= currentTime) {
  showComment(comment);
}
```

---

## 7. 時間の流れ図

```
[動画ファイル]                    [ログファイル]
     │                                │
     ▼                                ▼
video.currentTime ───────────────► rawTime (Unix ms)
     │                                │
     │ videoTimeToLogTime()           │ useTimeSync.js
     │                                │ time = (rawTime - logRefTime) / 1000
     │                                ▼
     │                           time (相対秒)
     │                                │
     │ ◄─────────────────────────────┘
     │    currentTime = videoTimeToLogTime(video.currentTime)
     │
     ▼
シークバー表示 = currentTime - logStartTime
```

---

## 8. 変数一覧表

| 変数名            | 単位 | 意味                   | 計算式                                  |
| ----------------- | ---- | ---------------------- | --------------------------------------- |
| `rawTime`         | ms   | 絶対時刻 (Unix)        | ログから直接取得                        |
| `time`            | 秒   | ログ開始からの相対秒数 | `(rawTime - logRefTime) / 1000`         |
| `currentTime`     | 秒   | 現在のログ上位置       | `videoTimeToLogTime(video.currentTime)` |
| `logStartTime`      | 秒   | 動画0秒=ログX秒        | `-videoLogicalTime`                     |
| `videoTime`       | 秒   | 動画上の再生位置       | `logTime - offset - logStartTime`         |
| `logStart/logEnd` | 秒   | CM区間(ログ上)         | ユーザー入力から計算                    |
| `videoStart`      | 秒   | CM区間開始(動画上)     | `logStart - accCmDur - logStartTime`      |
| `totalWaitOffset` | 秒   | 累積CM待機時間         | `Σ(cmRange.duration)`                   |
| `displayTime`     | 秒   | 表示用現在時刻         | = `currentTime`                         |
| `logRefTime`      | ms   | ログ基準時刻           | 最初のコメントの `rawTime`              |
| `seekbarPosition` | 秒   | シークバー位置         | `currentTime - logStartTime`              |

---

## 9. よくある混乱ポイント

### Q1: `currentTime` は「論理時間」ではないの？

A: `.cursorrules` の定義では「論理時間 = 動画時間 + CM時間」ですが、コード上の `currentTime` は実際には **ログ時間**（ログ開始からの相対秒数）を保持しています。変数名は `currentTime` に統一されています。

### Q2: シークバー上の時間はどう計算される？

A: `currentTime - logStartTime` で計算されます。これが動画ファイル上の再生位置と一致します（CMがない場合）。

### Q3: コメントの `.time` と `.rawTime` の違いは？

A:

- `.rawTime`: 絶対時刻（2025年12月21日16:53:44 = 1766303624613 ms）
- `.time`: 相対時刻（ログ開始から82.5秒）

弾幕表示には `.time` を使い、日時取得には `.rawTime` を使います。

### Q4: CM区間の時間計算はなぜ複雑？

A: CM区間は「ログ時間は進むが動画時間は止まる」という挙動をするため、変換時に累積CM時間を考慮する必要があります。

---

## 10. 関連ファイル

- `src/hooks/useDanmakuPlayer.js` - メイン再生ループ、currentTime管理
- `src/hooks/useCMSystem.js` - CM管理、時間変換関数
- `src/hooks/useTimeSync.js` - 同期設定、time計算
- `src/hooks/useLogSystem.js` - ログファイル管理
- `src/utils/logParser.js` - ファイルパース、rawTime設定
