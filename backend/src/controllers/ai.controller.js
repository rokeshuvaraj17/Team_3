const apiKeyModel = require('../models/apiKey.model')
const { generateWithUserKey, geminiGenerate } = require('../services/ai.service')
const { pickRandom, extractJsonObject, translateWithMyMemory } = require('../utils/helpers')
const { RESUME_SYSTEM_PROMPTS, RESUME_USER_PROMPT_INTROS, TEMPLATE_DESCRIPTIONS } = require('../utils/constants')

async function skillSuggestions(req, res) {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const body = req.body || {}
  const jobDescription = (typeof body.job_description === 'string' ? body.job_description.trim() : '') || (typeof body.query === 'string' ? body.query.trim() : '')
  let apiKeyId = typeof body.api_key_id === 'string' ? body.api_key_id.trim() || null : null
  if (!apiKeyId) apiKeyId = await apiKeyModel.getDefaultApiKeyId(userId)
  if (!jobDescription) return res.status(400).json({ error: 'job_description required' })
  if (!apiKeyId) return res.json({ suggestions: [] })
  try {
    const keyInfo = await apiKeyModel.resolveActiveUserKey(userId, apiKeyId)
    if (!keyInfo) return res.status(400).json({ error: 'Invalid API key' })
    const { api_key_enc, provider_slug } = keyInfo
    const prompt = `Based on this job description, list 15–25 specific skills, technologies, or keywords that a strong candidate would have or mention on their resume. Output only a JSON array of strings, no other text.

Job description:
${jobDescription.slice(0, 6000)}

Example format: ["JavaScript", "React", "REST APIs", "Agile", "Team leadership", ...]`
    const text = await generateWithUserKey(prompt, null, provider_slug, api_key_enc, null)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    const list = Array.isArray(suggestions) ? suggestions.filter((s) => typeof s === 'string' && s.trim()).map((s) => String(s).trim()) : []
    return res.json({ suggestions: list })
  } catch (err) {
    console.error('Skill suggestions error:', err.message)
    return res.status(502).json({ error: err.message || 'Could not get suggestions' })
  }
}

