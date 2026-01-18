/**
 * z-index Management
 *
 * アプリケーション全体の z-index を一元管理します。
 * マジックナンバーを避け、この定数を使用してください。
 */
export const Z_INDEX = {
  auto: 'auto',
  base: 0, // 基本コンテンツ

  // ラウンドダン幕 (内部レイヤー)
  danmakuRound2: 0, // 混雑時 (奥)
  danmakuRound1: 10, // 通常 (手前)

  // レベル 10-90: コンテンツレイヤー
  endCard: 90, // 動画より上、弾幕より下

  // レベル 100: 動画・弾幕エリア
  danmakuLayer: 100, // 弾幕表示エリア

  // レベル 200: 基本UI・コントロール
  uiBase: 200,
  touchArea: 200, // モバイルタッチ領域
  resizer: 205, // サイドバーリサイザー
  controls: 210, // 各種ボタン・コントロールバー (弾幕より上)

  // レベル 300: パネル・メニュー (コントロールより上)
  panelContainer: 300, // サイドバー、設定パネル
  menu: 310, // サイドメニュー

  // レベル 400: フローティング要素・ポップアップ
  floating: 400, // 検索結果、簡易オーバーレイ
  popupStack: 450, // 累積ポップアップ (450, 460, 470...)

  // レベル 500: コンテキストメニュー
  contextMenuBackdrop: 500,
  contextMenu: 510,

  // レベル 600: モーダル・ダイアログ
  modalBackdrop: 600,
  modal: 610, // ExportModal, UrlInputModal, HelpModal

  // レベル 700: 高優先度通知・オーバーレイ
  highPriority: 700, // 通知、重要な警告

  // レベル 9000+: 最前面・特殊モード
  imageViewer: 9000,
  colorPicker: 9100,
  fullScreenModal: 9200,
  tutorialHighlight: 9500,

  // マックス
  confirmModal: 9999, // 最終確認
  max: 10000,
};

export default Z_INDEX;
