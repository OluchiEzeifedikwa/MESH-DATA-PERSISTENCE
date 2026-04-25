const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfProtection(req, res, next) {
  if (!MUTATING.has(req.method)) return next();

  // CSRF only needed for cookie-based auth (not Bearer tokens)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) return next();

  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?.csrf_token;

  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
  }

  next();
}
