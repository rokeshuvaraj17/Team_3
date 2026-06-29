/**
 * Template 3 – shaded section headers (Scott Clark style). Pdflatex, self-contained.
 */

const { stripIndent, escapeLatex, WHITESPACE } = require('./utils')

function profileSection(basics) {
  if (!basics) return ''
  const name = escapeLatex(basics.name)
  const email = escapeLatex(basics.email)
  const phone = escapeLatex(basics.phone)
  const address = basics.location && basics.location.address ? escapeLatex(basics.location.address) : ''
  const website = basics.website ? `\\href{${escapeLatex(basics.website)}}{${escapeLatex(basics.website)}}` : ''
  const info = [email, phone, address, website].filter(Boolean).join(' | ')
  return stripIndent`
    \\begin{tabular*}{7in}{l@{\\extracolsep{\\fill}}r}
    \\textbf{\\Large ${name}} & \\textit{${info}}
    \\end{tabular*}
  `
}

function educationSection(education, heading) {
  if (!education || !education.length) return ''
  const h = escapeLatex(heading || 'Education')
  const blocks = education.map((school) => {
    const institution = escapeLatex(school.institution || '')
    const location = escapeLatex(school.location || '')
    const studyType = escapeLatex(school.studyType || '')
    const area = escapeLatex(school.area || '')
    const gpa = escapeLatex(school.gpa || '')
    const startDate = escapeLatex(school.startDate || '')
    const endDate = escapeLatex(school.endDate || '')
    const formattedLocation = location ? location + '\\\\' : ''
    let degreeLine = ''
    if (studyType && area) degreeLine = `${studyType} ${area}`
    else if (studyType || area) degreeLine = studyType || area
    if (gpa) degreeLine += degreeLine ? `, GPA: ${gpa}` : `GPA: ${gpa}`
    let dateRange = ''
    if (startDate && endDate) dateRange = `${startDate} | ${endDate}`
    else if (startDate) dateRange = `${startDate} | Present`
    else dateRange = endDate
    return stripIndent`
      \\item[]
      \\school
      {${institution}}
      {${formattedLocation}}
      {${degreeLine}}
      {${dateRange}}
    `
  }).join('\n')
  return `
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\resheading{${h}}
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\begin{itemize}[leftmargin=*]
${blocks}
\\end{itemize}
  `
}

function workSection(work, heading) {
  if (!work || !work.length) return ''
  const h = escapeLatex(heading || 'Experience')
  const blocks = work.map((job) => {
    const company = escapeLatex(job.company || '')
    const position = escapeLatex(job.position || '')
    const location = escapeLatex(job.location || '')
    const startDate = escapeLatex(job.startDate || '')
    const endDate = escapeLatex(job.endDate || '')
    const highlights = Array.isArray(job.highlights) ? job.highlights.filter(Boolean).map((x) => escapeLatex(x)) : []
    let dateRange = ''
    if (startDate && endDate) dateRange = `${startDate} | ${endDate}`
    else if (startDate) dateRange = `${startDate} | Present`
    else dateRange = endDate
    const dutyLines = highlights.length > 0
      ? `\\begin{itemize}\n${highlights.map((d) => `\\item ${d}`).join('\n')}\n\\end{itemize}`
      : ''
    return stripIndent`
      \\item[]
      \\job
      {${company}}
      {${location}}
      {${position}}
      {${dateRange}}
      ${dutyLines}
    `
  }).join('\n')
  return `
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\resheading{${h}}
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\begin{itemize}[leftmargin=*]
${blocks}
\\end{itemize}
  `
}

function skillsSection(skills, heading) {
  if (!skills || !skills.length) return ''
  const h = escapeLatex(heading || 'Skills')
  const items = skills.map((skill) => {
    const name = escapeLatex(skill.name || '')
    const keywords = (skill.keywords || []).filter(Boolean).map(escapeLatex).join(', ')
    return `\\item[] \\skill{${name}}{${keywords}}`
  }).join('\n')
  return `
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\resheading{${h}}
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\begin{itemize}[leftmargin=*]
\\setlength\\itemsep{0em}
${items}
\\end{itemize}
  `
}

