export function requireApiVersion(req, res, next) {
  if (req.headers['x-api-version'] !== '1') {
    return res.status(400).json({ status: 'error', message: 'API version header required' });
  }
  next();
}
