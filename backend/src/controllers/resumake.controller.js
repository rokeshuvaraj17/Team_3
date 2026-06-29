const resumake = require('../../resumake')
const { compilePdfWithFallback: resumakeCompilePdf } = require('../../resumake/compilePdf')

async function generate(req, res) {
  try {
    const result = resumake.generate(req.body || {})
    if (result.error) return res.status(400).json({ error: result.error })
    res.json({ latex: result.latex })
  } catch (err) {
    console.error('Resumake generate error:', err)
    return res.status(500).json({ error: err.message || 'LaTeX generation failed' })
  }
}

async function compilePdf(req, res) {
  const latexDoc = typeof req.body?.latex === 'string' ? req.body.latex : ''
  if (!latexDoc.trim()) return res.status(400).json({ error: 'Missing latex' })
  try {
    const pdfBuffer = await resumakeCompilePdf(latexDoc.trim(), { cmd: 'pdflatex', passes: 1 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"')
    res.send(pdfBuffer)
  } catch (err) {
    console.error('Resumake compile-pdf error:', err)
    return res.status(502).json({ error: err.message || 'PDF compilation failed' })
  }
}

module.exports = { generate, compilePdf }
