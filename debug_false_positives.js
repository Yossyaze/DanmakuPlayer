import { ABE_NAME_KEYWORDS } from './src/utils/abeMode.js';
import { ABE_PATTERNS, ALL_ABE_KEYWORDS } from './src/utils/abeQuotesList.js';

const allFixed = [...new Set([...ABE_NAME_KEYWORDS, ...ALL_ABE_KEYWORDS])];
const expanded = allFixed.flatMap((k) => {
  if (!k) return [];
  const parts = k
    .split(/[ \u3000、。！？!?,・]/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  return [k, ...parts];
});

const testStrings = ['おまたせ', '杏子の太ももすき'];

console.log('--- Debugging False Positives ---');
testStrings.forEach((s) => {
  console.log(`Checking: "${s}"`);
  const matchesFixed = expanded.filter((k) => s.toLowerCase().includes(k.toLowerCase()));
  const matchesPatterns = ABE_PATTERNS.filter((p) => new RegExp(p, 'i').test(s));

  if (matchesFixed.length > 0) {
    console.log(`  Matched Fixed Keywords: ${JSON.stringify(matchesFixed)}`);
  } else {
    console.log(`  No fixed keyword matches.`);
  }

  if (matchesPatterns.length > 0) {
    console.log(`  Matched Patterns: ${JSON.stringify(matchesPatterns)}`);
  } else {
    console.log(`  No pattern matches.`);
  }
});