async function generateCoverLetter(req, res) {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const body = req.body || {}
  let apiKeyId = typeof body.api_key_id === 'string' ? body.api_key_id.trim() || null : null
  if (!apiKeyId) apiKeyId = await apiKeyModel.getDefaultApiKeyId(userId)
  const resume = typeof body.resume === 'string' ? body.resume.trim() : ''
  const jobDescription = typeof body.job_description === 'string' ? body.job_description.trim() : ''
  const companyName = typeof body.company_name === 'string' ? body.company_name.trim() : ''
  const jobTitle = typeof body.job_title === 'string' ? body.job_title.trim() : ''
  const tone = typeof body.tone === 'string' ? body.tone.trim() : 'professional'
  const model = typeof body.model === 'string' ? body.model.trim() : null
  const additionalInstructions = typeof body.additional_instructions === 'string' ? body.additional_instructions.trim() : ''
  const template = typeof body.template === 'string' ? body.template.trim() : 'professional'
  const keywords = Array.isArray(body.keywords) ? body.keywords.filter((k) => typeof k === 'string').map((k) => String(k).trim()) : []
  const wantLatex = body.want_latex === true || body.want_latex === 'true'
  if (!apiKeyId) return res.status(400).json({ error: 'No API key selected. Set a default in API Connection or pass api_key_id.' })
  if (!resume || !jobDescription) return res.status(400).json({ error: 'resume and job_description required' })
  try {
    const keyInfo = await apiKeyModel.resolveActiveUserKey(userId, apiKeyId)
    if (!keyInfo) return res.status(400).json({ error: 'Invalid or inactive API key' })
    const { api_key_enc, provider_slug } = keyInfo
    const keywordsLine = keywords.length > 0 ? `\nYou MUST weave in each of these keywords/phrases naturally in the letter where they fit; do not omit any: ${keywords.join(', ')}.` : ''
    const companyJobLine = [companyName, jobTitle].filter(Boolean).length > 0
      ? `\nCompany name (use at top of letter): ${companyName || '[infer from job description]'}. Job title: ${jobTitle || '[infer from job description]'}.`
      : ''
    const prompt = `You are an expert career coach. Create a cover letter based on a top company interview cover letter template: professional, concise, and tailored to the role.

--- RESUME ---
${resume.slice(0, 8000)}

--- JOB DESCRIPTION ---
${jobDescription.slice(0, 6000)}

--- INSTRUCTIONS ---
Tone: ${tone}. Template style: ${template}.${companyJobLine}${keywordsLine}
${additionalInstructions ? `Additional: ${additionalInstructions}` : ''}

FORMAT REQUIREMENTS (strict):
1. Start at the very top with the company name (and job title if known), then a blank line, then the date, then the salutation (e.g. Dear Hiring Manager). Do not start with "Dear Hiring Manager" only—the letter must begin with the company/role block at the top.
2. Keep the letter to exactly one page (about 300–400 words). Be concise and impactful; every sentence should add value.
3. Sound human and specific to this role. Map the candidate's experience to the job requirements.
4. Output the letter only—no meta labels or headers beyond the company/date/salutation block.`
    const modelArg = model || (provider_slug === 'gemini' ? 'gemini-2.0-flash' : null)
    if (wantLatex) {
      const systemInstruction = 'Output valid JSON only with two keys: "text" (plain cover letter: company name and job title at top, then date, then Dear Hiring Manager, then body; no extra labels) and "latex" (complete compilable LaTeX document: \\documentclass{article}, \\begin{document}, same letter content with company at top, \\end{document}). One page only. Use a simple article with geometry and font. Escape double quotes in JSON. No code fence.'
      const latexPrompt = prompt + '\n\nRespond with a single JSON object: "text" = the letter as plain text (company name at top, then date, salutation, body). "latex" = the same letter as a full LaTeX document (\\documentclass through \\end{document}), one page. Output only the JSON.'
      const raw = await generateWithUserKey(latexPrompt, systemInstruction, provider_slug, api_key_enc, modelArg)
      const trimmed = (raw && typeof raw === 'string' ? raw.trim() : '')
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
      let text = ''
      let latex = ''
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          text = typeof parsed.text === 'string' ? parsed.text.trim() : trimmed
          latex = typeof parsed.latex === 'string' ? parsed.latex.trim() : ''
        } catch (e) {
          text = trimmed
        }
      } else {
        text = trimmed
      }
      return res.json({ text, latex })
    }
    const text = await generateWithUserKey(prompt, null, provider_slug, api_key_enc, modelArg)
    res.json({ text })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
}

