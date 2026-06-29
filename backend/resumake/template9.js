/**
 * Template 9 – modern style with black date boxes. Pdflatex, self-contained.
 */

const { stripIndent, escapeLatex, WHITESPACE } = require('./utils')

function profileSection(basics) {
  if (!basics) return ''
  const name = escapeLatex(basics.name || '')
  const email = escapeLatex(basics.email || '')
  const phone = escapeLatex(basics.phone || '')
  const address = basics.location && basics.location.address ? escapeLatex(basics.location.address) : ''
  const website = basics.website ? `\\href{${escapeLatex(basics.website)}}{${escapeLatex(basics.website)}}` : ''
  const info = [email, phone, address, website].filter(Boolean).join(' | ')
  return stripIndent`
    \\MyName{${name}}
    \\bigskip
    {\\small \\hfill ${info || ''}}
  `
}

function educationSection(education, heading) {
  if (!education || !education.length) return ''
  const h = escapeLatex(heading || 'Education')
  const lastIdx = education.length - 1
  const entries = education.map((school, i) => {
    const institution = escapeLatex(school.institution || '')
    const studyType = escapeLatex(school.studyType || '')
    const area = escapeLatex(school.area || '')
    const score = escapeLatex(school.gpa || '')
    const location = escapeLatex(school.location || '')
    const startDate = escapeLatex(school.startDate || '')
    const endDate = escapeLatex(school.endDate || '')
    let degreeLine = ''
    if (studyType && area) degreeLine = `${studyType} ${area}`
    else degreeLine = studyType || area
    let dateRange = ''
    if (startDate && endDate) dateRange = `${startDate} - ${endDate}`
    else if (startDate) dateRange = `${startDate} - Present`
    else dateRange = endDate
    let nameLine = institution && location ? `${institution}, ${location}` : (institution || location)
    if (score) nameLine += ` ${score}`
    const sep = i < lastIdx ? '\\sepspace' : ''
    return stripIndent`
      \\EducationEntry
      {${degreeLine}}
      {${dateRange}}
      {${nameLine}}
      ${sep}
    `
  }).join('\n')
  return `
%%% Education
%%% ------------------------------------------------------------
\\NewPart{${h}}
${entries}
  `
}

function workSection(work, heading) {
  if (!work || !work.length) return ''
  const h = escapeLatex(heading || 'Experience')
  const lastIdx = work.length - 1
  const entries = work.map((job, i) => {
    const company = escapeLatex(job.company || '')
    const position = escapeLatex(job.position || '')
    const location = escapeLatex(job.location || '')
    const startDate = escapeLatex(job.startDate || '')
    const endDate = escapeLatex(job.endDate || '')
    const highlights = Array.isArray(job.highlights) ? job.highlights.filter(Boolean).map((x) => escapeLatex(x)) : []
    const nameLine = [company, location].filter(Boolean).join(', ')
    let dateRange = ''
    if (startDate && endDate) dateRange = `${startDate} - ${endDate}`
    else if (startDate) dateRange = `${startDate} - Present`
    else dateRange = endDate
    const dutyLines = highlights.length > 0
      ? `\\begin{itemize} \\itemsep -1pt\n${highlights.map((d) => `\\item ${d}`).join('\n')}\n\\end{itemize}`
      : ''
    const sep = i < lastIdx ? '\\sepspace' : ''
    return stripIndent`
      \\WorkEntry
      {${position}}
      {${dateRange}}
      {${nameLine}}
      {${dutyLines}}
      ${sep}
    `
  }).join('\n')
  return `
%%% Work experience
%%% ------------------------------------------------------------
\\NewPart{${h}}
${entries}
  `
}

function skillsSection(skills, heading) {
  if (!skills || !skills.length) return ''
  const h = escapeLatex(heading || 'Skills')
  const entries = skills.map((skill) => {
    const name = escapeLatex(skill.name || '')
    const keywords = (skill.keywords || []).filter(Boolean).map(escapeLatex).join(', ')
    return `\\SkillsEntry{${name}}{${keywords}}`
  }).join('\n')
  return `
%%% Skills
%%% ------------------------------------------------------------
\\NewPart{${h}}
${entries}
  `
}

