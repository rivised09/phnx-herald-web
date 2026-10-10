// Supported interface locales, in the order the language picker lists them.
// Same set and order as the guides project so both pickers look familiar.
export const LOCALES = [
  { code: 'en', label: 'English', en: 'English' },
  { code: 'ru', label: 'Русский', en: 'Russian' },
  { code: 'fil', label: 'Filipino', en: 'Filipino' },
  { code: 'zh', label: '中文', en: 'Chinese' },
  { code: 'es', label: 'Español', en: 'Spanish' },
  { code: 'id', label: 'Indonesia', en: 'Indonesian' },
  { code: 'fr', label: 'Français', en: 'French' },
  { code: 'de', label: 'Deutsch', en: 'German' },
  { code: 'th', label: 'ไทย', en: 'Thai' },
  { code: 'ar', label: 'العربية', en: 'Arabic' },
  { code: 'pt', label: 'Português', en: 'Portuguese' },
  { code: 'ja', label: '日本語', en: 'Japanese' },
  { code: 'ko', label: '한국어', en: 'Korean' },
  { code: 'vi', label: 'Tiếng Việt', en: 'Vietnamese' },
  { code: 'tr', label: 'Türkçe', en: 'Turkish' },
  { code: 'hi', label: 'हिन्दी', en: 'Hindi' },
  { code: 'it', label: 'Italiano', en: 'Italian' },
  { code: 'pl', label: 'Polski', en: 'Polish' },
  { code: 'nl', label: 'Nederlands', en: 'Dutch' },
  { code: 'sv', label: 'Svenska', en: 'Swedish' },
  { code: 'uk', label: 'Українська', en: 'Ukrainian' },
  { code: 'fa', label: 'فارسی', en: 'Persian' },
  { code: 'ms', label: 'Melayu', en: 'Malay' },
];

// Locales written right-to-left. Only <html dir> is switched; the layout uses
// logical Tailwind spacing throughout, so mirroring needs no extra styles.
const RTL_LOCALES = new Set(['ar', 'fa']);

export function normalizeLocale(value) {
  const code = String(value || '').toLowerCase();
  return LOCALES.some((locale) => locale.code === code) ? code : 'en';
}

export function isRtl(code) {
  return RTL_LOCALES.has(code);
}

/**
 * The pages that speak the visitor's language: the homepage and the two
 * public roster detail families. Everything else is a leadership view that
 * stays English LTR.
 */
export function isPublicPath(pathname) {
  return (
    pathname === '/' ||
    pathname.startsWith('/roster/player/') ||
    pathname.startsWith('/roster/alliance/')
  );
}