function projectsSection(projects, heading) {
  if (!projects || !projects.length) return ''
  const h = escapeLatex(heading || 'Projects')
  const blocks = projects.map((project) => {
    const name = escapeLatex(project.name || '')
    const description = escapeLatex(project.description || '')
    const keywords = (project.keywords || []).filter(Boolean).map(escapeLatex).join(', ')
    const url = project.url ? `\\href{${escapeLatex(project.url)}}{${escapeLatex(project.url)}}` : ''
    const descriptionWithNewline = description ? `\\\\${description}` : ''
    return stripIndent`
      \\item[]
      \\project
      {${name}}
      {${keywords}}
      {${url}}
      {${descriptionWithNewline}}
    `
  }).join('\n')
  return `
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\resheading{${h}}
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\begin{itemize}[leftmargin=*]
${blocks}
\\end{itemize}
  `
}

function awardsSection(awards, heading) {
  if (!awards || !awards.length) return ''
  const h = escapeLatex(heading || 'Awards')
  const blocks = awards.map((award) => {
    const title = escapeLatex(award.title || '')
    const summary = escapeLatex(award.summary || '')
    const date = escapeLatex(award.date || '')
    const awarder = escapeLatex(award.awarder || '')
    const summaryWithNewline = summary ? `\\\\${summary}` : ''
    return stripIndent`
      \\item[]
      \\award
      {${title}}
      {${date}}
      {${awarder}}
      {${summaryWithNewline}}
    `
  }).join('\n')
  return `
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\resheading{${h}}
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\begin{itemize}[leftmargin=*]
${blocks}
\\end{itemize}
  `
}

function preamble() {
  return stripIndent`
    \\documentclass[11pt]{article}
    \\newlength{\\outerbordwidth}
    \\pagestyle{empty}
    \\raggedbottom
    \\raggedright
    \\usepackage[svgnames]{xcolor}
    \\usepackage{framed}
    \\usepackage{tocloft}
    \\usepackage{enumitem}
    \\usepackage{textcomp}
    \\usepackage[utf8]{inputenc}
    \\usepackage[T1]{fontenc}
    \\usepackage[hidelinks]{hyperref}

    \\setlength{\\outerbordwidth}{3pt}
    \\definecolor{shadecolor}{gray}{0.75}
    \\definecolor{shadecolorB}{gray}{0.93}

    \\setlength{\\evensidemargin}{-0.25in}
    \\setlength{\\headheight}{0in}
    \\setlength{\\headsep}{0in}
    \\setlength{\\oddsidemargin}{-0.25in}
    \\setlength{\\tabcolsep}{0in}
    \\setlength{\\textheight}{9.5in}
    \\setlength{\\textwidth}{7in}
    \\setlength{\\topmargin}{-0.3in}
    \\setlength{\\topskip}{0in}
    \\setlength{\\voffset}{0.1in}

    \\newcommand{\\resitem}[1]{\\item #1 \\vspace{-4pt}}
    \\newcommand{\\resheading}[1]{
    \\parbox{\\textwidth}{\\setlength{\\FrameSep}{\\outerbordwidth}
    \\begin{shaded}
    \\setlength{\\fboxsep}{0pt}\\framebox[\\textwidth][l]{\\setlength{\\fboxsep}{4pt}\\fcolorbox{shadecolorB}{shadecolorB}{\\textbf{\\sffamily{\\mbox{~}\\makebox[6.762in][l]{\\large #1} \\vphantom{p\\^{E}}}}}}
    \\end{shaded}
    }\\vspace{-11pt}
    }
    \\newcommand{\\school}[4]{\\vspace{1.5mm}
    \\textbf{#1} \\hfill #2 \\textit{#3} \\hfill \\textit{#4} \\vspace{1.5mm}
    }
    \\newcommand{\\job}[4]{
    \\textbf{#1} \\hfill #2 \\hfill \\textit{#3} \\hfill \\textit{#4}
    }
    \\newcommand{\\skill}[2]{
    \\textbf{#1} #2
    }
    \\newcommand{\\project}[4]{ \\vspace{1.5mm}
    \\textbf{#1} #2 \\hfill \\textit{#3}#4 \\vspace{1.5mm}
    }
    \\newcommand{\\award}[4]{ \\vspace{1.5mm}
    \\textbf{#1} #2 \\hfill \\textit{#3} #4 \\vspace{1.5mm}
    }
  `
}

function template3(values) {
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
    ${preamble()}
    \\begin{document}
    ${body}
    ${WHITESPACE}
    \\end{document}
  `
}

module.exports = { template3 }
