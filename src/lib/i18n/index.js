import en from './messages/en';
import ru from './messages/ru';
import fil from './messages/fil';
import zh from './messages/zh';
import es from './messages/es';
import id from './messages/id';
import fr from './messages/fr';
import de from './messages/de';
import th from './messages/th';
import ar from './messages/ar';
import pt from './messages/pt';
import ja from './messages/ja';
import ko from './messages/ko';
import vi from './messages/vi';
import tr from './messages/tr';
import hi from './messages/hi';
import it from './messages/it';
import pl from './messages/pl';
import nl from './messages/nl';
import sv from './messages/sv';
import uk from './messages/uk';
import fa from './messages/fa';
import ms from './messages/ms';
import { normalizeLocale } from './locales';

// All dictionaries ship with the client bundle; a language switch is instant
// and needs no network. Unknown keys fall back to English, unknown locales to
// English, so a missing translation degrades instead of breaking a page.
const MESSAGES = {
  en,
  ru,
  fil,
  zh,
  es,
  id,
  fr,
  de,
  th,
  ar,
  pt,
  ja,
  ko,
  vi,
  tr,
  hi,
  it,
  pl,
  nl,
  sv,
  uk,
  fa,
  ms,
};

export { LOCALES, normalizeLocale, isRtl, isPublicPath } from './locales';

export function messagesFor(locale) {
  return MESSAGES[normalizeLocale(locale)] || en;
}

/**
 * `translate(dict, key, vars, fallback)` — `{name}` placeholders in message
 * strings receive `vars[name]`. `fallback` replaces the raw key when the
 * message exists nowhere (used for dynamic stat labels).
 */
export function translate(dict, key, vars, fallback) {
  let text = dict?.[key];
  if (text === undefined) text = en[key];
  if (text === undefined) {
    text = fallback !== undefined && fallback !== null ? fallback : key;
  }
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (match, name) =>
      vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : match,
    );
  }
  return text;
}
