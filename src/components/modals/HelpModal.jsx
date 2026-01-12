import {
  BookOpen,
  Download,
  FileVideo,
  Info,
  Keyboard,
  MessageSquare,
  MonitorPlay,
  Puzzle,
  Sidebar,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

const HelpModal = ({ isOpen, onClose, onStartTutorial }) => {
  const [activeTab, setActiveTab] = useState('basic');

  if (!isOpen) return null;

  const tabs = [
    { id: 'basic', label: '基本操作', icon: Info },
    { id: 'shortcuts', label: 'ショートカット', icon: Keyboard },
    { id: 'features', label: '機能紹介', icon: BookOpen },
    { id: 'extensions', label: '拡張機能', icon: Puzzle },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 w-full max-w-4xl max-h-[80vh] rounded-xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Info className="text-blue-400" />
            ヘルプ・チュートリアル
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-900/30">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-400 bg-blue-900/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-gray-300">
          {activeTab === 'basic' && (
            <div className="space-y-8 animate-fade-in">
              {/* Tutorial Banner */}
              <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 p-6 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">チュートリアルを再生</h3>
                  <p className="text-sm text-gray-300">
                    基本的な使い方をステップバイステップで案内します。
                  </p>
                </div>
                <button
                  onClick={() => {
                    onStartTutorial();
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  <MonitorPlay size={18} />
                  開始する
                </button>
              </div>
              <section>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FileVideo size={20} className="text-green-400" />
                  動画を読み込む
                </h3>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                  <p className="mb-2">以下の方法で動画を読み込むことができます：</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-2">
                    <li>画面中央の「動画ファイルを選択」ボタンをクリック</li>
                    <li>
                      ヘッダー右上の <FileVideo size={14} className="inline text-blue-400" />{' '}
                      アイコンをクリック
                    </li>
                    <li>動画ファイルをウィンドウにドラッグ＆ドロップ</li>
                    <li>YouTubeなどのURLを入力してストリーミング再生</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Sidebar size={20} className="text-purple-400" />
                  サイドバーの活用
                </h3>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                  <p className="mb-2">画面右側のサイドバーでコメント（ログ）を管理できます。</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-3 bg-black/20 rounded">
                      <h4 className="font-bold text-sm text-white mb-1">ログファイルの読み込み</h4>
                      <p className="text-xs text-gray-500">
                        xml, json,
                        txtなどの形式に対応しています。サイドバー上部にドラッグ＆ドロップして追加できます。
                      </p>
                    </div>
                    <div className="p-3 bg-black/20 rounded">
                      <h4 className="font-bold text-sm text-white mb-1">同期設定</h4>
                      <p className="text-xs text-gray-500">
                        ログの開始時間を調整したり、特定の位置に同期させたりすることができます。
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MonitorPlay size={20} className="text-orange-400" />
                  表示モード
                </h3>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-600/20 text-blue-400 rounded">
                      <MonitorPlay size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">動画モード</h4>
                      <p className="text-xs text-gray-400">
                        動画を見ながら流れるコメントを楽しむ通常のモードです。
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-600/20 text-purple-400 rounded">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">ログ読みモード</h4>
                      <p className="text-xs text-gray-400">
                        動画を非表示にし、ログを読むことに特化したモードです。過去のログをじっくり読むのに最適です。
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-white mb-6">キーボードショートカット一覧</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ShortcutItem k="Space" desc="再生 / 一時停止" />
                <ShortcutItem k="← / →" desc="5秒戻る / 5秒進む" />
                <ShortcutItem k="L" desc="ログ読みモードの切り替え (Log Mode)" />
                <ShortcutItem k="D" desc="弾幕表示のON/OFF (Danmaku)" />
                <ShortcutItem k="S" desc="サイドバー表示のON/OFF (Sidebar)" />
                <ShortcutItem k="Ctrl + S" desc="プロジェクトの上書き保存" />
                <ShortcutItem k="Ctrl + R" desc="アプリの再読み込み" />
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-8 animate-fade-in">
              <FeatureItem
                title="NG機能"
                icon={<BanIcon />}
                desc="特定のIDや単語を含むコメントを非表示にできます。サイドバーの「NG」タブから設定可能です。"
              />
              <FeatureItem
                title="オートスクロール"
                icon={<ArrowDownIcon />}
                desc="動画の再生に合わせて、サイドバーのコメントリストを自動的にスクロールします。手動でスクロールすると一時的に解除されます。"
              />
              <FeatureItem
                title="???モード"
                icon={<TrophyIcon />}
                desc="特定の条件を満たすと開放される隠し機能です。????「勘ぐれ、お前」"
              />
              <FeatureItem
                title="AA (アスキーアート) 自動検出"
                icon={<MessageSquareIcon />}
                desc="コメント内のアスキーアートを自動検出し、崩れないようにフォントを調整して表示します。"
              />
            </div>
          )}

          {activeTab === 'extensions' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6 text-center">
                <Puzzle size={48} className="mx-auto text-blue-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">DanmakuPlayer Helper</h3>
                <p className="text-gray-300 mb-6 max-w-lg mx-auto">
                  5chなどのCORS制限のあるサイトからログを取得したり、
                  Web上の動画を直接DanmakuPlayerで開くことができる拡張機能です。
                </p>
                <a
                  href="./extension.zip"
                  download="DanmakuPlayer_Helper.zip"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors shadow-lg hover:shadow-blue-500/20"
                >
                  <Download size={20} />
                  拡張機能をダウンロード (ZIP)
                </a>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MonitorPlay size={20} className="text-green-400" />
                  インストール方法
                </h3>
                <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                    <ol className="list-decimal list-inside space-y-4 text-gray-300">
                      <li className="pl-2">
                        <span className="font-bold text-white">ダウンロード・解凍:</span>{' '}
                        上のボタンからZIPファイルをダウンロードし、適当な場所に解凍してください。
                      </li>
                      <li className="pl-2">
                        <span className="font-bold text-white">拡張機能管理画面を開く:</span>{' '}
                        Chromeのアドレスバーに{' '}
                        <code className="bg-gray-800 px-2 py-0.5 rounded text-blue-300 select-all">
                          chrome://extensions
                        </code>{' '}
                        と入力して開きます。
                      </li>
                      <li className="pl-2">
                        <span className="font-bold text-white">デベロッパーモードをON:</span>{' '}
                        画面右上の「デベロッパーモード」スイッチをONにします。
                      </li>
                      <li className="pl-2">
                        <span className="font-bold text-white">
                          パッケージ化されていない拡張機能を読み込む:
                        </span>{' '}
                        左上のボタンをクリックし、手順1で解凍したフォルダ（
                        <code className="bg-gray-800 px-2 py-0.5 rounded text-yellow-300">
                          chrome_extension
                        </code>
                        フォルダ）を選択します。
                      </li>
                    </ol>
                  </div>
                  <div className="p-4 bg-gray-900/80 text-sm text-gray-400">
                    <p className="flex items-center gap-2">
                      <Info size={16} className="text-blue-400 shrink-0" />
                      インストール後、ツールバーのアイコンから「DanmakuPlayerで開く」機能などが使用可能になります。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const ShortcutItem = ({ k, desc }) => (
  <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-700/50">
    <span className="text-gray-300 text-sm">{desc}</span>
    <kbd className="px-2 py-1 bg-gray-700 text-gray-200 rounded text-xs font-mono font-bold border border-gray-600 min-w-8 text-center">
      {k}
    </kbd>
  </div>
);

const FeatureItem = ({ title, icon, desc }) => (
  <div className="flex items-start gap-4 p-4 bg-gray-900/30 rounded-lg border border-gray-700/30">
    <div className="p-3 bg-gray-800 rounded-lg text-blue-400 shrink-0">{icon}</div>
    <div>
      <h4 className="font-bold text-white text-lg mb-2">{title}</h4>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  </div>
);

// Lucide Icons Wrappers for uniformity
const BanIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
);
const ArrowDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8" />
    <path d="m8 12 4 4 4-4" />
  </svg>
);
const TrophyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);
const MessageSquareIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default HelpModal;
