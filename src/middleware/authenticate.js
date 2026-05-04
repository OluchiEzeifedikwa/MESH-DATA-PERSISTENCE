import jwt from 'jsonwebtoken';

// Middleware that verifies the JWT on protected routes.
// Accepts token from Authorization header (CLI) or access_token cookie (web portal).
// On success, attaches the decoded payload to req.user and calls next().
// On failure, returns 401.
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token;

  // CLI sends token as "Bearer <token>" in the Authorization header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies?.access_token) {
    // Web portal sends token as an HTTP-only cookie
    token = req.cookies.access_token;
  }

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Authentication required' });
  }

  try {
    // Verify signature and expiry — attaches decoded payload (sub, role, username, is_active) to req.user
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}
