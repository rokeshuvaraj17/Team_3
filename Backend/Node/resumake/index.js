/**
 * Resumake-style LaTeX resume generation.
 * Accepts same payload as resumake.io: sections, selectedTemplate, headings, basics, education, work, skills, projects, awards.
 * All templates use pdflatex-only (no xelatex or external .cls) for compatibility with LaTeX.Online and local compile.
 */

const { template1 } = require('./template1')
const { template2 } = require('./template2')
const { template3 } = require('./template3')
const { template4 } = require('./template4')
const { template5 } = require('./template5')
const { template6 } = require('./template6')
const { template7 } = require('./template7')
const { template8 } = require('./template8')
const { template9 } = require('./template9')
const { template10 } = require('./template10')

const TEMPLATES = {
  1: template1,
  2: template2,
  3: template3,
  4: template4,
  5: template5,
  6: template6,
  7: template7,
  8: template8,
  9: template9,
  10: template10,
}

/** Trim string or return as-is */
function trim(s) {
  return typeof s === 'string' ? s.trim() : s
}

/**
 * @param {object} body - Request body: selectedTemplate, sections, headings, basics, education, work, skills, projects, awards
 * @returns {{ latex: string } | { error: string }}
 */
function generate(body) {
  const selectedTemplate = Number(body.selectedTemplate) || 1
  const templateFn = TEMPLATES[selectedTemplate]
  if (!templateFn) {
    return { error: `Template ${selectedTemplate} is not available. Use 1–10.` }
  }

  const sections = Array.isArray(body.sections) && body.sections.length > 0
    ? body.sections
    : ['profile', 'education', 'work', 'skills', 'projects', 'awards']

  const values = {
    selectedTemplate,
    sections,
    headings: body.headings || {},
    basics: body.basics ? { ...body.basics, name: trim(body.basics.name), email: trim(body.basics.email), phone: trim(body.basics.phone), website: trim(body.basics.website), location: body.basics.location && typeof body.basics.location === 'object' ? { address: trim(body.basics.location.address) } : undefined } : undefined,
    education: Array.isArray(body.education) ? body.education : [],
    work: Array.isArray(body.work) ? body.work.map((w) => ({ ...w, highlights: Array.isArray(w.highlights) ? w.highlights : [''] })) : [],
    skills: Array.isArray(body.skills) ? body.skills.map((s) => ({ ...s, keywords: Array.isArray(s.keywords) ? s.keywords : [''] })) : [],
    projects: Array.isArray(body.projects) ? body.projects.map((p) => ({ ...p, keywords: Array.isArray(p.keywords) ? p.keywords : [''] })) : [],
    awards: Array.isArray(body.awards) ? body.awards : [],
  }

  try {
    const latex = templateFn(values)
    return { latex }
  } catch (err) {
    console.error('Resumake generate:', err)
    return { error: err.message || 'LaTeX generation failed' }
  }
}

module.exports = { generate }
