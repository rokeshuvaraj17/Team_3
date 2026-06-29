/**
 * Resumake.io template1 port – LaTeX resume generator.
 * Schema: sections, selectedTemplate, headings, basics, education, work, skills, projects, awards.
 */

const { stripIndent, escapeLatex, WHITESPACE } = require('./utils')

function profileSection(basics) {
  if (!basics) return ''
  const name = escapeLatex(basics.name)
  const email = escapeLatex(basics.email)
  const phone = escapeLatex(basics.phone)
  const address = (basics.location && basics.location.address) ? escapeLatex(basics.location.address) : ''
  const website = escapeLatex(basics.website)
  let line1 = name ? `{\\Huge \\scshape {${name}}}` : ''
  const line2 = [address, email, phone, website].filter(Boolean).join(' $\\cdot$ ')
  if (line1 && line2) {
    line1 += '\\\\'
  }
  return stripIndent`
    %==== Profile ====%
    \\vspace*{-10pt}
    \\begin{center}
      ${line1}
      ${line2}${line2 ? '\\\\' : ''}
    \\end{center}
  `
}

function educationSection(education, heading) {
  if (!education || !education.length) return ''
  const h = escapeLatex(heading || 'Education')
  const blocks = education.map((school) => {
    const institution = escapeLatex(school.institution)
    const location = escapeLatex(school.location)
    const studyType = escapeLatex(school.studyType)
    const area = escapeLatex(school.area)
    const gpa = escapeLatex(school.gpa)
    const startDate = escapeLatex(school.startDate)
    const endDate = escapeLatex(school.endDate)
    let line1 = institution ? `\\textbf{${institution}}` : ''
    if (location) line1 += `\\hfill ${location}`
    let line2 = ''
    if (studyType) line2 += studyType
    if (area) line2 += studyType ? ` ${area}` : `Degree in ${area}`
    if (gpa) line2 += ` \\textit{GPA: ${gpa}}`
    if (startDate || endDate) {
      const gradLine = `${startDate || ''} - ${endDate || ''}`
      line2 += line2 ? ` \\hfill ${gradLine}` : gradLine
    }
    if (line1) line1 += '\\\\'
    if (line2) line2 += '\\\\'
    return `${line1}\n${line2.trim()}\n\\vspace{2mm}`
  }).join('\n')
  return `
%==== Education ====%
\\header{${h}}
${blocks}
  `
}

function workSection(work, heading) {
  if (!work || !work.length) return ''
  const h = escapeLatex(heading || 'Experience')
  const blocks = work.map((job) => {
    const company = escapeLatex(job.company)
    const position = escapeLatex(job.position)
    const location = escapeLatex(job.location)
    const startDate = escapeLatex(job.startDate)
    const endDate = escapeLatex(job.endDate)
    const highlights = Array.isArray(job.highlights) ? job.highlights.filter(Boolean).map((x) => escapeLatex(x)) : []
    let line1 = company ? `\\textbf{${company}}` : ''
    if (location) line1 += ` \\hfill ${location}`
    let line2 = position ? `\\textit{${position}}` : ''
    if (startDate && endDate) line2 += ` \\hfill ${startDate} - ${endDate}`
    else if (startDate) line2 += ` \\hfill ${startDate} - Present`
    else if (endDate) line2 += ` \\hfill ${endDate}`
    if (line1) line1 += '\\\\'
    if (line2) line2 += '\\\\'
    let highlightLines = ''
    if (highlights.length > 0) {
      highlightLines = `
\\vspace{-1mm}
\\begin{itemize} \\itemsep 1pt
  ${highlights.map((h) => `\\item ${h}`).join('\n  ')}
\\end{itemize}
`
    }
    return `${line1}\n${line2}\n${highlightLines}`
  }).join('\n')
  return `
%==== Experience ====%
\\header{${h}}
\\vspace{1mm}
${blocks}
  `
}

