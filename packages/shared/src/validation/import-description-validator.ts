/**
 * Detects price/budget/currency mentions in an Import Request's free-text
 * description (BRD Rule 3: sellers compete blind on price, so a customer
 * hinting a target price in the request itself undermines that — price
 * negotiation belongs in seller offers, not here). Deterministic keyword +
 * phrase matching, not NLP — good enough to catch the common phrasings
 * without flagging ordinary product numbers (sizes, quantities, storage
 * capacities, etc). See `isImportDescriptionAllowed`'s own doc comment for
 * the exact rules, and its test file for the cases this is tuned against.
 */

// Matched as substrings of the *normalized* text on purpose: Arabic attaches
// prepositions/articles directly to the word (بسعر = ب + سعر, السعر = ال +
// سعر), so a whole-word match would miss the most common real phrasings.
const ARABIC_KEYWORDS = [
  "سعر",
  "اسعار",
  "فلوس",
  "مبلغ",
  "ميزانية",
  "ميزانيتي",
  "جنيه",
  "جنية",
  "دولار",
  "ريال",
  "درهم",
];

// English has real word boundaries, so these are matched with \b — a plain
// substring match would flag e.g. "costume" through "cost".
const ENGLISH_KEYWORDS = ["price", "cost", "budget", "money", "amount", "egp", "usd", "sar", "aed"];

// Bare numeric ranges/budget-range phrasing read as a price hint even
// without one of the keywords above sitting right next to them.
const RANGE_PATTERNS = [
  /من\s*\d+\s*(?:الى|-)\s*\d+/, // "من 1000 الى 2000" (إلى normalizes to الى below)
  /في\s*حدود\s*\d+/, // "في حدود 5000"
];

// Arabic tashkeel/diacritics block (U+064B-U+065F) plus the standalone
// superscript alef (U+0670) — stripped before matching so e.g. "سِعْر" still
// matches "سعر".
const ARABIC_DIACRITICS = /[ً-ٰٟ]/g;

function normalizeArabic(text: string): string {
  return text
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns false if `description` looks like it's stating a price, budget,
 * or currency amount — true otherwise (including for an empty description).
 * A plain number on its own (sizes, quantities, "iPhone 15", "RAM 16GB")
 * never trips this; only a number paired with a price/budget/currency word
 * or an explicit range phrase ("من 1000 الى 2000", "في حدود 5000") does.
 */
export function isImportDescriptionAllowed(description: string): boolean {
  if (!description.trim()) return true;

  const normalized = normalizeArabic(description.toLowerCase());
  // Catches keywords deliberately spaced out to dodge matching, e.g. "س ع ر".
  const squeezed = normalized.replace(/\s+/g, "");

  const hasArabicKeyword = ARABIC_KEYWORDS.some((word) => {
    const normalizedWord = normalizeArabic(word);
    return normalized.includes(normalizedWord) || squeezed.includes(normalizedWord);
  });
  if (hasArabicKeyword) return false;

  const hasEnglishKeyword = ENGLISH_KEYWORDS.some((word) =>
    new RegExp(`\\b${word}\\b`, "i").test(normalized),
  );
  if (hasEnglishKeyword) return false;

  return !RANGE_PATTERNS.some((pattern) => pattern.test(normalized));
}