async function generateResume(req, res) {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const body = req.body || {}
  let apiKeyId = typeof body.api_key_id === 'string' ? body.api_key_id.trim() || null : null
  if (!apiKeyId) apiKeyId = await apiKeyModel.getDefaultApiKeyId(userId)
  if (!apiKeyId) return res.status(400).json({ error: 'No API key selected. Set a default in API Connection or add one.' })
  try {
    const keyInfo = await apiKeyModel.resolveActiveUserKey(userId, apiKeyId)
    if (!keyInfo) return res.status(400).json({ error: 'Invalid or inactive API key. Choose another in API Connection.' })
    const { api_key_enc, provider_slug } = keyInfo
    const pageLimit = body.page_limit === 1 || body.page_limit === '1' ? 1 : null
    const template = typeof body.template === 'string' ? body.template.trim() : 'modern_minimal'
    const resumeText = typeof body.resume_text === 'string' ? body.resume_text.trim() : ''
    const jobDescription = typeof body.job_description === 'string' ? body.job_description.trim() : ''
    const skillsList = Array.isArray(body.skills) ? body.skills.filter((s) => typeof s === 'string').map((s) => String(s).trim()) : []

    const templateDesc = TEMPLATE_DESCRIPTIONS[template] || TEMPLATE_DESCRIPTIONS.modern_minimal
    const pageRule = pageLimit === 1 ? 'ONE page only. Be concise; fit everything on a single page.' : 'You may use as many pages as needed.'

    let rawContent
    if (resumeText && jobDescription) {
      const systemInstruction = `You are an expert US resume writer. Produce a tailored resume as valid JSON with exactly two keys: "latex" and "html".
"latex": A complete, compilable LaTeX resume (\\documentclass through \\end{document}). Use a modern class. ${templateDesc}. ${pageRule}
"html": The same resume as HTML body content only (no <html> or <body>), with inline styles. Escape double quotes in JSON. Output only the JSON object, no code fence or explanation.`
      const skillsLine = skillsList.length > 0
        ? `\n\nIMPORTANT - You MUST include every one of these skills/keywords in the resume. Add them in a Skills section and/or weave them into experience bullet points so each appears at least once. Do not omit any: ${skillsList.join(', ')}`
        : ''
      const prompt = `Tailor the following resume for this job. Keep it ATS-friendly. Output valid JSON with "latex" and "html" only.

--- RESUME ---
${resumeText.slice(0, 12000)}

--- JOB DESCRIPTION ---
${jobDescription.slice(0, 8000)}${skillsLine}

Apply template style: ${templateDesc}. ${pageRule}`
      rawContent = await generateWithUserKey(prompt, systemInstruction, provider_slug, api_key_enc)
    } else {
      const primaryResumeHtml = typeof body.primary_resume_html === 'string' ? body.primary_resume_html.trim() : null
      const systemInstruction = pickRandom(RESUME_SYSTEM_PROMPTS)(templateDesc, pageLimit, primaryResumeHtml)
      const promptIntro = pickRandom(RESUME_USER_PROMPT_INTROS)(template, templateDesc, pageRule)

      const targetRole = (body.personal && typeof body.personal.targetRole === 'string') ? body.personal.targetRole.trim() : ''
      let prompt = `${promptIntro}`
      if (targetRole) prompt += `\nTarget role (tailor the resume for this position): ${targetRole}\n\n`
      prompt += `
Personal: ${JSON.stringify(body.personal || {})}
Professional summary: ${body.summary || ''}
Education: ${JSON.stringify(body.education || [])}
Experience: ${JSON.stringify(body.experience || [])}
Skills: ${body.skills || ''}
Languages: ${body.languages || ''}
Certifications: ${body.certifications || ''}`
      if (primaryResumeHtml && primaryResumeHtml.length > 50) {
        prompt += `\n\nPrimary resume to match (use this design, structure, and layout; fill with the new data above):\n${primaryResumeHtml.slice(0, 12000)}`
      }
      rawContent = await generateWithUserKey(prompt, systemInstruction, provider_slug, api_key_enc)
    }
    let content = null
    let latex = null
    let trimmed = (rawContent && typeof rawContent === 'string' ? rawContent.trim() : '')
    const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlock) trimmed = codeBlock[1].trim()
    const jsonStr = extractJsonObject(trimmed)
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr)
        if (typeof parsed.latex === 'string' && parsed.latex.trim()) latex = parsed.latex.trim()
        if (typeof parsed.html === 'string' && parsed.html.trim()) content = parsed.html.trim()
      } catch (e) {
        console.warn('Generate resume: JSON parse failed, falling back to raw as HTML', e.message)
      }
    }
    if (!content && rawContent && typeof rawContent === 'string') content = rawContent.trim()
    res.json({ content: content || '', latex: latex || '' })
  } catch (err) {
    console.error('Generate resume:', err.message)
    res.status(502).json({ error: err.message || 'Could not generate resume' })
  }
}

async function translate(req, res) {
  const raw = typeof req.body?.text === 'string' ? req.body.text : ''
  const text = raw.trim().slice(0, 8000)
  if (!text) {
    return res.status(400).json({ error: 'Missing or empty text', fallback: '' })
  }
  const systemInstruction = 'You are a translator. Detect the language of the user\'s text. If it is not English, translate the entire text to English. If it is already English, return it unchanged. Preserve HTML tags and structure; only translate the text content. Return ONLY the translated or original text, no explanation, no "Translation:" prefix, no language label.'
  try {
    let translated = await geminiGenerate(text, systemInstruction)
    translated = (translated && translated.trim()) || text
    return res.json({ translated })
  } catch (err) {
    try {
      const fallbackTranslated = await translateWithMyMemory(text, 'de|en')
      if (fallbackTranslated && fallbackTranslated !== text) {
        return res.json({ translated: fallbackTranslated })
      }
    } catch (fallbackErr) {
      console.error('Translate fallback (MyMemory):', fallbackErr.message)
    }
    if (err.isGeminiQuota) {
      return res.status(503).json({ error: 'Translation unavailable (quota exceeded).', fallback: text })
    }
    console.error('Translate:', err.message)
    return res.status(502).json({ error: err.message || 'Translation failed', fallback: text })
  }
}

module.exports = { skillSuggestions, generateCoverLetter, generateResume, translate }
