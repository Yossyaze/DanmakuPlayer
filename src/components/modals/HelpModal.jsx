import {
  ArrowDown as ArrowDownIcon,
  Ban as BanIcon,
  BookOpen,
  CheckSquare,
  Download,
  FileText,
  FileVideo,
  Info,
  Keyboard,
  Menu,
  MessageSquare as MessageSquareIcon,
  MonitorPlay,
  MousePointerClick,
  Puzzle,
  Settings,
  Sidebar,
  Sliders,
  Sparkles,
  Trophy as TrophyIcon,
  Tv,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { Z_INDEX } from '../../constants/zIndex';

const HelpModal = ({ isOpen, onClose, onStartTutorial }) => {
  const [activeTab, setActiveTab] = useState('basic');

  if (!isOpen) return null;

  const tabs = [
    { id: 'basic', label: '基本操作', icon: Info },
    { id: 'features', label: '機能紹介', icon: Sparkles },
    { id: 'settings', label: '設定ガイド', icon: Sliders },
    { id: 'shortcuts', label: 'ショートカット', icon: Keyboard },
    { id: 'extensions', label: '拡張機能', icon: Puzzle },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX.modal }}
      onClick={onClose}
    >
      <div
        className="bg-gray-800 w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700 bg-gray-900/50">
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
        <div className="flex shrink-0 border-b border-gray-700 bg-gray-900/30 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 h-12 text-base font-bold transition-colors relative whitespace-nowrap ${
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
              <div className="bg-linear-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 p-6 rounded-xl flex items-center justify-between">
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

          {activeTab === 'features' && (
            <div className="space-y-8 animate-fade-in">
              <FeatureItem
                title="右クリックメニュー (コンテキストメニュー)"
                icon={<MousePointerClick size={24} />}
                desc={
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>
                      <b>この位置へシーク:</b> 選択したコメントの時間へ動画を移動します。
                    </li>
                    <li>
                      <b>NGに追加:</b> 投稿者のIDやコメント本文をNGリストに追加します。
                    </li>
                    <li>
                      <b>コピー:</b> コメントの内容や投稿時間をコピーします。
                    </li>
                  </ul>
                }
              />
              <FeatureItem
                title="End Card (次回予告)"
                icon={<Tv size={24} />}
                desc="再生終了時、自動的に次の動画や関連情報のプレビューを表示します。サイドバーの設定パネルから表示時間や内容をカスタマイズできます。"
              />
              <FeatureItem
                title="NG機能"
                icon={<BanIcon size={24} />}
                desc="特定のIDや単語を含むコメントを非表示にできます。サイドバーの「NG」タブから設定可能です。正規表現を使用した高度なフィルタリングもサポートしています。"
              />
              <FeatureItem
                title="オートスクロール"
                icon={<ArrowDownIcon size={24} />}
                desc="動画の再生に合わせて、サイドバーのコメントリストを自動的にスクロールします。手動でスクロールリストを操作すると一時的に解除され、右下の矢印ボタンで再開できます。"
              />
              <FeatureItem
                title="AA (アスキーアート) 自動検出"
                icon={<MessageSquareIcon size={24} />}
                desc="コメント内のアスキーアートを自動検出し、崩れないように最適なフォントとサイズで表示します。「設定」パネルから検出モード（自動/手動/OFF）を切り替え可能です。"
              />
              <FeatureItem
                title="???モード"
                icon={<TrophyIcon size={24} />}
                desc="特定の条件を満たすと開放される隠し機能です。????「勘ぐれ、お前」"
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8 animate-fade-in">
              <section>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Sidebar size={20} className="text-purple-400" />
                  サイドバー設定 (設定パネル)
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                    <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                      <FileText size={16} className="text-blue-400" />
                      ログファイル管理
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-2">
                      <li>
                        <b>ドラッグ＆ドロップ:</b>{' '}
                        複数のログファイルをサイドバー上部にドロップして追加できます。
                      </li>
                      <li>
                        <b>時間調整 (Offset):</b>{' '}
                        各ログの開始時間を個別に調整し、動画との同期ズレを修正できます。
                      </li>
                      <li>
                        <b>日付設定:</b>{' '}
                        コメントの日時と動画の再生時間を合わせるための基準日時を設定できます。
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                    <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                      <CheckSquare size={16} className="text-green-400" />
                      表示オプション
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-2">
                      <li>
                        <b>ツリー表示:</b>{' '}
                        アンカー（&gt;&gt;1など）付きのコメントをスレッド形式で階層表示します。
                      </li>
                      <li>
                        <b>スレッドタイトル表示:</b>{' '}
                        ログファイルに含まれるスレッドタイトルをコメント一覧に表示します。
                      </li>
                      <li>
                        <b>画像表示:</b>{' '}
                        コメントに含まれる画像URLをサムネイルとして表示するか設定できます。
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                    <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                      <Download size={16} className="text-yellow-400" />
                      エクスポート (プロジェクト保存)
                    </h4>
                    <p className="text-sm text-gray-400">
                      読み込んだログ、動画パス、設定（NG、同期情報など）をまとめて1つのJSONファイルとして保存します。
                      <br />
                      後でファイルを読み込むだけで、再生状態を完全に復元できます。
                      <br />
                      <span className="text-xs opacity-70">
                        ショートカット: Ctrl + S (上書き保存)
                      </span>
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Settings size={20} className="text-blue-400" />
                  弾幕設定
                </h3>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                  <p className="mb-4 text-sm text-gray-400">
                    ヘッダーの歯車アイコン横の弾幕ボタン、または{' '}
                    <kbd className="bg-gray-800 px-1 rounded">D</kbd>{' '}
                    キー長押しで詳細設定を開けます。
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingItem
                      label="Duration (流れる時間)"
                      desc="弾幕が画面を横切るスピードを調整します。数値が小さいほど速くなります。"
                    />
                    <SettingItem
                      label="フォントサイズ"
                      desc="弾幕の文字サイズを調整します。AAモード時は自動調整されます。"
                    />
                    <SettingItem
                      label="不透明度"
                      desc="弾幕の透明度を設定します。動画が見えにくい場合は下げてください。"
                    />
                    <SettingItem
                      label="表示領域"
                      desc="画面の上部何％に弾幕を表示するか制限できます（例：上半分だけなど）。"
                    />
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
        <div className="px-6 py-3 border-t border-gray-700 bg-gray-900/50 flex justify-end">
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

const SettingItem = ({ label, desc }) => (
  <div className="p-3 bg-gray-900/40 rounded border border-gray-700/50">
    <h4 className="font-bold text-white text-sm mb-1">{label}</h4>
    <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
  </div>
);

export default HelpModal;