function skillsSection(skills, heading) {
  if (!skills || !skills.length) return ''
  const h = escapeLatex(heading || 'Skills')
  const rows = skills.map((skill) => {
    const name = escapeLatex(skill.name || 'Misc')
    const keywords = (skill.keywords || []).filter(Boolean).map(escapeLatex).join(', ')
    return `${name}: & ${keywords} \\\\`
  }).join('\n      ')
  return `
\\header{${h}}
\\begin{tabular}{ l l }
  ${rows}
\\end{tabular}
\\vspace{2mm}
  `
}

function projectsSection(projects, heading) {
  if (!projects || !projects.length) return ''
  const h = escapeLatex(heading || 'Projects')
  const blocks = projects.map((project) => {
    const name = escapeLatex(project.name)
    const description = escapeLatex(project.description)
    const keywords = (project.keywords || []).filter(Boolean).map(escapeLatex).join(', ')
    const url = escapeLatex(project.url)
    let line1 = name ? `{\\textbf{${name}}}` : ''
    if (keywords) line1 += ` {\\sl ${keywords}} `
    if (url) line1 += `\\hfill ${url}`
    if (line1) line1 += '\\\\'
    return `${line1}\n${description || ''}${description ? '\\\\' : ''}\n\\vspace*{2mm}`
  }).join('\n')
  return `
\\header{${h}}
${blocks}
  `
}

function awardsSection(awards, heading) {
  if (!awards || !awards.length) return ''
  const h = escapeLatex(heading || 'Awards')
  const blocks = awards.map((award) => {
    const title = escapeLatex(award.title)
    const awarder = escapeLatex(award.awarder)
    const date = escapeLatex(award.date)
    const summary = escapeLatex(award.summary)
    let line1 = title ? `\\textbf{${title}}` : ''
    if (awarder) line1 += ` \\hfill ${awarder}`
    let line2 = summary || ''
    if (date) line2 += ` \\hfill ${date}`
    if (line1) line1 += '\\\\'
    if (line2) line2 += '\\\\'
    return `${line1}\n${line2}\n\\vspace*{2mm}`
  }).join('\n')
  return `
\\header{${h}}
${blocks}
  `
}

function resumeDefinitions() {
  return stripIndent`
    \\def\\bull{\\vrule height 0.8ex width .7ex depth -.1ex }
    \\newcommand{\\header} [1] {
        {\\hspace*{-18pt}\\vspace*{6pt} \\textsc{#1}}
        \\vspace*{-6pt} \\lineunder
    }
    \\newcommand{\\lineunder} {
        \\vspace*{-8pt} \\\\
        \\hspace*{-18pt} \\hrulefill \\\\
    }
  `
}

/**
 * @param {object} values - { sections, headings, basics, education, work, skills, projects, awards }
 * @returns {string} LaTeX document
 */
function template1(values) {
  const headings = values.headings || {}
  const sections = Array.isArray(values.sections) ? values.sections : ['profile', 'education', 'work', 'skills', 'projects', 'awards']

  const part = (section) => {
    switch (section) {
      case 'profile':
        return profileSection(values.basics)
      case 'education':
        return educationSection(values.education, headings.education)
      case 'work':
        return workSection(values.work, headings.work)
      case 'skills':
        return skillsSection(values.skills, headings.skills)
      case 'projects':
        return projectsSection(values.projects, headings.projects)
      case 'awards':
        return awardsSection(values.awards, headings.awards)
      default:
        return ''
    }
  }

  const body = sections.map(part).filter(Boolean).join('\n\n')

  return stripIndent`
    \\documentclass[a4paper]{article}
    \\usepackage{fullpage}
    \\usepackage{amsmath}
    \\usepackage{amssymb}
    \\usepackage{textcomp}
    \\usepackage[utf8]{inputenc}
    \\usepackage[T1]{fontenc}
    \\textheight=10in
    \\pagestyle{empty}
    \\raggedright
    \\usepackage[left=0.8in,right=0.8in,bottom=0.8in,top=0.8in]{geometry}

    ${resumeDefinitions()}

    \\begin{document}
    \\vspace*{-40pt}

    ${body}

    ${WHITESPACE}
    \\end{document}
  `
}

module.exports = { template1 }
