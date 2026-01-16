/**
 * 安倍晋三モード - ジョーク機能
 * 安倍晋三関連のキーワードや語録を虹色で強調表示する
 */
import {
  ABE_FAMOUS_QUOTES,
  ABE_NICKNAMES,
  ABE_PATTERNS,
  ABE_RELATED_QUOTES,
  FULL_ABE_QUOTES,
} from './abeQuotesList.js';

// Re-export for celebration component
export { ABE_FAMOUS_QUOTES };

// 名前関連キーワード
export const ABE_NAME_KEYWORDS = [
  '安倍晋三',
  '安倍総理',
  '安倍首相',
  '安倍',
  '晋三',
  'あべしんぞう',
  'アベ',
  'シンゾー',
  'Abe',
  'Shinzo',
  '晋さん',
  '晋',
  '山上徹也',
  '山上',
  '山神',
  '徹也',
  'ヤマガミ',
];

// すべての固定キーワードを結合
export const ALL_ABE_KEYWORDS = [
  ...ABE_NAME_KEYWORDS,
  ...ABE_FAMOUS_QUOTES,
  ...ABE_RELATED_QUOTES,
  ...ABE_NICKNAMES,
  ...FULL_ABE_QUOTES,
];

// ボイスファイルリスト
export const ABE_VOICE_FILES = [
  'abe_unlock.wav',
  'abe_voice_kudaranai.wav',
  'abe_voice_sonokinou.wav',
  'abe_voice_bakamitai.wav',
];

/**
 * ランダムに安倍関連ボイスを再生する
 */
export const playRandomAbeVoice = () => {
  const randomFile = ABE_VOICE_FILES[Math.floor(Math.random() * ABE_VOICE_FILES.length)];
  const audio = new Audio(`${import.meta.env.BASE_URL}sounds/${randomFile}`);
  audio.play().catch((e) => console.error('Failed to play Abe voice:', e));
};

/**
 * 正規表現用に特殊文字をエスケープ
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * マッチング用正規表現を構築
 * 固定キーワードは長い順にソートしてエスケープし、改変パターン（正規表現）と結合する
 */
const buildAbeRegex = () => {
  const sortedFixed = [...new Set(ALL_ABE_KEYWORDS)].sort((a, b) => b.length - a.length);
  const escaped = sortedFixed.map((k) => {
    const esc = escapeRegex(k);
    // 英数字のみのキーワードは単語境界(\b)で囲む（abema 等の誤検知防止）
    if (/^[A-Za-z0-9\s]+$/.test(k)) {
      return `\\b${esc}\\b`;
    }
    return esc;
  });
  // 巨大な正規表現を作成。ABE_PATTERNSはそのまま正規表現として扱う。
  return new RegExp(`(${[...escaped, ...ABE_PATTERNS].join('|')})`, 'gi');
};

const ABE_REGEX = buildAbeRegex();

/**
 * テキストに安倍晋三関連キーワードが含まれるかチェック
 * @param {string} text - チェックするテキスト
 * @returns {boolean} - キーワードが含まれる場合true
 */
export const containsAbeKeyword = (text) => {
  if (!text) return false;
  // exec/testはステートフルなので、matchを使用（あるいは毎回生成）
  const matches = text.match(ABE_REGEX);
  return matches !== null;
};

/**
 * テキスト内の安倍晋三関連キーワードをチェックし、含まれる場合はテキスト全体を虹色スタイルでラップ
 * React要素の配列を返す
 * @param {string} text - 処理するテキスト
 * @param {function} React - React (createElement用)
 * @returns {Array} - React要素の配列
 */
export const highlightAbeKeywords = (text, React) => {
  if (!text) return [text];

  if (containsAbeKeyword(text)) {
    return [React.createElement('span', { key: 0, className: 'abe-rainbow' }, text)];
  }

  return [text];
};

/**
 * プレーンテキスト用：キーワードが含まれる場合、テキストを絵文字と非絵文字に分割し、
 * 絵文字以外の部分にのみisAbe:trueを設定して返す
 * danmakuのテキストノード用
 * @param {string} text - 処理するテキスト
 * @returns {object} - { hasMatch: boolean, parts: Array<{text: string, isAbe: boolean}> }
 */
export const parseAbeKeywords = (text) => {
  if (!text) return { hasMatch: false, parts: [{ text: '', isAbe: false }] };

  // 安倍キーワードを含むかチェック
  if (!containsAbeKeyword(text)) {
    return { hasMatch: false, parts: [{ text: text, isAbe: false }] };
  }

  // 絵文字とそれ以外を分割する正規表現
  // Unicode Emoji範囲を広くカバー
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

  // テキストを絵文字とそれ以外に分割
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = emojiRegex.exec(text)) !== null) {
    // 絵文字の前のテキスト（虹色適用）
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isAbe: true });
    }
    // 絵文字（虹色なし）
    parts.push({ text: match[0], isAbe: false });
    lastIndex = match.index + match[0].length;
  }

  // 残りのテキスト（虹色適用）
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isAbe: true });
  }

  // partsが空の場合（絵文字のみ or 処理エラー）
  if (parts.length === 0) {
    return { hasMatch: true, parts: [{ text: text, isAbe: true }] };
  }

  return { hasMatch: true, parts };
};

/**
 * 安倍モード開放条件チェック
 * 入力テキストに「安倍」または「晋三」が含まれているか判定
 * @param {string} text
 * @returns {boolean}
 */
export const checkAbeUnlockCondition = (text) => {
  if (!text) return false;
  return text.includes('安倍') || text.includes('晋三');
};
