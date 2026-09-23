const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

function authMiddleware(req, res, next) {
  // Tokens only travel in the Authorization header, never in URLs (they'd end up in logs).
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // contains userId and email
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication session. Please sign in again.' });
  }
}

module.exports = authMiddleware;
