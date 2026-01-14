import { Download, ExternalLink } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';

const EXTENSION_DOWNLOAD_URL = './extension.zip';

const rawSteps = [
  {
    target: 'body',
    placement: 'center',
    title: 'DanmakuPlayerへようこそ！',
    content: (
      <div>
        <p>このアプリはニコニコ動画のような弾幕体験を提供するプレイヤーです。</p>
        <p>基本的な使い方をご案内します。</p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '#main-video-layer',
    content: 'ここに動画ファイルやログファイル(.xml/.json)をドラッグ＆ドロップして読み込みます。',
    placement: 'bottom',
    disableBeacon: true,
    spotlightPadding: 0,
  },
  {
    target: '#header-video-actions',
    content: '動画ファイルはここから開くこともできます。隣のボタンでURLから開くことも可能です。',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#header-project-actions',
    content: 'プロジェクトの保存、読み込み、設定のリセットはここで行います。',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#btn-header-danmaku-toggle',
    content:
      '弾幕の表示/非表示をここで切り替えられます。キーボードショートカット「D」でも操作可能です。',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#btn-header-sidebar-toggle',
    content:
      'サイドバーの表示/非表示を切り替えます。キーボードショートカット「S」でも操作可能です。',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#header-view-mode-switch',
    content: (
      <div>
        <p className="mb-2">表示モードを切り替えられます：</p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>
            <strong>動画モード</strong>：動画と弾幕を表示
          </li>
          <li>
            <strong>ログ読みモード</strong>：コメントログのみを表示（動画なし）
          </li>
        </ul>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#sidebar-comment-list',
    content: '読み込んだコメントやログファイルの一覧はここに表示されます。',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '#video-controls-bar',
    content: '再生、一時停止、シークなどの動画操作はここで行います。',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '#btn-danmaku-toggle',
    content: '弾幕の表示/非表示を切り替えられます。',
    disableBeacon: true,
  },
  {
    target: '#btn-settings',
    content:
      '弾幕の透明度やサイズなど、細かい設定はこちらから行えます。クリックして開いてみましょう。',
    disableBeacon: true,
    styles: {
      buttonNext: {
        display: 'none',
      },
    },
  },
  {
    target: '#danmaku-settings-popover',
    content: (
      <div>
        <p className="mb-2">ここで弾幕の表示設定ができます：</p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>
            <strong>表示時間</strong>：弾幕が画面に表示される秒数
          </li>
          <li>
            <strong>文字サイズ</strong>：弾幕のフォントサイズ（px）
          </li>
          <li>
            <strong>不透明度</strong>：弾幕の透明度
          </li>
          <li>
            <strong>表示範囲</strong>：画面上部からの表示エリア
          </li>
          <li>
            <strong>画像表示</strong>：画像付きコメントの表示方法
          </li>
        </ul>
      </div>
    ),
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '#sidebar-settings',
    content: 'ここが設定パネルです。ログファイルの管理、表示設定、同期設定などを行えます。',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '#sidebar-tabs',
    content: 'ここで「設定」「NG」のタブを切り替えて、詳細な設定やフィルタリングを行えます。',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '#btn-header-help',
    content: '操作方法がわからなくなった時は、ここからヘルプを開けます。',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    title: '拡張機能のご案内',
    content: (
      <div>
        <p className="mb-2">
          <strong>完全な機能を使うにはブラウザ拡張機能が必要です！</strong>
        </p>
        <p className="mb-2 text-sm">
          拡張機能をインストールすると、以下の機能が使えるようになります：
        </p>
        <ul className="list-disc list-inside text-sm space-y-1 mb-3">
          <li>Web上の動画を自動検出して再生</li>
          <li>外部サイトのログを直接読み込み</li>
          <li>再生中の動画をワンクリックで開く</li>
        </ul>
        <div className="mt-3 text-center">
          <a
            href={EXTENSION_DOWNLOAD_URL}
            download="DanmakuPlayerHelper.zip"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors text-sm"
            onClick={(e) => {
              // Joyrideのイベント伝播防止
              e.stopPropagation();
            }}
          >
            <span>拡張機能をダウンロード</span>
            <Download size={16} />
          </a>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          ※ ダウンロードしたZipを解凍し、Chrome拡張機能管理画面で
          <br />
          「パッケージ化されていない拡張機能を読み込む」から
          <br />
          フォルダを選択してインストールしてください
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    title: 'チュートリアル完了',
    content: (
      <div>
        <p className="mb-2">これで基本操作の説明は終わりです。</p>
        <p>最低なコメントたちと動画を楽しもう！</p>
      </div>
    ),
    disableBeacon: true,
  },
];

const Tutorial = ({ run, onFinish, onStepChange, advanceStep }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // 外部からのステップ進行トリガー（例：設定ボタンクリック時）
  useEffect(() => {
    if (advanceStep && isRunning) {
      setStepIndex((prev) => prev + 1);
    }
  }, [advanceStep, isRunning]);

  // ステップ数を含めたタイトルを生成
  const steps = React.useMemo(
    () =>
      rawSteps.map((step, index) => ({
        ...step,
        title: step.title
          ? `${step.title} (${index + 1}/${rawSteps.length})`
          : `ステップ ${index + 1}/${rawSteps.length}`,
      })),
    []
  );

  // run プロパティと内部状態を同期
  useEffect(() => {
    setIsRunning(run);
  }, [run]);

  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setIsRunning(false);
      setStepIndex(0);
      if (onFinish) onFinish();
    } else if (type === EVENTS.STEP_AFTER) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      // 最後のステップで「次へ」を押した場合は終了
      if (nextIndex >= rawSteps.length) {
        setIsRunning(false);
        setStepIndex(0);
        if (onFinish) onFinish();
      } else if (nextIndex >= 0) {
        // 次のステップに進む前に親に通知
        if (onStepChange) {
          onStepChange(nextIndex, rawSteps[nextIndex].target);
        }
        setStepIndex(nextIndex);
      }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + 1;
      if (nextIndex < rawSteps.length) {
        setStepIndex(nextIndex);
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      spotlightClicks={true}
      disableOverlayClose={true}
      hideCloseButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: '#1f2937',
          backgroundColor: '#1f2937',
          overlayColor: 'rgba(0, 0, 0, 0.6)',
          primaryColor: '#3b82f6',
          textColor: '#ffffff',
          zIndex: 10000,
        },
        tooltip: {
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          borderRadius: '8px',
        },
        spotlight: {
          border: '2px solid #3b82f6',
          borderRadius: '4px',
          boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3)',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
        },
        buttonBack: {
          color: '#9ca3af',
        },
      }}
      locale={{
        back: '戻る',
        close: '閉じる',
        last: '完了',
        next: '次へ',
        skip: 'スキップ',
      }}
    />
  );
};

export default Tutorial;
