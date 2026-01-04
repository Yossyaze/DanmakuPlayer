import { ABE_NAME_KEYWORDS } from './src/utils/abeMode.js';
import { ABE_PATTERNS, ALL_ABE_KEYWORDS } from './src/utils/abeQuotesList.js';

const allFixed = [...new Set([...ABE_NAME_KEYWORDS, ...ALL_ABE_KEYWORDS])].sort(
  (a, b) => b.length - a.length
);
const escaped = allFixed.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const ABE_REGEX = new RegExp(`(${[...escaped, ...ABE_PATTERNS].join('|')})`, 'gi');

const testString = ' 18時からabemaで叛逆ほんまにあるやんけ！\nhttps://i.imgur.com/zSCzPJr.png ';

console.log('--- Debugging False Positive: abema ---');
const matches = testString.match(ABE_REGEX);

if (matches) {
  console.log(`Matched keywords: ${JSON.stringify(matches)}`);
  // 具体的にどのルールにヒットしたか特定
  matches.forEach((m) => {
    const foundFixed = allFixed.filter((k) => k.toLowerCase() === m.toLowerCase());
    const foundPatterns = ABE_PATTERNS.filter(
      (p) => new RegExp(`^${p}$`, 'i').test(m) || new RegExp(p, 'i').test(m)
    );
    console.log(`  Match "${m}":`);
    if (foundFixed.length > 0) console.log(`    Fixed: ${JSON.stringify(foundFixed)}`);
    if (foundPatterns.length > 0) console.log(`    Pattern: ${JSON.stringify(foundPatterns)}`);
  });
} else {
  console.log('No matches found in the current logic.');
}
