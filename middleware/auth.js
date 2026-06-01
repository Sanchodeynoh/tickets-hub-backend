// middleware/auth.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

// ── Verify user token ──
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// ── Verify admin token ──
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