function projectsSection(projects, heading) {
  if (!projects || !projects.length) return ''
  const h = escapeLatex(heading || 'Projects')
  const lastIdx = projects.length - 1
  const entries = projects.map((project, i) => {
    const name = escapeLatex(project.name || '')
    const description = escapeLatex(project.description || '')
    const keywords = (project.keywords || []).filter(Boolean).map(escapeLatex).join(', ')
    const url = project.url ? `\\href{${escapeLatex(project.url)}}{${escapeLatex(project.url)}}` : ''
    const sep = i < lastIdx ? '\\sepspace' : ''
    return stripIndent`
      \\ProjectEntry{${name}}{${url}}
      {${keywords}}
      {${description}}
      ${sep}
    `
  }).join('\n')
  return `
%%% Projects
%%% ------------------------------------------------------------
\\NewPart{${h}}
${entries}
  `
}

function awardsSection(awards, heading) {
  if (!awards || !awards.length) return ''
  const h = escapeLatex(heading || 'Awards')
  const lastIdx = awards.length - 1
  const entries = awards.map((award, i) => {
    const title = escapeLatex(award.title || '')
    const summary = escapeLatex(award.summary || '')
    const date = escapeLatex(award.date || '')
    const awarder = escapeLatex(award.awarder || '')
    const sep = i < lastIdx ? '\\sepspace' : ''
    return stripIndent`
      \\AwardEntry{${title}}{${awarder}}
      {${date}}
      {${summary}}
      ${sep}
    `
  }).join('\n')
  return `
%%% Awards
%%% ------------------------------------------------------------
\\NewPart{${h}}
${entries}
  `
}

function preamble() {
  return stripIndent`
    \\usepackage[english]{babel}
    \\usepackage[utf8]{inputenc}
    \\usepackage[T1]{fontenc}
    \\usepackage{lmodern}
    \\usepackage[protrusion=true,expansion=true]{microtype}
    \\usepackage[svgnames]{xcolor}
    \\usepackage[margin=0.75in]{geometry}
    \\textheight=700px
    \\usepackage{url}
    \\usepackage{textcomp}
    \\usepackage[hidelinks]{hyperref}

    \\makeatletter
    \\def\\url@modernstyle{\\@ifundefined{selectfont}{\\def\\UrlFont{\\sf}}{\\def\\UrlFont{}}}
    \\makeatother
    \\urlstyle{modern}

    \\frenchspacing
    \\pagestyle{empty}
    \\renewcommand{\\familydefault}{\\sfdefault}

    \\usepackage{sectsty}
    \\sectionfont{\\usefont{OT1}{phv}{b}{n}\\sectionrule{0pt}{0pt}{-5pt}{3pt}}

    \\newlength{\\spacebox}
    \\settowidth{\\spacebox}{8888888888}
    \\newcommand{\\sepspace}{\\vspace*{1em}}

    \\newcommand{\\MyName}[1]{\\Huge \\usefont{OT1}{phv}{b}{n} \\hfill #1 \\par \\normalsize \\normalfont}
    \\newcommand{\\NewPart}[1]{\\section*{\\uppercase{#1}}}
    \\newcommand{\\SkillsEntry}[2]{\\noindent\\hangindent=2em\\hangafter=0 \\parbox{\\spacebox}{\\textit{#1}} \\hspace{1.5em} #2 \\par}
    \\newcommand{\\EducationEntry}[4]{
    \\noindent \\textbf{#1} \\hfill \\colorbox{Black}{\\parbox{8.5em}{\\hfill\\color{White}#2}} \\par
    \\noindent \\textit{#3} \\par \\noindent\\hangindent=2em\\hangafter=0 \\small #4 \\normalsize \\par}
    \\newcommand{\\WorkEntry}[4]{
    \\noindent \\textbf{#1} \\hfill \\colorbox{Black}{\\parbox{9em}{\\hfill\\color{White}#2}} \\par
    \\noindent \\textit{#3} \\par \\noindent\\hangindent=2em\\hangafter=0 \\small #4 \\normalsize \\par}
    \\newcommand{\\ProjectEntry}[4]{\\noindent \\textbf{#1} \\noindent \\textit{#3} \\hfill {#2} \\par \\noindent \\small #4 \\normalsize \\par}
    \\newcommand{\\AwardEntry}[4]{\\noindent \\textbf{#1} \\noindent \\textit{#3} \\hfill {#2} \\par \\noindent \\small #4 \\normalsize \\par}
  `
}

function template9(values) {
  const headings = values.headings || {}
  const sections = Array.isArray(values.sections) ? values.sections : ['profile', 'education', 'work', 'skills', 'projects', 'awards']
  const part = (section) => {
    switch (section) {
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
    \\documentclass[fontsize=11pt]{article}
    ${preamble()}
    \\begin{document}
    ${body}
    ${WHITESPACE}
    \\end{document}
  `
}

module.exports = { template9 }
