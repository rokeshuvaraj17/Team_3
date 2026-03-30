const AUTOFILL_FIELD_KEYS = [
  'first_name', 'middle_name', 'last_name', 'suffix', 'full_name', 'preferred_name', 'pronouns',
  'email', 'phone', 'phone_alt', 'email_alt',
  'date_of_birth', 'age', 'place_of_birth', 'citizenship_country', 'nationality',
  'linkedin_url', 'website_url', 'portfolio_url', 'github_url', 'twitter_url',
  'address_line1', 'address_line2', 'city', 'state', 'zip_code', 'country',
  'headline', 'summary', 'current_job_title', 'current_company', 'years_of_experience', 'job_type_preference',
  'work_authorization', 'requires_sponsorship', 'veteran_status', 'disability_status', 'race_ethnicity', 'gender',
  'salary_expectation_min', 'salary_expectation_max', 'salary_type', 'salary_currency',
  'highest_degree', 'university_name', 'graduation_year', 'major_field', 'gpa', 'second_degree', 'second_major',
  'how_did_you_hear', 'referral_employee_name', 'desired_start_date', 'willing_to_relocate', 'willing_to_travel', 'notice_period',
  'cover_letter_note', 'emergency_contact_name', 'emergency_contact_phone', 'driver_license_number', 'security_clearance', 'ssn_last4',
]

const COUNTRY_LOCATION_MAP = {
  in: ['india'],
  gb: ['united kingdom', 'uk', 'england', 'scotland', 'wales'],
  us: ['united states', 'usa', ' u.s.', ' u.s.a.'],
  au: ['australia'],
  de: ['germany', 'deutschland'],
  br: ['brazil', 'brasil'],
}

const COUNTRY_TO_JOOBLE_LOCATION = {
  in: 'India',
  gb: 'United Kingdom',
  us: 'United States',
  au: 'Australia',
  de: 'Germany',
  br: 'Brazil',
}

const OPENAI_COMPATIBLE_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  openrouter: 'openai/gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  together: 'meta-llama/Llama-3-70b-chat-hf',
  mistral: 'mistral-small-latest',
  cohere: 'command',
}

const DEFAULT_API_KEY_PROVIDERS = [
  { slug: 'openai', name: 'OpenAI', description: 'GPT-4, GPT-3.5, and other OpenAI models', base_url: 'https://api.openai.com/v1', display_order: 10 },
  { slug: 'gemini', name: 'Google Gemini', description: 'Gemini Pro and other Google AI models', base_url: 'https://generativelanguage.googleapis.com', display_order: 20 },
  { slug: 'anthropic', name: 'Anthropic', description: 'Claude models', base_url: 'https://api.anthropic.com', display_order: 30 },
  { slug: 'openrouter', name: 'OpenRouter', description: 'Unified API for many models (OpenAI, Anthropic, etc.)', base_url: 'https://openrouter.ai/api/v1', display_order: 40 },
  { slug: 'groq', name: 'Groq', description: 'Fast inference (Llama, Mixtral)', base_url: 'https://api.groq.com/openai/v1', display_order: 50 },
  { slug: 'together', name: 'Together AI', description: 'Open-source and custom models', base_url: 'https://api.together.xyz/v1', display_order: 60 },
  { slug: 'mistral', name: 'Mistral AI', description: 'Mistral and Mixtral models', base_url: 'https://api.mistral.ai/v1', display_order: 70 },
  { slug: 'cohere', name: 'Cohere', description: 'Command and embed models', base_url: 'https://api.cohere.ai', display_order: 80 },
]

