import React, { useEffect, useState } from "react";
import { ABE_FAMOUS_QUOTES } from "../../utils/abeMode";

// Pre-generate particle styles outside component to avoid impure function calls
const generateParticleStyles = () =>
  [...Array(30)].map(() => ({
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 2}s`,
    animationDuration: `${3 + Math.random() * 2}s`,
    background: `hsl(${Math.random() * 360}, 80%, 60%)`,
  }));

/**
 * 安倍晋三モード解放時の演出コンポーネント
 * 虹色のアニメーションとランダムな語録を表示
 */
const AbeModeUnlockCelebration = ({ isVisible, onClose }) => {
  const [randomQuote, setRandomQuote] = useState("");
  const [showContent, setShowContent] = useState(false);
  // Use useState with initializer for stable particle styles
  const [particleStyles] = useState(generateParticleStyles);

  useEffect(() => {
    if (isVisible) {
      // ランダムな語録を選択
      const quote =
        ABE_FAMOUS_QUOTES[Math.floor(Math.random() * ABE_FAMOUS_QUOTES.length)];
      setRandomQuote(quote);

      // 少し遅延してコンテンツを表示（アニメーション用）
      setTimeout(() => setShowContent(true), 100);
    } else {
      setShowContent(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* 背景のパーティクルエフェクト */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particleStyles.map((style, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-float-up"
            style={{
              ...style,
              bottom: "-10%",
            }}
          />
        ))}
      </div>

      {/* メインダイアログ */}
      <div
        className={`relative max-w-md w-[90%] bg-gray-900/95 border-2 border-transparent rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500 ${
          showContent ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
        style={{
          borderImage:
            "linear-gradient(90deg, #ff0000, #ff8000, #ffff00, #00ff00, #0080ff, #8000ff, #ff0080) 1",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 虹色のヘッダーバー */}
        <div
          className="h-2 w-full animate-rainbow-flow"
          style={{
            background:
              "linear-gradient(90deg, #ff0000, #ff8000, #ffff00, #00ff00, #0080ff, #8000ff, #ff0080, #ff0000)",
            backgroundSize: "200% 100%",
          }}
        />

        <div className="p-6 text-center">
          {/* 絵文字アニメーション */}
          <div className="text-6xl mb-4 animate-bounce">🌈</div>

          {/* タイトル */}
          <h2
            className="text-2xl font-bold mb-2 bg-clip-text text-transparent animate-rainbow-text"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #ff0000, #ff8000, #ffff00, #00ff00, #0080ff, #8000ff, #ff0080)",
              backgroundSize: "200% 100%",
            }}
          >
            隠しモード解放！
          </h2>

          <p className="text-gray-400 text-sm mb-4">
            安倍晋三モードが使えるようになりました
          </p>

          {/* ランダム語録 */}
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700">
            <p className="text-xs text-gray-500 mb-1">今日の一言:</p>
            <p
              className="text-lg font-medium bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3)",
              }}
            >
              「{randomQuote}」
            </p>
          </div>

          {/* 説明 */}
          <p className="text-xs text-gray-500 mb-4">
            弾幕設定から安倍晋三モードをONにすると
            <br />
            語録が虹色で表示されます
          </p>

          {/* 閉じるボタン */}
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background:
                "linear-gradient(90deg, #ff6b6b, #feca57, #1dd1a1, #54a0ff, #9b59b6)",
              backgroundSize: "200% 100%",
            }}
          >
            了解
          </button>
        </div>

        {/* 虹色のフッターバー */}
        <div
          className="h-2 w-full animate-rainbow-flow"
          style={{
            background:
              "linear-gradient(90deg, #ff0000, #ff8000, #ffff00, #00ff00, #0080ff, #8000ff, #ff0080, #ff0000)",
            backgroundSize: "200% 100%",
          }}
        />
      </div>
    </div>
  );
};

export default AbeModeUnlockCelebration;
