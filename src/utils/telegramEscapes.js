// Centralized Telegram escaping helpers
// Provides functions to safely escape user-provided content for
// MarkdownV2 and HTML parse modes.

function escapeMdV2(text) {
  if (text === undefined || text === null) return '';
  return String(text).replace(/([_\*\[\]\(\)~`>#+\-=|{}\.\\!])/g, "\\$1");
}

function escapeHtml(text) {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeArray(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.map(a => escapeMdV2(a)).join(', ');
}

module.exports = {
  escapeMdV2,
  escapeHtml,
  escapeArray,
};
