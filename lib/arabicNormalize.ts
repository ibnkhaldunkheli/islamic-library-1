// Mirrors supabase/schema.sql's normalize_arabic() SQL function exactly —
// keep these two in sync. Used to normalize the visitor's search query the
// same way the stored `search_normalized` columns are normalized, so
// "سترة" and "سُتْرَة" match regardless of which one the visitor types.
// Non-Arabic text (Pashto/Urdu/English) passes through unchanged.
export function normalizeArabic(input: string): string {
  return input
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0649/g, '\u064A')
    .replace(/\s+/g, ' ')
    .trim();
}
