/**
 * Shared helpers for resumake templates.
 */

function stripIndent(strings, ...values) {
  const str = strings.reduce((acc, s, i) => acc + s + (values[i] ?? ''), '')
  return str.replace(/^[ \t]+/gm, '').trim()
}

function escapeLatex(s) {
  if (s == null || typeof s !== 'string') return ''
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/#/g, '\\#')
    .replace(/\$/g, '\\$')
    .replace(/%/g, '\\%')
    .replace(/&/g, '\\&')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
}

const WHITESPACE = '\\ '

module.exports = { stripIndent, escapeLatex, WHITESPACE }