const RESUME_SYSTEM_PROMPTS = [
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'You are an expert US resume writer and career coach. Produce a polished resume. Keep it ATS-friendly: use clear section headings, standard job titles, and keywords relevant to the target role; avoid complex layouts or graphics that break parsing. Output valid JSON only with exactly two keys: "latex" and "html". '
    s += '"latex": A complete, compilable LaTeX resume (\\documentclass through \\end{document}). Use a modern class (e.g. moderncv or article with geometry, fontenc, charter/libertine). '
    s += '"html": The same resume as HTML body content only (no <html> or <body>), with inline styles for a modern look. Use clear sections: Summary, Experience, Education, Skills, Languages, Certifications. Dates in US style (e.g. January 2020). Escape double quotes in JSON. Output only the JSON object, no code fence or explanation. '
    s += `Template style: ${templateDesc}. `
    if (pageLimit === 1) s += 'CRITICAL: Fit on ONE page. Be concise; reduce spacing and text. '
    else s += 'You may use multiple pages. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'When "Primary resume to match" is provided below, use that design, structure, and layout; only replace content with the new data. '
    return s
  },
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'You are a professional resume writer specializing in US formats. Keep the resume ATS-friendly: clear headings, standard structure, and role-relevant keywords; avoid tables or images that confuse ATS. Your output must be a single valid JSON object with keys "latex" and "html". '
    s += 'For "latex": write a full LaTeX resume document (complete with \\documentclass and \\begin{document}...\\end{document}), modern and clean. '
    s += 'For "html": write the same resume as HTML document body only, using simple tags (h1, h2, h3, p, ul, li, strong, br) and inline styles. '
    s += `Follow this template style: ${templateDesc}. Format dates like January 2020. Output only JSON. `
    if (pageLimit === 1) s += 'The resume MUST be one page only. '
    else s += 'Multiple pages allowed. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'If a primary resume reference is given, replicate its design and structure; fill with the new content. '
    return s
  },
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'Role: Expert resume writer. Task: Generate a US-format resume. Keep it ATS-friendly: use standard section names, scannable layout, and keywords for the target role. Output format: JSON with "latex" and "html" only. '
    s += '"latex" = complete compilable LaTeX (modern class, e.g. moderncv or article). "html" = same content as HTML body only, inline styles, modern look. '
    s += `Style to follow: ${templateDesc}. Dates: US style (e.g. January 2020). No markdown, no explanation—only the JSON object. `
    if (pageLimit === 1) s += 'Constraint: Exactly one page. Be concise. '
    else s += 'Page limit: none. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'When primary resume HTML is provided, match its layout and styling; substitute the new data. '
    return s
  },
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'You are a senior career advisor. Create a compelling US resume. Make it ATS-friendly: clear headings, logical structure, and role-specific keywords; avoid graphics or complex formatting that ATS cannot read. Respond with valid JSON containing two keys: "latex" (full LaTeX document, modern design) and "html" (body-only HTML with inline styles). '
    s += `Apply this template: ${templateDesc}. Use sections: Summary, Experience, Education, Skills, Languages, Certifications. US date format. Output only the JSON. `
    if (pageLimit === 1) s += 'One page maximum—prioritize impact and brevity. '
    else s += 'Length: as many pages as needed. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'If the user supplies a reference resume, mirror its design and structure; use the new data for content. '
    return s
  },
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'Act as a professional US resume writer. Keep the resume ATS-friendly: standard sections, scannable content, and keywords aligned to the target role; no images or complex tables. Generate one JSON object with "latex" and "html". '
    s += 'latex: Complete LaTeX resume (\\documentclass to \\end{document}), modern class, clean layout. '
    s += 'html: Same resume as HTML body content only; use inline styles for typography and spacing. '
    s += `Template: ${templateDesc}. Dates in US style. Return only the JSON—no code blocks or extra text. `
    if (pageLimit === 1) s += 'Must fit on one page. '
    else s += 'Multi-page OK. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'When a primary resume is provided, copy its layout and styling; replace only the text with the new data. '
    return s
  },
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'You are an ATS-optimized resume writer. Keep the resume ATS-friendly: clear section headings, standard job titles, and keywords for the target role; use simple structure so applicant tracking systems parse correctly. Produce a single JSON object: "latex" (full LaTeX resume, modern and professional) and "html" (body-only HTML, inline styles). '
    s += `Design direction: ${templateDesc}. Standard sections; US date format. Output raw JSON only. `
    if (pageLimit === 1) s += 'Keep to one page. '
    else s += 'Pages: unlimited. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'If reference resume is included, match its design and structure; fill with the provided data. '
    return s
  },
]

const RESUME_USER_PROMPT_INTROS = [
  (template, templateDesc, pageRule) => `Generate a US-format resume from the data below. Output only a JSON object with keys "latex" and "html".\n\nTemplate (required): ${template} — ${templateDesc}\nPage length (required): ${pageRule}\n\nResume data:`,
  (template, templateDesc, pageRule) => `Create a resume from this information. Return valid JSON with "latex" and "html".\n\nTemplate: ${template} — ${templateDesc}\nPage length: ${pageRule}\n\nData:`,
  (template, templateDesc, pageRule) => `Using the following data, generate a resume. Output JSON with "latex" and "html" only.\n\nStyle: ${template} — ${templateDesc}\nLength: ${pageRule}\n\nInput:`,
  (template, templateDesc, pageRule) => `Build a resume from the data below. Response must be JSON: "latex" (full LaTeX doc) and "html" (body HTML).\n\nTemplate: ${template} — ${templateDesc}\nPages: ${pageRule}\n\nResume data:`,
  (template, templateDesc, pageRule) => `Generate a professional resume. Output a single JSON object with "latex" and "html".\n\nTemplate (required): ${template} — ${templateDesc}\nPage rule: ${pageRule}\n\nCandidate data:`,
]

const TEMPLATE_DESCRIPTIONS = {
  modern_minimal: 'Modern minimal: clean typography, ample whitespace, subtle dividers, no clutter. Single column, professional and contemporary.',
  professional: 'Professional: classic layout, clear sections, conservative styling. Ideal for corporate and traditional roles.',
  creative: 'Creative: distinctive layout, optional two-column, modern fonts, suitable for design and creative roles.',
  academic: 'Academic: emphasis on education, publications, and research. Formal and structured.',
  executive_classic: 'Executive: two-column layout with a dark sidebar (e.g. navy) for name and contact; main content for experience and education. Professional and corporate.',
  technical_developer: 'Technical/Developer: monospace or technical feel, skill tags as pills, clear section dividers. Suited for engineers and developers.',
  bold_creative: 'Bold creative: full-width colored header, large display name, asymmetric two-column. Suited for design and marketing.',
  academic_research: 'Academic/Research: emphasis on education, publications, research. Formal, serif optional.',
  compact_pro: 'Compact: dense layout, small fonts, tight spacing. Maximize content on one page for experienced professionals.',
}

module.exports = {
  AUTOFILL_FIELD_KEYS,
  COUNTRY_LOCATION_MAP,
  COUNTRY_TO_JOOBLE_LOCATION,
  OPENAI_COMPATIBLE_MODELS,
  DEFAULT_API_KEY_PROVIDERS,
  RESUME_SYSTEM_PROMPTS,
  RESUME_USER_PROMPT_INTROS,
  TEMPLATE_DESCRIPTIONS,
}
