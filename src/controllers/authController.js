import { initiateOAuth, handleWebCallback, handleCliToken, refreshTokens, logout, peekOAuthState } from '../services/authService.js';
import { findUserById } from '../repositories/userRepository.js';

const COOKIE_OPTS = { httpOnly: true, secure: true, sameSite: 'none' };

export async function githubAuthHandler(req, res) {
  try {
    const { code_challenge, redirect_uri } = req.query;
    const { state, url } = await initiateOAuth(code_challenge, redirect_uri);
    if (code_challenge) return res.json({ status: 'success', url, state });
    return res.redirect(url);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to initiate OAuth' });
  }
}

export async function githubCallbackHandler(req, res) {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).json({ status: 'error', message: 'Missing code or state' });
  }
  try {
    const oauthState = await peekOAuthState(state);
    if (oauthState?.redirect_uri) {
      return res.redirect(`${oauthState.redirect_uri}?code=${code}&state=${state}`);
    }
    const { accessToken, refreshToken } = await handleWebCallback(code, state);
    const csrfToken = (await import('crypto')).default.randomBytes(16).toString('hex');
    res.cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 3 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 5 * 60 * 1000 });
    res.cookie('csrf_token', csrfToken, { httpOnly: false, secure: true, sameSite: 'lax', maxAge: 5 * 60 * 1000 });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/dashboard`);
  } catch (err) {
    return res.status(err.status || 500).json({ status: 'error', message: err.message });
  }
}

export async function githubCliTokenHandler(req, res) {
  const { code, state, code_verifier } = req.body;
  if (!code || !state || !code_verifier) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields' });
  }
  try {
    const { user, accessToken, refreshToken } = await handleCliToken(code, state, code_verifier);
    return res.json({
      status: 'success',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar_url: user.avatar_url },
    });
  } catch (err) {
    return res.status(err.status || 400).json({ status: 'error', message: err.message });
  }
}

export async function refreshHandler(req, res) {
  const token = req.body.refresh_token || req.cookies?.refresh_token;
  if (!token) {
    return res.status(400).json({ status: 'error', message: 'refresh_token is required' });
  }
  try {
    const { accessToken, refreshToken } = await refreshTokens(token);
    if (req.cookies?.refresh_token) {
      res.cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 3 * 60 * 1000 });
      res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 5 * 60 * 1000 });
    }
    return res.json({ status: 'success', access_token: accessToken, refresh_token: refreshToken });
  } catch (err) {
    return res.status(err.status || 401).json({ status: 'error', message: err.message });
  }
}

export async function logoutHandler(req, res) {
  const token = req.body.refresh_token || req.cookies?.refresh_token;
  if (token) await logout(token);
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('csrf_token');
  return res.json({ status: 'success', message: 'Logged out' });
}

export async function meHandler(req, res) {
  try {
    const user = await findUserById(req.user.sub);
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
    return res.json({
      status: 'success',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}

export async function csrfTokenHandler(req, res) {
  const crypto = (await import('crypto')).default;
  const csrfToken = crypto.randomBytes(16).toString('hex');
  res.cookie('csrf_token', csrfToken, { httpOnly: false, secure: true, sameSite: 'lax', maxAge: 5 * 60 * 1000 });
  return res.json({ status: 'success', csrf_token: csrfToken });
}
