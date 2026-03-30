function auth(req, res, next) {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  req.userId = userId
  next()
}

module.exports = auth
