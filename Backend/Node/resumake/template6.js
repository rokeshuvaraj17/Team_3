/**
 * Template 6 – numbered section style. Pdflatex only.
 */

const { stripIndent, escapeLatex, WHITESPACE } = require('./utils')

function headerCmd() {
  return stripIndent`
    \\newcommand{\\header}[1]{\\vspace{8pt}\\textbf{\\large #1}\\\\ \\vspace{4pt}}
  `
}

function profileSection(basics) {
  if (!basics) return ''
  const name = escapeLatex(basics.name)
  const email = escapeLatex(basics.email)
  const phone = escapeLatex(basics.phone)
  const address = (basics.location && basics.location.address) ? escapeLatex(basics.location.address) : ''
  const website = escapeLatex(basics.website)
  const line2 = [address, email, phone, website].filter(Boolean).join(' $\\cdot$ ')
  return stripIndent`
    \\begin{center}
    {\\LARGE \\textbf{${name}}}\\\\[4pt]
    ${line2 ? line2 + '\\\\' : ''}
    \\end{center}
    \\vspace{6pt}
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
    if (location) line1 += ` \\hfill ${location}`
    let line2 = studyType || (area ? `Degree in ${area}` : '')
    if (gpa) line2 += ` \\textit{GPA: ${gpa}}`
    if (startDate || endDate) line2 += ` \\hfill ${startDate || ''} - ${endDate || ''}`
    return (line1 ? line1 + '\\\\' : '') + (line2 ? line2 + '\\\\' : '') + '\\vspace{2mm}'
  }).join('\n')
  return `\\header{1. ${h}}\n${blocks}\n`
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
    const hl = highlights.length ? `\\begin{itemize}\\itemsep 1pt\n${highlights.map((x) => `\\item ${x}`).join('\n')}\n\\end{itemize}` : ''
    return line1 + '\\\\' + line2 + '\\\\' + hl
  }).join('\n\n')
  return `\\header{2. ${h}}\n${blocks}\n`
}

function skillsSection(skills, heading) {
  if (!skills || !skills.length) return ''
  const h = escapeLatex(heading || 'Skills')
  const rows = skills.map((skill) => {
    const name = escapeLatex(skill.name || 'Misc')
    const keywords = (skill.keywords || []).filter(Boolean).map(escapeLatex).join(', ')
    return `${name}: & ${keywords} \\\\`
  }).join('\n  ')
  return `\\header{3. ${h}}\n\\begin{tabular}{l l}\n  ${rows}\n\\end{tabular}\n\\vspace{4pt}\n`
}

function projectsSection(projects, heading) {
  if (!projects || !projects.length) return ''
  const h = escapeLatex(heading || 'Projects')
  const blocks = projects.map((project) => {
    const name = escapeLatex(project.name)
    const description = escapeLatex(project.description)
    const keywords = (project.keywords || []).filter(Boolean).map(escapeLatex).join(', ')
    const url = escapeLatex(project.url)
    let line1 = name ? `\\textbf{${name}}` : ''
    if (keywords) line1 += ` \\textit{${keywords}}`
    if (url) line1 += ` \\hfill ${url}`
    return (line1 ? line1 + '\\\\' : '') + (description ? description + '\\\\' : '') + '\\vspace{2mm}'
  }).join('\n')
  return `\\header{4. ${h}}\n${blocks}\n`
}

function awardsSection(awards, heading) {
  if (!awards || !awards.length) return ''
  const h = escapeLatex(heading || 'Awards')
  const blocks = awards.map((award) => {
    const title = escapeLatex(award.title)
    const awarder = escapeLatex(award.awarder)
    const date = escapeLatex(award.date)
    const summary = escapeLatex(award.summary)
    return `\\textbf{${title}}${awarder ? ` \\hfill ${awarder}` : ''}\\\\${summary || ''}${date ? ` \\hfill ${date}` : ''}\\\\\\vspace{2mm}`
  }).join('\n')
  return `\\header{5. ${h}}\n${blocks}\n`
}

function template6(values) {
  const headings = values.headings || {}
  const sections = Array.isArray(values.sections) ? values.sections : ['profile', 'education', 'work', 'skills', 'projects', 'awards']
  const part = (s) => {
    switch (s) {
      case 'profile': return profileSection(values.basics)
      case 'education': return educationSection(values.education, headings.education)
      case 'work': return workSection(values.work, headings.work)
      case 'skills': return skillsSection(values.skills, headings.skills)
      case 'projects': return projectsSection(values.projects, headings.projects)
      case 'awards': return awardsSection(values.awards, headings.awards)
      default: return ''
    }
  }
  const body = sections.map(part).filter(Boolean).join('\n')
  return stripIndent`
    \\documentclass[a4paper,11pt]{article}
    \\usepackage{fullpage}
    \\usepackage[utf8]{inputenc}
    \\usepackage[T1]{fontenc}
    \\usepackage[hidelinks]{hyperref}
    \\pagestyle{empty}
    \\raggedright
    \\usepackage[left=0.75in,right=0.75in,top=0.75in,bottom=0.75in]{geometry}
    ${headerCmd()}
    \\begin{document}
    \\vspace*{-6pt}
    ${body}
    ${WHITESPACE}
    \\end{document}
  `
}

module.exports = { template6 }
